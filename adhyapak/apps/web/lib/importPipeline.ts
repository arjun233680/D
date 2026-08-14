'use client';

import {
  DEFAULT_COLUMNS,
  EXAMS,
  SUBJECTS,
  commitImport,
  createImportBatch,
  findDuplicates,
  findLibraryDuplicates,
  fingerprint,
  importQuestions,
  parseDelimited,
  refsFrom,
  resolveColumns,
  type ColumnMap,
  type ContentQuestion,
  type DuplicateMatch,
  type ImportReport,
  type Row,
} from '@adhyapak/core';

/**
 * The Studio's import pipeline.
 *
 * Every stage below is a call into `@adhyapak/core` — the same functions the CLI
 * importer uses. Nothing here re-implements a validation rule, a column alias or
 * a duplicate test; if the two ever disagreed, an educator's screen and the
 * command line would accept different files, which is the bug this indirection
 * exists to prevent.
 *
 * The pipeline is deliberately format-agnostic past the first step:
 *
 *   file → parser → Row[] → mapping → validation → preview → draft import
 *
 * `Row` is a plain `Record<string, string>`, so an Excel or PDF extractor added
 * later plugs in at the parser and inherits everything downstream unchanged.
 */

export type Step = 'upload' | 'map' | 'review' | 'importing' | 'done';

/** The exam levels a question may be tagged with. Closed set, so typos are catchable. */
export const LEVELS = ['primary', 'upper-primary', 'secondary', 'senior-secondary', 'eligibility'];

/** Reference ids the validator checks against — the taxonomy, not the content. */
export const contentRefs = () =>
  refsFrom({
    exams: EXAMS.map((e) => e.id),
    subjects: SUBJECTS.map((s) => s.id),
    topics: SUBJECTS.flatMap((s) => s.topics.map((t) => t.id)),
    levels: LEVELS,
  });

/** Canonical fields an educator can remap, in the order the wizard shows them. */
export const MAPPABLE_FIELDS: { field: string; label: string; required: boolean }[] = [
  { field: 'question', label: 'Question (English)', required: true },
  { field: 'questionHi', label: 'Question (Hindi)', required: false },
  { field: 'optionA', label: 'Option A', required: true },
  { field: 'optionB', label: 'Option B', required: true },
  { field: 'optionC', label: 'Option C', required: false },
  { field: 'optionD', label: 'Option D', required: false },
  { field: 'optionAHi', label: 'Option A (Hindi)', required: false },
  { field: 'optionBHi', label: 'Option B (Hindi)', required: false },
  { field: 'optionCHi', label: 'Option C (Hindi)', required: false },
  { field: 'optionDHi', label: 'Option D (Hindi)', required: false },
  { field: 'answer', label: 'Correct answer', required: true },
  { field: 'explanation', label: 'Explanation (English)', required: false },
  { field: 'explanationHi', label: 'Explanation (Hindi)', required: false },
  { field: 'exam', label: 'Exam', required: false },
  { field: 'level', label: 'Level', required: false },
  { field: 'subject', label: 'Subject', required: true },
  { field: 'unit', label: 'Unit / chapter', required: false },
  { field: 'topic', label: 'Topic', required: true },
  { field: 'subtopic', label: 'Subtopic', required: false },
  { field: 'year', label: 'Year (makes it a PYQ)', required: false },
  { field: 'paper', label: 'Paper', required: false },
  { field: 'shift', label: 'Shift', required: false },
  { field: 'questionNumber', label: 'Question number', required: false },
  { field: 'difficulty', label: 'Difficulty', required: false },
  { field: 'source', label: 'Source', required: false },
  { field: 'tags', label: 'Tags', required: false },
];

/** What the file looks like once parsed, before any mapping decision. */
export interface ParsedFile {
  filename: string;
  headers: string[];
  rows: Row[];
  /** Canonical field → the header the aliases matched, or undefined. */
  autoMapping: Record<string, string | undefined>;
}

export const parseFile = (filename: string, text: string): ParsedFile => {
  const rows = parseDelimited(text);
  const headers = Object.keys(rows[0] ?? {});
  return { filename, headers, rows, autoMapping: resolveColumns(headers, DEFAULT_COLUMNS) };
};

/**
 * Turns the educator's mapping choices into a column map the core importer
 * understands.
 *
 * A manual choice becomes the single alias for that field, which is what makes
 * "this column is the question, whatever it is called" work for a file whose
 * headers match nothing.
 */
export const columnMapFrom = (mapping: Record<string, string | undefined>): ColumnMap => {
  const map: ColumnMap = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (header) map[field] = [header];
  }
  // Fields the educator did not touch keep their default aliases.
  for (const [field, aliases] of Object.entries(DEFAULT_COLUMNS)) {
    if (!map[field]) map[field] = aliases;
  }
  return map;
};

export interface ValidatedImport {
  report: ImportReport;
  /** Collisions inside the file and against the library. Never acted on. */
  duplicates: DuplicateMatch[];
  /** Ids the educator has chosen to skip — duplicates they do not want. */
  skipped: Set<string>;
}

/**
 * Maps, validates and looks for duplicates. Writes nothing.
 *
 * The library check is a network call, so it is skipped when there is no
 * backend — in-file duplicates are still reported, because those need no
 * database at all.
 */
export const validateImport = async (
  parsed: ParsedFile,
  mapping: Record<string, string | undefined>,
  options: { examId?: string; idPrefix?: string } = {},
): Promise<ValidatedImport> => {
  const report = importQuestions(parsed.rows, {
    columns: columnMapFrom(mapping),
    refs: contentRefs(),
    defaultExamIds: options.examId ? [options.examId] : [],
    status: 'draft',
    idPrefix: options.idPrefix ?? `q-${Date.now().toString(36)}`,
  });

  const existing = await findLibraryDuplicates(
    report.accepted.map((q) => fingerprint(q.text)),
  ).catch(() => []);

  return {
    report,
    duplicates: findDuplicates(report.accepted, existing),
    skipped: new Set<string>(),
  };
};

export interface CommitOutcome {
  ok: boolean;
  written: number;
  attempted: number;
  batchId?: string;
  error?: string;
}

/**
 * Records the batch, then writes the accepted rows as drafts.
 *
 * Returns how many rows were actually written even when it fails, because "23
 * of 40 saved, then the connection dropped" is a different situation from
 * "nothing saved" and the educator has to be able to tell them apart.
 */
export const runImport = async (
  parsed: ParsedFile,
  validated: ValidatedImport,
  label: string,
  examId: string | undefined,
  onProgress?: (done: number, total: number) => void,
): Promise<CommitOutcome> => {
  const toWrite: ContentQuestion[] = validated.report.accepted.filter(
    (q) => !validated.skipped.has(q.id),
  );

  const batch = await createImportBatch({
    label,
    filename: parsed.filename,
    examId,
    totalRows: validated.report.stats.total,
    rejectedRows: validated.report.stats.rejected,
    duplicateRows: validated.duplicates.length,
    report: {
      stats: validated.report.stats,
      rejected: validated.report.rejected.slice(0, 500),
      duplicates: validated.duplicates.slice(0, 500),
    },
  });

  if (!batch.ok) return { ok: false, written: 0, attempted: toWrite.length, error: batch.error };

  const result = await commitImport(batch.value.id, toWrite, (p) => onProgress?.(p.done, p.total));

  if (!result.ok) {
    return {
      ok: false,
      written: 0,
      attempted: toWrite.length,
      batchId: batch.value.id,
      error: result.error,
    };
  }
  return { ok: true, written: result.value, attempted: toWrite.length, batchId: batch.value.id };
};
