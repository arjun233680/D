/**
 * Generates the sample workbook used to exercise the Studio import path, and
 * measures how the reader behaves at a realistic question-bank size.
 *
 * Run from the repository root:
 *   npx tsx scripts/make-test-workbook.ts
 *
 * The sample is deliberately imperfect: fifteen rows containing every kind of
 * problem an educator hits on their first real upload, so the review step has
 * something to show. Every row is marked [TEST] and carries the fake PYQ year
 * 1999 — before any covered exam existed — so nothing here can be mistaken for
 * real exam content if it ever reaches a database by accident.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import {
  EXAMS,
  SUBJECTS,
  fingerprint,
  findDuplicates,
  importQuestions,
  readWorkbook,
  refsFrom,
  sheetToRows,
  writeWorkbook,
} from '../packages/core/src/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  'Paper',
];

type Overrides = Partial<Record<(typeof HEADERS)[number], string>>;

let n = 0;
const row = (over: Overrides = {}): string[] => {
  n += 1;
  const base: Record<string, string> = {
    Exam: 'htet',
    Level: 'upper-primary',
    Subject: 'cdp',
    Topic: 'cdp-piaget',
    'Question EN': `[TEST] Demo question ${n} — which option is correct?`,
    'Question HI': `[TEST] डेमो प्रश्न ${n} — कौन-सा विकल्प सही है?`,
    'Option A EN': 'First option',
    'Option B EN': 'Second option',
    'Option C EN': 'Third option',
    'Option D EN': 'Fourth option',
    'Option A HI': 'पहला विकल्प',
    'Option B HI': 'दूसरा विकल्प',
    'Option C HI': 'तीसरा विकल्प',
    'Option D HI': 'चौथा विकल्प',
    'Correct Answer': 'A',
    'Explanation EN': '[TEST] Demo explanation.',
    'Explanation HI': '[TEST] डेमो व्याख्या।',
    Year: '1999',
    Paper: 'Paper 1',
  };
  return HEADERS.map((h) => over[h] ?? base[h] ?? '');
};

/* Ten rows that should import cleanly, then five that should not. */
const clean = [
  row(),
  row({ Topic: 'cdp-learning' }),
  row({ 'Correct Answer': 'B' }),
  row({ 'Correct Answer': 'C', Topic: 'cdp-learning' }),
  row({ 'Correct Answer': 'D' }),
  row({ 'Correct Answer': 'Option B' }), // a spelling the parser understands
  row({ 'Correct Answer': '3' }), // 1-based number, also understood
  row({ Year: '1998', Paper: 'Paper 2' }),
  row({ Level: 'primary' }),
  row({ Subject: 'evs', Topic: 'evs-family' }),
];

const problems = [
  // Rejected: an answer letter with no matching option.
  row({ 'Correct Answer': 'Z' }),
  // Rejected: a subject that is not in the taxonomy — should suggest a near match.
  row({ Subject: 'mathematics', Topic: 'cdp-piaget' }),
  // Rejected: no question text at all.
  row({ 'Question EN': '', 'Question HI': '' }),
  // Accepted with a warning: no explanation. Content, not correctness.
  row({ 'Explanation EN': '', 'Explanation HI': '' }),
];

// An exact duplicate of the first row: flagged, never removed automatically.
const duplicate = [...clean[0]!];

const rows = [HEADERS, ...clean, ...problems, duplicate];

const out = join(root, 'docs/samples/adhyapak-test-questions.xlsx');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, writeWorkbook('Questions', rows));
console.log(`wrote ${out} — ${rows.length - 1} data rows`);

/* ----------------------------------------------------- what it does import */

const refs = refsFrom({
  exams: EXAMS.map((e) => e.id),
  subjects: SUBJECTS.map((s) => s.id),
  topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
  levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
});

const workbook = await readWorkbook(new Uint8Array(writeWorkbook('Questions', rows)));
const parsed = sheetToRows(workbook.read('Questions'));
const report = importQuestions(parsed.rows, { refs, status: 'draft' });
const duplicates = findDuplicates(report.accepted, []);

console.log(
  `\nparsed ${parsed.rows.length} rows → ${report.accepted.length} accepted, ` +
    `${report.rejected.length} rejected, ${report.warnings.length} warned, ` +
    `${duplicates.length} duplicate`,
);
for (const r of report.rejected) {
  for (const issue of r.issues) {
    console.log(
      `  row ${r.row + parsed.headerRow - 1}: ${issue.field} — ${issue.message}` +
        (issue.suggestion ? ` (did you mean "${issue.suggestion}"?)` : ''),
    );
  }
}
for (const d of duplicates) console.log(`  duplicate: ${d.id} matches ${d.matchesId} — ${d.reason}`);

/* ------------------------------------------------------------ how it scales */

/**
 * Times the real path, not the easy one: a deflate-compressed workbook with a
 * shared string table, which is what Excel writes. The uncompressed workbook
 * our own template writer produces would decompress for free and flatter the
 * numbers.
 */
function excelLike(dataRows: string[][]): Uint8Array {
  const table: string[] = [];
  const index = new Map<string, number>();
  const intern = (value: string): number => {
    const found = index.get(value);
    if (found !== undefined) return found;
    index.set(value, table.length);
    table.push(value);
    return table.length - 1;
  };

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const colRef = (c: number) => {
    let s = '';
    let x = c + 1;
    while (x > 0) {
      s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  const sheetBody = dataRows
    .map(
      (cells, r) =>
        `<row r="${r + 1}">` +
        cells
          .map((v, c) => `<c r="${colRef(c)}${r + 1}" t="s"><v>${intern(v)}</v></c>`)
          .join('') +
        `</row>`,
    )
    .join('');

  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    '_rels/.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="o" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="x" xmlns:r="y"><sheets><sheet name="Questions" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="w" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet xmlns="x"><sheetData>${sheetBody}</sheetData></worksheet>`,
    'xl/sharedStrings.xml':
      `<?xml version="1.0"?><sst xmlns="x" count="${table.length}" uniqueCount="${table.length}">` +
      table.map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join('') +
      `</sst>`,
  };

  const encoder = new TextEncoder();
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (data: Uint8Array) => {
    let c = 0xffffffff;
    for (const b of data) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

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
    lv.setUint16(8, 8, true);
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

  const centralSize = centrals.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const zip = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const chunk of [...locals, ...centrals, end]) {
    zip.set(chunk, at);
    at += chunk.length;
  }
  return zip;
}

console.log('\nrows      bytes       read      rows       import     total');
for (const count of [500, 1000, 5000, 20000]) {
  n = 0;
  const big = [HEADERS, ...Array.from({ length: count }, () => row())];
  const bytes = excelLike(big);

  const t0 = performance.now();
  const wb = await readWorkbook(bytes);
  const grid = wb.read('Questions');
  const t1 = performance.now();
  const sheet = sheetToRows(grid);
  const t2 = performance.now();
  const result = importQuestions(sheet.rows, { refs, status: 'draft' });
  const t3 = performance.now();

  const ms = (x: number) => `${x.toFixed(0)}ms`.padEnd(10);
  console.log(
    `${String(count).padEnd(10)}${`${(bytes.length / 1024).toFixed(0)}KB`.padEnd(12)}` +
      `${ms(t1 - t0)}${ms(t2 - t1)}${ms(t3 - t2)}${ms(t3 - t0)}` +
      `→ ${result.accepted.length} accepted`,
  );
}
