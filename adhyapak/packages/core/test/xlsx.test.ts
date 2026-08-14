import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { describe, it } from 'node:test';
import {
  EXAMS,
  SUBJECTS,
  TEMPLATE_HEADERS,
  importQuestions,
  parseDelimited,
  readWorkbook,
  refsFrom,
  resolveColumns,
  sheetToRows,
  templateWorkbook,
} from '../src/index.ts';

/**
 * The .xlsx reader.
 *
 * Round-tripping our own writer would only prove the writer and reader agree
 * with each other, so most of these build workbooks the way Excel does —
 * deflate-compressed parts, a shared string table, styles, relationship ids
 * that do not match file order — and read those. The last group checks the
 * thing that actually matters: that a spreadsheet and the equivalent CSV reach
 * the importer as the same rows.
 */

/* ------------------------------------------------------- fixture building */

const crcTable = (() => {
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
  for (const byte of data) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Builds a ZIP the way Excel writes one: every part deflated, a trailing
 * archive comment (which the reader has to scan past to find the directory).
 */
function zipDeflate(files: Record<string, string>, comment = ''): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const plain = encoder.encode(content);
    const data = new Uint8Array(deflateRawSync(plain));
    const crc = crc32(plain);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 8, true); // deflate
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, plain.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, plain.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const commentBytes = encoder.encode(comment);
  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22 + commentBytes.length);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, commentBytes.length, true);
  end.set(commentBytes, 22);

  const out = new Uint8Array(offset + centralSize + end.length);
  let at = 0;
  for (const chunk of [...locals, ...centrals, end]) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

const RELS =
  `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId7" Type="x" Target="worksheets/sheet2.xml"/>` +
  `<Relationship Id="rId4" Type="x" Target="/xl/worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId9" Type="x" Target="sharedStrings.xml"/>` +
  `</Relationships>`;

/**
 * A workbook whose two sheets are declared in the opposite order to their
 * files, with relationship ids that carry no positional meaning — the shape
 * that breaks a reader which assumes sheet N lives in sheetN.xml.
 */
function excelLikeWorkbook(sheet1: string, sheet2: string, extra: Record<string, string> = {}) {
  const shared =
    `<?xml version="1.0"?><sst xmlns="x" count="4" uniqueCount="4">` +
    `<si><t>प्रश्न</t></si>` +
    `<si><t>Answer</t></si>` +
    `<si><t xml:space="preserve">  padded  </t></si>` +
    `<si><r><t>rich </t></r><r><t>runs</t></r></si>` +
    `</sst>`;

  return zipDeflate(
    {
      'xl/workbook.xml':
        `<?xml version="1.0"?><workbook xmlns="x" xmlns:r="y"><sheets>` +
        `<sheet name="Questions" sheetId="3" r:id="rId4"/>` +
        `<sheet name="Notes &amp; scratch" sheetId="8" r:id="rId7"/>` +
        `</sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': RELS,
      'xl/sharedStrings.xml': shared,
      'xl/worksheets/sheet1.xml': sheet1,
      'xl/worksheets/sheet2.xml': sheet2,
      ...extra,
    },
    'written by a spreadsheet',
  );
}

const sheet = (rows: string) =>
  `<?xml version="1.0"?><worksheet xmlns="x"><sheetData>${rows}</sheetData></worksheet>`;

/* ------------------------------------------------------------------ tests */

describe('xlsx reading', () => {
  it('reads shared strings, inline strings, numbers and booleans', async () => {
    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>` +
            `<row r="2"><c r="A2" t="inlineStr"><is><t>इनलाइन</t></is></c>` +
            `<c r="B2"><v>2024</v></c></row>` +
            `<row r="3"><c r="A3" t="b"><v>1</v></c><c r="B3" t="b"><v>0</v></c></row>` +
            `<row r="4"><c r="A4" t="s"><v>2</v></c><c r="B4" t="s"><v>3</v></c></row>`,
        ),
        sheet(`<row r="1"><c r="A1" t="inlineStr"><is><t>other sheet</t></is></c></row>`),
      ),
    );

    const grid = wb.read('Questions');
    assert.deepEqual(grid[0], ['प्रश्न', 'Answer']);
    assert.deepEqual(grid[1], ['इनलाइन', '2024']);
    assert.deepEqual(grid[2], ['TRUE', 'FALSE']);
    // Significant whitespace is preserved by the reader; trimming is the row
    // layer's job, and rich-text runs concatenate.
    assert.deepEqual(grid[3], ['  padded  ', 'rich runs']);
  });

  it('lists every sheet and reads them by name, not by file order', async () => {
    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(`<row r="1"><c r="A1" t="s"><v>1</v></c></row>`),
        sheet(
          `<row r="1"><c r="A1" t="inlineStr"><is><t>scratch</t></is></c></row>` +
            `<row r="2"><c r="A2" t="inlineStr"><is><t>more</t></is></c></row>`,
        ),
      ),
    );

    assert.deepEqual(
      wb.sheets.map((s) => [s.name, s.index, s.rowCount]),
      [
        ['Questions', 1, 1],
        ['Notes & scratch', 2, 2],
      ],
    );
    assert.deepEqual(wb.read('Notes & scratch'), [['scratch'], ['more']]);
    assert.deepEqual(wb.read('No such sheet'), []);
  });

  it('places cells by their column reference, so gaps do not shift columns', async () => {
    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          `<row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c>` +
            `<c r="D1" t="inlineStr"><is><t>d</t></is></c>` +
            `<c r="AB1" t="inlineStr"><is><t>ab</t></is></c></row>`,
        ),
        sheet(''),
      ),
    );

    const row = wb.read('Questions')[0]!;
    assert.equal(row[0], 'a');
    assert.equal(row[1], '');
    assert.equal(row[3], 'd');
    // AB is the 28th column: A–Z is 26, then AA, AB.
    assert.equal(row[27], 'ab');
    assert.equal(row.length, 28);
  });

  it('converts dates only when the cell format is a date', async () => {
    const styles =
      `<?xml version="1.0"?><styleSheet xmlns="x">` +
      `<numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>` +
      `<numFmt numFmtId="165" formatCode="#,##0&quot; marks&quot;"/></numFmts>` +
      // Named styles appear first in the part and must not be counted as cellXfs.
      `<cellStyleXfs><xf numFmtId="14"/></cellStyleXfs>` +
      `<cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="14"/>` +
      `<xf numFmtId="164"/><xf numFmtId="165"/><xf numFmtId="2"/></cellXfs>` +
      `</styleSheet>`;

    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          `<row r="1">` +
            `<c r="A1" s="1"><v>45292</v></c>` + // built-in date format
            `<c r="B1" s="2"><v>45292</v></c>` + // custom date format
            `<c r="C1" s="3"><v>45292</v></c>` + // custom number format, same value
            `<c r="D1" s="4"><v>45292</v></c>` + // two-decimal number
            `<c r="E1" s="0"><v>45292</v></c>` + // unformatted
            `</row>`,
        ),
        sheet(''),
        { 'xl/styles.xml': styles },
      ),
    );

    const row = wb.read('Questions')[0]!;
    assert.equal(row[0], '2024-01-01');
    assert.equal(row[1], '2024-01-01');
    // A styled number is still a number — this is the case a "does it have a
    // style?" heuristic gets wrong, and question banks contain plain numbers.
    assert.equal(row[2], '45292');
    assert.equal(row[3], '45292');
    assert.equal(row[4], '45292');
  });

  it('unescapes XML entities and numeric character references', async () => {
    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          `<row r="1"><c r="A1" t="inlineStr"><is><t>a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;</t></is></c>` +
            `<c r="B1" t="inlineStr"><is><t>&#2361;&#x93f;</t></is></c></row>`,
        ),
        sheet(''),
      ),
    );

    const row = wb.read('Questions')[0]!;
    assert.equal(row[0], `a & b <c> "d" 'e'`);
    assert.equal(row[1], 'हि');
  });

  it('refuses a file that is not a workbook, in words a contributor can act on', async () => {
    await assert.rejects(
      () => readWorkbook(new TextEncoder().encode('id,question\n1,hello')),
      /not a \.xlsx workbook/,
    );
  });
});

describe('xlsx to rows', () => {
  it('finds the header below title and spacer rows, and skips blank rows', async () => {
    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          `<row r="1"><c r="A1" t="inlineStr"><is><t>HTET 2024 question bank</t></is></c></row>` +
            `<row r="2"/>` +
            `<row r="3"><c r="A3" t="inlineStr"><is><t>Question EN</t></is></c>` +
            `<c r="B3" t="inlineStr"><is><t>Correct Answer</t></is></c></row>` +
            `<row r="4"><c r="A4" t="inlineStr"><is><t>First</t></is></c>` +
            `<c r="B4" t="inlineStr"><is><t>A</t></is></c></row>` +
            `<row r="5"><c r="A5" t="inlineStr"><is><t>   </t></is></c></row>` +
            `<row r="6"><c r="A6" t="inlineStr"><is><t>Second</t></is></c>` +
            `<c r="B6" t="inlineStr"><is><t>B</t></is></c></row>`,
        ),
        sheet(''),
      ),
    );

    const { headers, rows, headerRow } = sheetToRows(wb.read('Questions'));
    assert.equal(headerRow, 3, 'a one-cell title row is not a header');
    assert.deepEqual(headers, ['Question EN', 'Correct Answer']);
    assert.deepEqual(rows, [
      { 'Question EN': 'First', 'Correct Answer': 'A' },
      { 'Question EN': 'Second', 'Correct Answer': 'B' },
    ]);
  });

  it('names unlabelled columns rather than dropping their data', () => {
    const { headers, rows } = sheetToRows([
      ['Question EN', '', 'Correct Answer'],
      ['Why?', 'stray', 'A'],
    ]);
    assert.deepEqual(headers, ['Question EN', 'Column 2', 'Correct Answer']);
    assert.equal(rows[0]!['Column 2'], 'stray');
  });

  it('survives a sheet with nothing in it', () => {
    assert.deepEqual(sheetToRows([]), { headers: [], rows: [], headerRow: 1 });
  });
});

describe('the template workbook', () => {
  it('reads back through the same reader, Devanagari intact', async () => {
    const wb = await readWorkbook(templateWorkbook());
    assert.deepEqual(
      wb.sheets.map((s) => s.name),
      ['Questions'],
    );

    const { headers, rows } = sheetToRows(wb.read('Questions'));
    assert.deepEqual(headers, TEMPLATE_HEADERS);
    assert.equal(rows.length, 1, 'one example row');
    assert.match(rows[0]!['Question HI']!, /वस्तु स्थायित्व/);
    assert.equal(rows[0]!['Correct Answer'], 'A');
  });

  it('maps onto real importer fields without the contributor renaming anything', () => {
    const mapping = resolveColumns(TEMPLATE_HEADERS);
    // Every column the template ships must resolve; an unmapped header in our
    // own starter file would silently drop that column from every import.
    const unresolved = TEMPLATE_HEADERS.filter((h) => !Object.values(mapping).includes(h));
    assert.deepEqual(unresolved, [], 'template columns the importer does not recognise');

    for (const field of ['exam', 'subject', 'topic', 'question', 'questionHi', 'answer']) {
      assert.ok(mapping[field], `template has no column for ${field}`);
    }
  });
});

describe('a workbook written by real spreadsheet software', () => {
  /**
   * The fixture was produced by openpyxl, not by us — deflate-compressed, with
   * a shared string table, a styles part and genuine date cells. Every other
   * test in this file builds its own input, which can only prove the reader
   * agrees with our idea of the format; this one proves it agrees with somebody
   * else's. docs/IMPORTING.md records how to recreate it.
   */
  const workbook = () =>
    readWorkbook(
      new Uint8Array(
        readFileSync(
          join(dirname(fileURLToPath(import.meta.url)), 'fixtures/openpyxl-workbook.xlsx'),
        ),
      ),
    );

  it('lists its sheets, including one with nothing in it', async () => {
    const wb = await workbook();
    assert.deepEqual(
      wb.sheets.map((s) => s.name),
      ['Questions', 'Notes', 'Empty'],
    );
    assert.deepEqual(wb.read('Empty'), []);
  });

  it('reads Devanagari, dates and gaps out of a third-party file', async () => {
    const { rows, headerRow } = sheetToRows((await workbook()).read('Questions'));

    assert.equal(headerRow, 2, 'the title row above the table is not the header');
    assert.equal(rows.length, 3, 'the blank spacer row is not a question');
    assert.equal(rows[0]!['Question HI'], '[TEST] पहली अवस्था कौन-सी है?');
    assert.equal(rows[0]!['Correct Answer'], 'A');

    // Real date cells, written by real software, arrive as ISO dates.
    assert.equal(rows[0]!['Captured on'], '2024-01-01');
    assert.equal(rows[1]!['Captured on'], '2024-06-15');

    // A gap in the middle of a row leaves an empty value, not a shifted one.
    assert.equal(rows[2]!['Question EN'], '[TEST] Gap row');
    assert.equal(rows[2]!['Question HI'], '');
    assert.equal(rows[2]!['Correct Answer'], 'C');
  });

  it('leaves a bold number alone instead of reading it as a date', async () => {
    const { rows } = sheetToRows((await workbook()).read('Questions'));
    // 45292 is 1 January 2024 as a serial, and this cell is styled — but the
    // style is bold, not a date format, so it is still the number 45292.
    assert.equal(rows[2]!['Year'], '45292');
    assert.equal(rows[0]!['Year'], '1999');
    assert.equal(rows[1]!['Marks'], '2.5');
  });
});

describe('spreadsheets and CSVs reach the importer identically', () => {
  const REFS = refsFrom({
    exams: EXAMS.map((e) => e.id),
    subjects: SUBJECTS.map((s) => s.id),
    topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
    levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
  });
  const now = () => '2026-01-01T00:00:00.000Z';

  const HEADERS = [
    'Exam',
    'Level',
    'Subject',
    'Topic',
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
  ];

  const DATA = [
    [
      'htet',
      'upper-primary',
      'cdp',
      'cdp-piaget',
      '[TEST] Which stage is first?',
      '[TEST] पहली अवस्था कौन-सी है?',
      'Sensorimotor',
      'Pre-operational',
      'Concrete',
      'Formal',
      'संवेदी',
      'पूर्व',
      'मूर्त',
      'औपचारिक',
      'A',
      'Demo.',
      'डेमो।',
      '1999',
    ],
    [
      'htet',
      'upper-primary',
      'cdp',
      'cdp-learning',
      '[TEST] Which option is B?',
      '[TEST] विकल्प B कौन-सा है?',
      'No',
      'Yes',
      'No',
      'No',
      'नहीं',
      'हाँ',
      'नहीं',
      'नहीं',
      'B',
      'Demo.',
      'डेमो।',
      '1999',
    ],
  ];

  it('produces the same accepted questions from either file type', async () => {
    const csv = [HEADERS, ...DATA]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const fromCsv = importQuestions(parseDelimited(csv), { refs: REFS, now });

    const wb = await readWorkbook(
      excelLikeWorkbook(
        sheet(
          [HEADERS, ...DATA]
            .map(
              (cells, r) =>
                `<row r="${r + 1}">` +
                cells
                  .map(
                    (v, c) =>
                      `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr">` +
                      `<is><t>${v.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</t></is></c>`,
                  )
                  .join('') +
                `</row>`,
            )
            .join(''),
        ),
        sheet(''),
      ),
    );
    const fromXlsx = importQuestions(sheetToRows(wb.read('Questions')).rows, { refs: REFS, now });

    assert.equal(fromXlsx.accepted.length, 2);
    assert.equal(fromXlsx.rejected.length, 0);
    assert.deepEqual(
      fromXlsx.accepted.map((q) => q.text),
      fromCsv.accepted.map((q) => q.text),
    );
    assert.deepEqual(fromXlsx.accepted, fromCsv.accepted);
  });
});
