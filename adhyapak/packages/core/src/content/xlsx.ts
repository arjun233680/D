import type { Row } from './import';

/**
 * Reading .xlsx workbooks.
 *
 * An .xlsx file is a ZIP of XML parts. Reading the handful this importer needs
 * — the workbook index, the shared string table, and each sheet's cells — is a
 * few hundred lines, and it keeps `@adhyapak/core` dependency-free, which is
 * the property that lets both apps import the package as source with no build
 * step. A general-purpose spreadsheet library would bring a megabyte of code
 * for formulas, styling and charts, none of which a question bank needs.
 *
 * What is supported: multi-sheet workbooks, inline and shared strings, numbers,
 * booleans, dates (as their displayed serial converted to ISO), empty cells,
 * gaps in the middle of rows, and Devanagari — anything the file stores as
 * UTF-8 text arrives intact, because nothing here re-encodes.
 *
 * What is not: formulas are read as their cached value (which is what a
 * contributor sees on screen), and styling is ignored entirely.
 *
 * The output is `Row` — `Record<string, string>` — the exact shape the CSV
 * parser produces, so everything downstream (mapping, validation, duplicate
 * detection, staging, publish) is shared with no branching on file type.
 */

/* ------------------------------------------------------------------- zip */

/**
 * DEFLATE decompression.
 *
 * Uses the platform's own decompressor — every browser and Node 18+ ship
 * `DecompressionStream` — rather than a hand-written inflate, which would be a
 * large amount of subtle code for an environment this project does not target.
 * Async because the stream API is.
 */
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) throw new Error('This environment cannot decompress .xlsx files.');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DS('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const utf8 = (b: Uint8Array): string => new TextDecoder('utf-8').decode(b);

/* ------------------------------------------------------------------- xml */

/**
 * Pulls every element with the given tag, in document order.
 *
 * The attribute run is matched lazily so that a self-closing tag's trailing
 * slash is not swallowed as part of it — `<sheet name="x"/>` is how workbooks
 * declare their sheets and `<row r="2"/>` is how they write an empty row, so
 * treating those as unclosed open tags would lose the whole document.
 */
function* elements(xml: string, tag: string): Generator<{ attrs: string; body: string }> {
  const open = new RegExp(`<${tag}(\\s[^>]*?)?(/)?>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = open.exec(xml))) {
    const attrs = m[1] ?? '';
    if (m[2] === '/') {
      yield { attrs, body: '' };
      continue;
    }
    const close = xml.indexOf(`</${tag}>`, open.lastIndex);
    if (close < 0) return;
    yield { attrs, body: xml.slice(open.lastIndex, close) };
    open.lastIndex = close + tag.length + 3;
  }
}

const attr = (attrs: string, name: string): string | undefined =>
  new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1];

const unescapeXml = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

/** Concatenates the <t> runs inside a shared-string or inline-string element. */
const textOf = (body: string): string => {
  let out = '';
  for (const t of elements(body, 't')) out += unescapeXml(t.body);
  return out;
};

/* --------------------------------------------------------------- reading */

export interface Worksheet {
  name: string;
  /** 1-based position in the workbook, as Excel shows it. */
  index: number;
  rowCount: number;
}

export interface Workbook {
  sheets: Worksheet[];
  /** Rows of a sheet, as raw cell values keyed by column letter. */
  read: (sheetName: string) => string[][];
}

/** Column letters to a zero-based index: A→0, Z→25, AA→26. */
const columnIndex = (ref: string): number => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/**
 * Excel stores dates as a serial number of days since 1900. Converting to ISO
 * keeps them sortable and unambiguous; a bare serial would reach the validator
 * as "45292" and mean nothing to anyone reading a rejection.
 *
 * Serials below 61 are 1900 dates, which the conversion misses by a day because
 * of Excel's phantom 29 February 1900. Nothing in a question bank is dated then.
 */
const excelDate = (serial: number): string => {
  const ms = Math.round((serial - 25_569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
};

/** The built-in number formats that mean "date" or "time". */
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * Whether a cell's style makes its number a date.
 *
 * Style presence alone cannot answer this — a bold cell is styled too — so the
 * cell's format is resolved through `styles.xml`: style index → `cellXfs` entry
 * → `numFmtId`, then either a built-in date slot or a custom format whose code
 * contains date fields. Guessing from the value instead would turn a genuine
 * number in the date serial range into a date, and question banks contain
 * numbers.
 */
function dateStyles(stylesXml: string | undefined): (styleIndex: number) => boolean {
  if (!stylesXml) return () => false;

  // Custom formats (id 164+) declare their own format code.
  const custom = new Map<number, boolean>();
  for (const f of elements(stylesXml, 'numFmt')) {
    const id = Number(attr(f.attrs, 'numFmtId'));
    const code = unescapeXml(attr(f.attrs, 'formatCode') ?? '')
      // Literal text, escaped characters, colours and conditions are not fields.
      .replace(/"[^"]*"/g, '')
      .replace(/\\./g, '')
      .replace(/\[[^\]]*\]/g, '');
    if (Number.isFinite(id)) custom.set(id, /[ymdhs]/i.test(code));
  }

  // cellXfs is the array cell `s` attributes index into; the other xf lists in
  // this part are named styles and must not be counted.
  const cellXfsBody = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? '';
  const isDate: boolean[] = [];
  for (const xf of elements(cellXfsBody, 'xf')) {
    const id = Number(attr(xf.attrs, 'numFmtId') ?? '0');
    isDate.push(BUILTIN_DATE_FORMATS.has(id) || custom.get(id) === true);
  }

  return (styleIndex: number) => isDate[styleIndex] === true;
}

/**
 * Opens a workbook.
 *
 * Entries are located through the ZIP central directory rather than by scanning
 * for local headers, because a local header does not reliably carry the
 * compressed size — writers that use a data descriptor leave it zero, and Excel
 * does in some versions.
 */
export async function readWorkbook(bytes: Uint8Array): Promise<Workbook> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // The end-of-central-directory record sits at the tail, after an optional
  // comment, so it is found by scanning backwards for its signature.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 66_000; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('That file is not a .xlsx workbook.');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const parts = new Map<string, string>();

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = utf8(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    // Only the parts this importer reads are worth decompressing.
    const wanted =
      name === 'xl/workbook.xml' ||
      name === 'xl/sharedStrings.xml' ||
      name === 'xl/styles.xml' ||
      name.startsWith('xl/worksheets/sheet') ||
      name === 'xl/_rels/workbook.xml.rels';
    if (!wanted) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(start, start + compressedSize);
    parts.set(name, utf8(method === 0 ? raw : await inflate(raw)));
  }

  const workbookXml = parts.get('xl/workbook.xml');
  if (!workbookXml) throw new Error('That .xlsx file has no workbook part.');

  // Shared strings: the table most cell values point into.
  const shared: string[] = [];
  const sharedXml = parts.get('xl/sharedStrings.xml');
  if (sharedXml) for (const si of elements(sharedXml, 'si')) shared.push(textOf(si.body));

  const isDateStyle = dateStyles(parts.get('xl/styles.xml'));

  // Sheet name → part path, resolved through the relationship ids.
  const rels = new Map<string, string>();
  const relsXml = parts.get('xl/_rels/workbook.xml.rels');
  if (relsXml) {
    for (const r of elements(relsXml, 'Relationship')) {
      const id = attr(r.attrs, 'Id');
      const target = attr(r.attrs, 'Target');
      if (id && target) rels.set(id, target.replace(/^\/?xl\//, '').replace(/^\//, ''));
    }
  }

  const sheetPaths = new Map<string, string>();
  const sheets: Worksheet[] = [];
  let position = 0;
  for (const s of elements(workbookXml, 'sheet')) {
    const name = unescapeXml(attr(s.attrs, 'name') ?? `Sheet${position + 1}`);
    const rid = attr(s.attrs, 'r:id') ?? attr(s.attrs, 'id');
    position += 1;
    const target = rid ? rels.get(rid) : undefined;
    const path = `xl/${target ?? `worksheets/sheet${position}.xml`}`;
    sheetPaths.set(name, path);
    const xml = parts.get(path) ?? '';
    sheets.push({ name, index: position, rowCount: (xml.match(/<row[\s>]/g) ?? []).length });
  }

  const read = (sheetName: string): string[][] => {
    const xml = parts.get(sheetPaths.get(sheetName) ?? '');
    if (!xml) return [];
    const rows: string[][] = [];

    for (const row of elements(xml, 'row')) {
      const cells: string[] = [];
      for (const c of elements(row.body, 'c')) {
        const ref = attr(c.attrs, 'r') ?? '';
        const type = attr(c.attrs, 't');
        const style = attr(c.attrs, 's');
        let value = '';

        if (type === 'inlineStr') {
          value = textOf(c.body);
        } else {
          const v = /<v[^>]*>([\s\S]*?)<\/v>/.exec(c.body)?.[1];
          if (v !== undefined) {
            const raw = unescapeXml(v);
            if (type === 's') value = shared[Number(raw)] ?? '';
            else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
            else if (type === 'str' || type === 'e') value = raw;
            else {
              // Numeric. Dates are serials wearing a date format; every other
              // number passes through as the text the mapping layer expects.
              const n = Number(raw);
              const isDate = style !== undefined && isDateStyle(Number(style)) && Number.isFinite(n);
              value = isDate ? excelDate(n) : raw;
            }
          }
        }

        // Gaps: a row may skip columns entirely, so cells are placed by their
        // reference rather than appended in order.
        const at = ref ? columnIndex(ref) : cells.length;
        while (cells.length < at) cells.push('');
        cells[at] = value;
      }
      rows.push(cells);
    }
    return rows;
  };

  return { sheets, read };
}

/* ------------------------------------------------------------- to rows */

export interface SheetRows {
  headers: string[];
  rows: Row[];
  /** Spreadsheet row number the header was found on, 1-based. */
  headerRow: number;
}

/**
 * Turns a sheet into the same `Row[]` the CSV parser produces.
 *
 * The header is not assumed to be row 1: exported workbooks routinely carry a
 * title, a blank line, or a note above the table. The first row with at least
 * two non-empty cells wins, which is the cheapest rule that handles those
 * without guessing at content.
 */
export function sheetToRows(grid: string[][]): SheetRows {
  let headerIndex = grid.findIndex((r) => r.filter((c) => c && c.trim()).length >= 2);
  if (headerIndex < 0) headerIndex = 0;

  const headerCells = grid[headerIndex] ?? [];
  const headers = headerCells.map((h, i) => (h && h.trim() ? h.trim() : `Column ${i + 1}`));

  const rows: Row[] = [];
  for (let i = headerIndex + 1; i < grid.length; i += 1) {
    const cells = grid[i] ?? [];
    // A row of nothing is a spacer, not a question.
    if (!cells.some((c) => c && c.trim())) continue;
    const row: Row = {};
    headers.forEach((h, c) => {
      row[h] = (cells[c] ?? '').trim();
    });
    rows.push(row);
  }
  return { headers, rows, headerRow: headerIndex + 1 };
}

/* --------------------------------------------------------------- writing */

/**
 * Writes a minimal .xlsx — enough for the downloadable template.
 *
 * Everything is an inline string, so there is no shared-string table to build
 * and no styling to describe: Excel, LibreOffice and Sheets all open it.
 * Stored uncompressed (ZIP method 0) because the template is a few kilobytes
 * and this avoids needing a compressor to match the decompressor above.
 */
export function writeWorkbook(sheetName: string, rows: string[][]): Uint8Array {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const colRef = (n: number): string => {
    let s = '';
    n += 1;
    while (n > 0) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
    rows
      .map(
        (cells, r) =>
          `<row r="${r + 1}">` +
          cells
            .map(
              (v, c) =>
                `<c r="${colRef(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`,
            )
            .join('') +
          `</row>`,
      )
      .join('') +
    `</sheetData></worksheet>`;

  const files: [string, string][] = [
    [
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    ],
    [
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ],
    ['xl/worksheets/sheet1.xml', sheetXml],
  ];

  return zipStore(files);
}

/** Builds an uncompressed ZIP. */
function zipStore(files: [string, string][]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); // stored
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let at = 0;
  for (const l of locals) {
    out.set(l, at);
    at += l.length;
  }
  for (const c of centrals) {
    out.set(c, at);
    at += c.length;
  }
  out.set(end, at);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* -------------------------------------------------------------- template */

/** Columns the importer understands, in the order a contributor fills them. */
export const TEMPLATE_HEADERS = [
  'Exam',
  'Level',
  'Subject',
  'Unit',
  'Topic',
  'Subtopic',
  'Question EN',
  'Question HI',
  'Option A EN',
  'Option B EN',
  'Option C EN',
  'Option D EN',
  'Option A HI',
  'Option B HI',
  'Option C HI',
  'Option D HI',
  'Correct Answer',
  'Explanation EN',
  'Explanation HI',
  'Year',
  'Paper',
  'Shift',
  'Difficulty',
];

/**
 * The downloadable starter workbook: the headers plus one filled example, so
 * the shape of every column is visible rather than described.
 */
export function templateWorkbook(): Uint8Array {
  const example = [
    'htet',
    'upper-primary',
    'cdp',
    '',
    'cdp-piaget',
    '',
    '[EXAMPLE] In which stage does object permanence develop?',
    '[उदाहरण] वस्तु स्थायित्व किस अवस्था में विकसित होता है?',
    'Sensorimotor',
    'Pre-operational',
    'Concrete operational',
    'Formal operational',
    'संवेदी-पेशीय',
    'पूर्व-संक्रियात्मक',
    'मूर्त संक्रियात्मक',
    'औपचारिक संक्रियात्मक',
    'A',
    'Object permanence is the hallmark of the sensorimotor stage.',
    'वस्तु स्थायित्व संवेदी-पेशीय अवस्था की पहचान है।',
    '2024',
    'Paper 1',
    '1',
    'easy',
  ];
  return writeWorkbook('Questions', [TEMPLATE_HEADERS, example]);
}
