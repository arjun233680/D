/**
 * The HTET section split, asserted against whatever holds the content.
 *
 *   npm run content:verify            — against the configured database
 *   npm run content:verify -- --files — against content/*.xlsx, before importing
 *
 * The rule is the blueprint: every HTET paper carries 30 CDP questions and 10
 * Haryana GK questions, for all seven years at all three levels. If the counts
 * come out differently the topic map or the blueprint is wrong, not the data,
 * so this exits non-zero and prints the papers that disagree rather than
 * reporting a total that happens to add up.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_COLUMNS,
  EXAMS,
  HTET_VALUE_ALIASES,
  SUBJECTS,
  getBackend,
  importQuestions,
  isBackendConfigured,
  readWorkbook,
  refsFrom,
  sheetToRows,
  type ImportOptions,
} from '../packages/core/src/index.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Questions per paper, by subject. The HTET blueprint, encoded in P1. */
const EXPECTED: Record<string, number> = { cdp: 30, 'haryana-gk': 10 };

const LEVELS = ['primary', 'upper-primary', 'senior-secondary'] as const;
const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

const refs = refsFrom({
  exams: EXAMS.map((e) => e.id),
  subjects: SUBJECTS.map((s) => s.id),
  topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
  levels: ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'],
});

/**
 * GK.xlsx has one "Explanation" column and its content is Hindi, so it is
 * mapped to the Hindi field and the English explanation is left empty. Copying
 * Hindi into the English field would make every screen that falls back to
 * English show Hindi and call it English.
 *
 * This is the same choice an operator makes on the wizard's column-mapping
 * step; encoding it here keeps `content:verify` honest about what was imported.
 */
const columnsFor = (file: string): ImportOptions['columns'] =>
  file === 'GK.xlsx'
    ? { ...DEFAULT_COLUMNS, explanation: ['explanationenglish'], explanationHi: ['explanation'] }
    : undefined;

type Key = `${number}|${string}|${string}`;
const key = (year: number, level: string, subject: string): Key => `${year}|${level}|${subject}`;

/* ------------------------------------------------------------- the check */

function report(counts: Map<string, number>, source: string): boolean {
  const problems: string[] = [];
  let total = 0;

  for (const subject of Object.keys(EXPECTED)) {
    for (const level of LEVELS) {
      for (const year of YEARS) {
        const found = counts.get(key(year, level, subject)) ?? 0;
        total += found;
        if (found !== EXPECTED[subject]) {
          problems.push(
            `  ${year} ${level.padEnd(16)} ${subject.padEnd(11)} ` +
              `found ${found}, expected ${EXPECTED[subject]}`,
          );
        }
      }
    }
  }

  // Anything outside the 21 papers x 2 subjects grid is also a problem.
  const stray = [...counts.entries()].filter(([k]) => {
    const [y, l, s] = k.split('|');
    return !(YEARS.includes(Number(y)) && LEVELS.includes(l as never) && s! in EXPECTED);
  });

  console.log(`\n${source}: ${total} questions across ${YEARS.length * LEVELS.length} papers`);
  for (const subject of Object.keys(EXPECTED)) {
    const n = [...counts.entries()]
      .filter(([k]) => k.endsWith(`|${subject}`))
      .reduce((sum, [, v]) => sum + v, 0);
    console.log(`  ${subject.padEnd(11)} ${n}`);
  }

  if (problems.length) {
    console.log(`\n  ${problems.length} paper(s) off the expected split:`);
    for (const p of problems.slice(0, 40)) console.log(p);
  }
  if (stray.length) {
    console.log(`\n  ${stray.length} group(s) outside the expected grid:`);
    for (const [k, n] of stray.slice(0, 20)) console.log(`    ${k} -> ${n}`);
  }

  const ok = problems.length === 0 && stray.length === 0;
  console.log(`\n  ${ok ? 'PASS' : 'FAIL'} — 30 CDP and 10 Haryana GK per paper`);
  return ok;
}

/* ------------------------------------------------------- from the files */

async function fromFiles(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  let rejected = 0;

  for (const file of ['CDP.xlsx', 'GK.xlsx']) {
    const bytes = new Uint8Array(readFileSync(join(ROOT, 'content', file)));
    const workbook = await readWorkbook(bytes);
    const { rows } = sheetToRows(workbook.read('Sheet1'));

    const report = importQuestions(rows, {
      refs,
      valueAliases: HTET_VALUE_ALIASES,
      defaultExamIds: ['htet'],
      status: 'draft',
      idPrefix: file.replace('.xlsx', '').toLowerCase(),
      columns: columnsFor(file),
    });

    rejected += report.rejected.length;
    if (report.rejected.length) {
      console.log(`\n  ${file}: ${report.rejected.length} rejected`);
      for (const r of report.rejected.slice(0, 10)) {
        for (const issue of r.issues) {
          console.log(`    row ${r.row}: ${issue.field} — ${issue.message}`);
        }
      }
    }

    for (const q of report.accepted) {
      const year = q.pyq?.year;
      const level = q.levels?.[0];
      if (year === undefined || !level) continue;
      const k = key(year, level, q.subjectId);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }

  if (rejected) console.log(`\n  ${rejected} row(s) rejected in total`);
  return counts;
}

/* ---------------------------------------------------- from the database */

async function fromDatabase(): Promise<Map<string, number> | null> {
  if (!isBackendConfigured()) {
    console.log('No database configured — set SUPABASE_URL and SUPABASE_ANON_KEY.');
    return null;
  }
  const db = getBackend();
  if (!db) return null;

  // Published only: a draft is not content a learner can reach, so counting it
  // would report a paper as complete before anybody had reviewed it.
  const counts = new Map<string, number>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from('questions')
      .select('subject_id, levels, pyq_year, status')
      .eq('status', 'published')
      .contains('exam_ids', ['htet'])
      .not('pyq_year', 'is', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data as {
      subject_id: string;
      levels: string[] | null;
      pyq_year: number | null;
    }[]) {
      const level = row.levels?.[0];
      if (!level || row.pyq_year === null) continue;
      const k = key(row.pyq_year, level, row.subject_id);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    if (data.length < pageSize) break;
  }
  return counts;
}

/* -------------------------------------------------------------------- run */

const useFiles = process.argv.includes('--files');
const counts = useFiles ? await fromFiles() : await fromDatabase();

if (!counts) {
  console.log('\nNothing to check.');
  process.exit(2);
}

process.exit(report(counts, useFiles ? 'content/*.xlsx' : 'live database') ? 0 : 1);
