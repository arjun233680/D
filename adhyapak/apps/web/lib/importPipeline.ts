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
  HTET_VALUE_ALIASES,
  importQuestions,
  parseDelimited,
  readWorkbook,
  refsFrom,
  resolveColumns,
  sheetToRows,
  templateWorkbook,
  type ColumnMap,
  type ContentQuestion,
  type DuplicateMatch,
  type ImportReport,
  type Row,
  type Worksheet,
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
 * `Row` is a plain `Record<string, string>`, so a format is added by teaching
 * the parser to produce rows and nothing else. CSV, TSV and .xlsx all arrive
 * that way today; a PDF extractor would plug in at the same place and inherit
 * everything downstream unchanged.
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
  /** Canonical field → the header the aliases matched, or null/undefined. */
  autoMapping: ColumnMapping;
  /**
   * Columns the auto-mapper matched to a field with no ids to match against,
   * and therefore cleared. Shown on the Map step so the operator knows the
   * column was seen and deliberately left alone.
   */
  unmappable: UnmappableColumn[];
  /** Every sheet in the workbook, so the educator can switch. Empty for CSV. */
  sheets: Worksheet[];
  /** Which sheet these rows came from. */
  sheetName?: string;
  /** Spreadsheet row the header was found on — what row numbers below refer to. */
  headerRow: number;
}

/**
 * Fields that hold an id, and the reference set each is checked against.
 *
 * When a set is empty the taxonomy defines no such ids, so *any* value in that
 * column is unresolvable and every row carrying one is rejected. Auto-mapping
 * such a column is not a helpful guess, it is a guaranteed failure — the HTET
 * sheet's prose "Sub-Topic" column mapped itself to `subtopic` and produced 630
 * identical rejections at the Review step, three clicks after the place the
 * operator could have done something about it.
 */
const ID_FIELDS: { field: string; label: string; ids: (refs: ReturnType<typeof contentRefs>) => ReadonlySet<string> | undefined }[] = [
  { field: 'subtopic', label: 'Subtopic', ids: (r) => r.subtopicIds },
  { field: 'unit', label: 'Unit / chapter', ids: (r) => r.unitIds },
];

/** A column that was auto-mapped to a field nothing could ever match. */
export interface UnmappableColumn {
  field: string;
  label: string;
  header: string;
}

const rowsToParsed = (
  filename: string,
  rows: Row[],
  extra: Partial<ParsedFile> = {},
): ParsedFile => {
  const headers = Object.keys(rows[0] ?? {});
  const autoMapping: ColumnMapping = resolveColumns(headers, DEFAULT_COLUMNS);

  // Clear the guaranteed-failure mappings before the operator ever sees them,
  // and hand back what was cleared so the Map step can say why.
  const refs = contentRefs();
  const unmappable: UnmappableColumn[] = [];
  for (const { field, label, ids } of ID_FIELDS) {
    const header = autoMapping[field];
    if (typeof header === 'string' && header && !ids(refs)?.size) {
      unmappable.push({ field, label, header });
      autoMapping[field] = null;
    }
  }

  return {
    filename,
    headers,
    rows,
    autoMapping,
    unmappable,
    sheets: [],
    headerRow: 1,
    ...extra,
  };
};

const isWorkbook = (filename: string) => /\.xlsx?$/i.test(filename);

/**
 * A parse failure the educator is meant to read and act on.
 *
 * Carries both languages because it is shown on screen, and every user-facing
 * string in this product is bilingual. `@adhyapak/core` throws English-only
 * technical errors — appropriate for a library — so they are translated here,
 * at the boundary where a human starts reading.
 */
export class ParseError extends Error {
  readonly hi: string;
  constructor(en: string, hi: string) {
    super(en);
    this.name = 'ParseError';
    this.hi = hi;
  }
}

/** Picks the right half of an error for the current language. */
export const parseErrorText = (error: unknown, hi: boolean): string => {
  if (error instanceof ParseError) return hi ? error.hi : error.message;
  const message = error instanceof Error ? error.message : String(error);
  return hi ? `फ़ाइल पढ़ी नहीं जा सकी: ${message}` : `The file could not be read: ${message}`;
};

/**
 * Parses an uploaded file into rows.
 *
 * This is the only step that knows what a file format is. A workbook and a CSV
 * both leave here as `Row[]`, so mapping, validation, duplicate detection,
 * staging and publishing are one code path — an Excel import cannot drift away
 * from a CSV import because there is nothing downstream to drift.
 *
 * `.xls` is the old binary format, not a workbook; it is rejected by name
 * rather than failing later with a ZIP error nobody can act on.
 */
export const parseFile = async (file: File, sheetName?: string): Promise<ParsedFile> => {
  if (/\.xls$/i.test(file.name)) {
    throw new ParseError(
      'That is the older .xls format. Open it in Excel, choose “Save As → .xlsx”, then upload again.',
      'यह पुराना .xls प्रारूप है। इसे Excel में खोलकर “Save As → .xlsx” करें, फिर दोबारा अपलोड करें।',
    );
  }

  if (!isWorkbook(file.name)) return rowsToParsed(file.name, parseDelimited(await file.text()));

  const workbook = await readWorkbook(new Uint8Array(await file.arrayBuffer())).catch(() => {
    throw new ParseError(
      'That file is not a readable .xlsx workbook. If it was renamed to .xlsx, open it in Excel and save it again as a real workbook.',
      'यह फ़ाइल पढ़ी जा सकने वाली .xlsx वर्कबुक नहीं है। यदि इसका नाम बदलकर .xlsx किया गया है, तो इसे Excel में खोलकर वास्तविक वर्कबुक के रूप में दोबारा सहेजें।',
    );
  });

  if (workbook.sheets.length === 0) {
    throw new ParseError('That workbook has no sheets.', 'इस वर्कबुक में कोई शीट नहीं है।');
  }

  // Default to the first sheet with data — a workbook often opens on an empty
  // "Sheet1" left over from the template it was made from.
  const chosen =
    workbook.sheets.find((s) => s.name === sheetName) ??
    workbook.sheets.find((s) => s.rowCount > 1) ??
    workbook.sheets[0]!;

  const { headers, rows, headerRow } = sheetToRows(workbook.read(chosen.name));
  // `rowsToParsed` computes the mapping *and* clears the fields that could
  // never resolve, so its result is spread in whole. Recomputing `autoMapping`
  // here would undo that guard for every workbook — which is exactly the file
  // type this matters for.
  return {
    ...rowsToParsed(file.name, rows),
    headers: rows.length > 0 ? Object.keys(rows[0]!) : headers,
    sheets: workbook.sheets,
    sheetName: chosen.name,
    headerRow,
  };
};

/** The starter workbook offered on the upload step, as a downloadable blob. */
export const templateBlob = (): Blob =>
  new Blob([templateWorkbook() as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

/**
 * What the educator has said about one field.
 *
 *   string    — this column, whatever its header is called
 *   null      — deliberately cleared: this field maps to nothing
 *   undefined — never touched, so the default aliases still apply
 *
 * The distinction between the last two is the whole point. They used to be one
 * value, so "— not mapped —" set the field to undefined, the defaults were
 * re-applied a moment later, and the column silently mapped itself straight
 * back. A field the operator cleared has to stay cleared.
 */
export type ColumnChoice = string | null | undefined;
export type ColumnMapping = Record<string, ColumnChoice>;

/**
 * Turns the educator's mapping choices into a column map the core importer
 * understands.
 *
 * A manual choice becomes the single alias for that field, which is what makes
 * "this column is the question, whatever it is called" work for a file whose
 * headers match nothing. An empty alias list matches no header at all, which is
 * how a cleared field survives the defaults below.
 */
export const columnMapFrom = (mapping: ColumnMapping): ColumnMap => {
  const map: ColumnMap = {};
  for (const [field, header] of Object.entries(mapping)) {
    if (typeof header === 'string' && header) map[field] = [header];
    // Cleared on purpose. An empty list resolves to no column, and — crucially
    // — claims the key, so the defaults below leave it alone.
    else if (header === null) map[field] = [];
  }
  // Fields the educator never touched keep their default aliases. Tested with
  // `in` rather than truthiness because a cleared field's `[]` is truthy and a
  // future refactor to `?.length` would quietly resurrect the bug.
  for (const [field, aliases] of Object.entries(DEFAULT_COLUMNS)) {
    if (!(field in map)) map[field] = aliases;
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
  mapping: ColumnMapping,
  options: { examId?: string; idPrefix?: string } = {},
): Promise<ValidatedImport> => {
  const report = importQuestions(parsed.rows, {
    columns: columnMapFrom(mapping),
    refs: contentRefs(),
    // The HTET source sheets label their rows in prose — "Piaget", "PRT",
    // "G.K. & Awareness" — so those are translated to ids. Keyed to the chosen
    // exam rather than applied always: a label like "Geography" means something
    // different outside a Haryana GK paper, and filing it under hgk-geography
    // because the table happened to contain the word would be worse than
    // rejecting it. Unmapped values pass through and are validated as usual.
    valueAliases: options.examId === 'htet' ? HTET_VALUE_ALIASES : undefined,
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
