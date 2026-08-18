import type {
  AnswerStatus,
  Bilingual,
  OptionLabel,
  QuestionDifficulty,
  TeachingLevel,
} from '../types';
import { OPTION_LABELS } from '../types';
import type { ContentQuestion, ContentStatus, PyqRef, QuestionKind } from './types';
import { validateQuestion, type ContentRefs, type Issue, type ValidationResult } from './validation';

/**
 * Bulk question import.
 *
 * Takes the spreadsheet a subject expert actually produces — one question per
 * row, Hindi and English in separate columns, the correct answer written as a
 * letter — and turns it into validated library questions.
 *
 * Two properties matter more than features here:
 *
 *   Nothing partial is written. `importQuestions` returns accepted and rejected
 *   rows and touches no storage, so a caller can show the report and let a human
 *   decide before anything is committed. Section 9 requires the dry run; making
 *   it the *only* mode makes it impossible to skip.
 *
 *   Every rejection says which row and which column. An import of 4,000 rows
 *   that reports "invalid" is not usable by the person who has to fix it.
 *
 * The row shape is a plain `Record<string, string>`, which is the whole
 * extension point: `parseDelimited` here and `readWorkbook` in ./xlsx both
 * produce it, so CSV and .xlsx share every stage after parsing. PDF would plug
 * in at the same place.
 */

export type Row = Record<string, string>;

/* --------------------------------------------------------------- parsing */

/**
 * A CSV parser that survives real exported data: quoted fields, embedded commas
 * and newlines, doubled quotes, and CRLF. Hand-rolled because a question whose
 * text contains a comma is the common case, not the edge case, and splitting on
 * commas would silently shift every later column.
 */
export function parseDelimited(input: string, delimiter = ','): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    // A trailing newline should not produce a row of one empty string.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length) endRow();

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim());
  return body.map((cells) => {
    const out: Row = {};
    keys.forEach((key, i) => {
      out[key] = (cells[i] ?? '').trim();
    });
    return out;
  });
}

/* ---------------------------------------------------------------- mapping */

/**
 * Which column holds what.
 *
 * Every entry accepts several spellings because the header a contributor types
 * is not a thing this package gets to choose. Matching is case-insensitive and
 * ignores spaces, underscores, hyphens, dots and brackets, so "Option A",
 * "option_a", "Opt-A" and "OPTIONA" are one column — and "Q (English)" reaches
 * the field it names.
 */
export interface ColumnMap {
  [canonical: string]: string[];
}

export const DEFAULT_COLUMNS: ColumnMap = {
  id: ['id', 'questionid', 'qid'],
  exam: ['exam', 'examid', 'exams'],
  // 'htet' because the real HTET sheet heads this column with the exam name
  // and fills it with the level.
  level: ['level', 'post', 'examlevel', 'htet'],
  subject: ['subject', 'subjectid'],
  unit: ['unit', 'chapter', 'unitid', 'chapterid'],
  topic: ['topic', 'topicid'],
  subtopic: ['subtopic', 'subtopicid', 'concept'],
  question: ['question', 'questionen', 'questiontext', 'questiontexten', 'q', 'qenglish', 'questionenglish'],
  questionHi: ['questionhi', 'questionhindi', 'prashn', 'questiontexthi', 'qhindi'],
  // Bilingual files label the pair in whatever style the author prefers:
  // "Option A EN"/"Option A HI", "Opt-A (English)"/"Opt-A (Hindi)". Both halves
  // have to resolve or the row loses its English and fails validation, which is
  // how a 630-row file came back 630 rejected.
  optionA: ['optiona', 'optionaen', 'optaenglish', 'optionaenglish', 'opta', 'optaen', 'a', 'aen', 'opt1', 'option1', 'option1en'],
  optionB: ['optionb', 'optionben', 'optbenglish', 'optionbenglish', 'optb', 'optben', 'b', 'ben', 'opt2', 'option2', 'option2en'],
  optionC: ['optionc', 'optioncen', 'optcenglish', 'optioncenglish', 'optc', 'optcen', 'c', 'cen', 'opt3', 'option3', 'option3en'],
  optionD: ['optiond', 'optionden', 'optdenglish', 'optiondenglish', 'optd', 'optden', 'd', 'den', 'opt4', 'option4', 'option4en'],
  optionAHi: ['optionahi', 'optahi', 'optionahindi', 'optahindi', 'ahi', 'option1hi'],
  optionBHi: ['optionbhi', 'optbhi', 'optionbhindi', 'optbhindi', 'bhi', 'option2hi'],
  optionCHi: ['optionchi', 'optchi', 'optionchindi', 'optchindi', 'chi', 'option3hi'],
  optionDHi: ['optiondhi', 'optdhi', 'optiondhindi', 'optdhindi', 'dhi', 'option4hi'],
  answer: ['correctanswer', 'answer', 'correct', 'ans', 'key'],
  // Language-specific spellings come first. A bilingual file can carry both
  // "Explanation (English)" and a merged "Explanation"; the specific header is
  // the one that means English, and the bare one would otherwise win by being
  // listed first and pull Hindi into the English field.
  explanation: ['explanationen', 'explanationenglish', 'explanation', 'solution', 'reason'],
  explanationHi: ['explanationhi', 'explanationhindi', 'solutionhi', 'vyakhya'],
  difficulty: ['difficulty', 'level2', 'hardness'],
  year: ['year', 'pyqyear', 'examyear'],
  paper: ['paper', 'papername', 'paperid'],
  shift: ['shift', 'session', 'sitting'],
  questionNumber: ['questionnumber', 'qno', 'qnumber', 'srno'],
  source: ['source', 'reference', 'book'],
  tags: ['tags', 'tag'],
  conceptTags: ['concepttags', 'concepts'],
  marks: ['marks', 'mark'],
  negativeMarks: ['negativemarks', 'negative', 'penalty'],
  syllabusRef: ['syllabusref', 'syllabus', 'syllabuscode'],
};

/**
 * Reduces a header to something comparable.
 *
 * Brackets are stripped as well as spacing and punctuation, because a real
 * bilingual sheet labels its columns "Q (English)" and "Q (Hindi)". Without
 * that, those normalised to "q(english)" and matched no alias at all, so the
 * question text — the one genuinely required field — was silently unmapped and
 * every row in the file was rejected for having no English text.
 */
const normalise = (s: string): string => s.toLowerCase().replace(/[\s_\-.()[\]{}]/g, '');

/** Resolves the canonical field names to the actual headers present in a file. */
export function resolveColumns(headers: string[], map: ColumnMap = DEFAULT_COLUMNS) {
  const byNormalised = new Map(headers.map((h) => [normalise(h), h]));
  const resolved: Record<string, string | undefined> = {};
  for (const [canonical, aliases] of Object.entries(map)) {
    resolved[canonical] = aliases.map((a) => byNormalised.get(normalise(a))).find(Boolean);
  }
  return resolved;
}

/* -------------------------------------------------------------- importing */

export interface ImportOptions {
  /** Every imported question is attached to these exams unless a row says otherwise. */
  defaultExamIds?: string[];
  defaultLevels?: TeachingLevel[];
  /** Imports land as drafts by default: content should be reviewed, not trusted. */
  status?: ContentStatus;
  kind?: QuestionKind;
  columns?: ColumnMap;
  /** Known ids, so a typo'd topic is caught at import instead of at render. */
  refs?: ContentRefs;
  /**
   * Per-field translations from the labels a source file uses to the ids this
   * app uses — "Piaget" to `cdp-piaget`, "PRT" to `primary`.
   *
   * Only the fields listed are translated, and only for values the table names.
   * Anything unlisted passes through and is validated as usual, so an unmapped
   * topic is rejected with its own label in the message rather than dropped.
   */
  valueAliases?: Record<string, Record<string, string> | undefined>;
  /** Overridden in tests so generated ids and timestamps are deterministic. */
  now?: () => string;
  idPrefix?: string;
}

export interface RejectedRow {
  /** 1-based, counting the header as row 1 — what the spreadsheet shows. */
  row: number;
  issues: Issue[];
  raw: Row;
}

export interface ImportReport {
  accepted: ContentQuestion[];
  rejected: RejectedRow[];
  /** Non-blocking problems on rows that were accepted anyway. */
  warnings: { row: number; issues: Issue[] }[];
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    duplicateIds: number;
    withPyq: number;
  };
}

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

/**
 * "B" / "b" / "2" / "Option B" / "Opt-B" all mean the second option.
 *
 * The `Opt-` spelling matters: it is what the real HTET sheet uses, and the
 * previous pass stripped only the whole word "option", so "opt-b" reduced to
 * "opt-b", matched no letter and no number, and came back empty. Every row in
 * that file would have been rejected for having no correct answer marked.
 */
export function parseAnswer(raw: string, optionCount: number): number[] {
  const cleaned = raw
    .trim()
    .toLowerCase()
    // "option", "opt", and whatever separator follows: "Option B", "Opt-B",
    // "opt. c", "OPT_D". The longer alternative comes first so "option" is not
    // matched as "opt" with a stray "ion" left behind, and there is no trailing
    // `\b` because an underscore is a word character and "opt_d" would not
    // match one.
    .replace(/\b(?:option|opt)[\s._-]*/g, '')
    .trim();
  if (!cleaned) return [];
  // Multiple correct answers arrive as "A,C" or "A and C".
  const parts = cleaned
    .split(/[,;/&]|\band\b/)
    // A trailing full stop or bracket is punctuation, not part of the answer.
    .map((p) => p.trim().replace(/^[.)\]]+|[.)\]]+$/g, '').trim())
    .filter(Boolean);
  const indices = parts.map((part) => {
    const letter = LETTERS.indexOf(part);
    if (letter >= 0 && letter < optionCount) return letter;
    const num = integerFrom(part);
    if (num !== undefined && num >= 1 && num <= optionCount) return num - 1;
    return -1;
  });
  return indices.filter((i) => i >= 0);
}

/**
 * The answer key as the schema stores it: letters, plus why it might be empty.
 *
 * Three things a real answer key does that a single index could not say:
 *
 *   "2 & 4" is a double answer — the commission accepted either, so both
 *   letters go in and grading takes any of them.
 *
 *   "*" is the mark boards print beside a question they withdrew after a
 *   challenge. It has no correct answer and never will, and recording it as one
 *   is how a dropped question came to be marked wrong for everybody.
 *
 *   A blank cell is not the same as a withdrawn question. It means nobody has
 *   established the answer yet, which is `key_pending` — a state somebody has
 *   to resolve, rather than one to be quietly graded around.
 */
export function parseAnswerKey(raw: string): {
  correctAnswers: OptionLabel[];
  answerStatus: AnswerStatus;
} {
  const cleaned = raw.trim();
  if (cleaned === '*' || cleaned.toLowerCase() === 'dropped') {
    return { correctAnswers: [], answerStatus: 'dropped' };
  }
  // An empty cell means nobody has established the answer yet — a real state
  // that somebody resolves later, and importable as a draft.
  if (cleaned === '') return { correctAnswers: [], answerStatus: 'key_pending' };
  const indices = parseAnswer(cleaned, OPTION_LABELS.length);
  // A cell that was filled in but names no option is a transcription error, not
  // a pending key. Calling it 'ok' with no answer is what makes validation
  // reject the row instead of importing a question nothing can mark — quietly
  // filing "F" as "answer not known yet" is how a typo becomes permanent.
  if (indices.length === 0) return { correctAnswers: [], answerStatus: 'ok' };
  // Sorted so {B,D} never arrives as {D,B}: two rows with the same key must
  // compare equal, and the database check is on the set, not the order.
  const labels = [...new Set(indices)]
    .sort((a, b) => a - b)
    .map((i) => OPTION_LABELS[i])
    .filter((l): l is OptionLabel => l !== undefined);
  return { correctAnswers: labels, answerStatus: 'ok' };
}

/**
 * An integer from a cell that may have come back from a spreadsheet as a float.
 *
 * Google Sheets exports a numeric column as "2020.0" and "22.0", so a year and
 * a question number arrive with a decimal point attached. `Number` already
 * copes with the simple cases, but this refuses genuinely fractional values
 * rather than silently truncating them — a year of "2020.5" is a broken cell,
 * not the year 2020, and should be visible as such.
 */
export function integerFrom(raw: string | undefined): number | undefined {
  const value = (raw ?? '').trim();
  if (!value) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Number.isInteger(num) ? num : undefined;
}

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

const parseDifficulty = (raw: string | undefined): QuestionDifficulty => {
  const v = (raw ?? '').trim().toLowerCase();
  return (DIFFICULTIES.find((d) => d === v) ?? 'medium') as QuestionDifficulty;
};

const splitList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);

const bilingual = (en: string | undefined, hi: string | undefined): Bilingual => ({
  en: (en ?? '').trim(),
  hi: (hi ?? '').trim(),
});

/**
 * Maps and validates rows. Writes nothing.
 *
 * The caller decides what to do with `accepted` — stage it, show it, commit it.
 */
export function importQuestions(rows: Row[], options: ImportOptions = {}): ImportReport {
  const {
    defaultExamIds = [],
    defaultLevels = [],
    status = 'draft',
    kind = 'mcq-single',
    columns = DEFAULT_COLUMNS,
    refs,
    valueAliases = {},
    now = () => new Date().toISOString(),
    idPrefix = 'q',
  } = options;

  const headers = Object.keys(rows[0] ?? {});
  const col = resolveColumns(headers, columns);

  // Value aliases are looked up on the same normalised form as headers, so
  // "Socialization Processes" and "Socialization processes" are one entry.
  const aliasTables = new Map<string, Map<string, string>>(
    Object.entries(valueAliases).map(([field, table]) => [
      field,
      new Map(Object.entries(table ?? {}).map(([label, id]) => [normalise(label), id])),
    ]),
  );

  const get = (row: Row, field: string): string | undefined => {
    const header = col[field];
    const raw = header ? row[header] : undefined;
    if (raw === undefined) return undefined;

    const table = aliasTables.get(field);
    if (!table) return raw;
    // An unmapped label is deliberately passed through untouched: validation
    // then rejects the row naming the value, which is what makes a new topic in
    // next year's paper a visible failure rather than a silent mis-filing.
    return table.get(normalise(raw)) ?? raw;
  };

  const accepted: ContentQuestion[] = [];
  const rejected: RejectedRow[] = [];
  const warnings: { row: number; issues: Issue[] }[] = [];
  const seenIds = new Set<string>();
  let duplicateIds = 0;
  let withPyq = 0;

  // A column that is absent from the sheet is a different failure from a cell
  // that is blank, and only the second is a legitimate "answer not known yet".
  // Without this, a file with no answer column at all imported every row as a
  // pending-key draft — thousands of questions nothing can mark, reported as a
  // clean import.
  const missingRequired = (['question', 'answer'] as const).filter((f) => !col[f]);

  rows.forEach((row, i) => {
    const lineNumber = i + 2; // header is row 1

    if (missingRequired.length) {
      rejected.push({
        row: lineNumber,
        issues: missingRequired.map((f) => ({
          severity: 'error' as const,
          code: 'missing.column',
          field: f,
          message: `The sheet has no ${f} column — map one before importing`,
        })),
        raw: row,
      });
      return;
    }
    const timestamp = now();

    const options4 = [
      bilingual(get(row, 'optionA'), get(row, 'optionAHi')),
      bilingual(get(row, 'optionB'), get(row, 'optionBHi')),
      bilingual(get(row, 'optionC'), get(row, 'optionCHi')),
      bilingual(get(row, 'optionD'), get(row, 'optionDHi')),
    ].filter((o) => o.en || o.hi);

    const yearRaw = get(row, 'year');
    const year = integerFrom(yearRaw);
    const examIds = splitList(get(row, 'exam'));
    const resolvedExams = examIds.length ? examIds : defaultExamIds;

    let pyq: PyqRef | undefined;
    if (year !== undefined && yearRaw !== '') {
      pyq = {
        examId: resolvedExams[0] ?? '',
        year,
        paperLabel: get(row, 'paper') || undefined,
        shift: get(row, 'shift') || undefined,
        questionNumber: integerFrom(get(row, 'questionNumber')),
      };
    }

    const marksRaw = get(row, 'marks');
    const negRaw = get(row, 'negativeMarks');
    const levels = splitList(get(row, 'level')) as TeachingLevel[];

    const candidate: ContentQuestion = {
      id: get(row, 'id') || `${idPrefix}-${lineNumber}`,
      status,
      kind,
      examIds: resolvedExams,
      levels: levels.length ? levels : defaultLevels,
      declaredSubjectId: get(row, 'subject') || undefined,
      unitId: get(row, 'unit') || undefined,
      topicId: get(row, 'topic') || undefined,
      subtopicId: get(row, 'subtopic') || undefined,
      paperId: get(row, 'paper') || undefined,
      text: bilingual(get(row, 'question'), get(row, 'questionHi')),
      options: options4,
      ...parseAnswerKey(get(row, 'answer') ?? ''),
      // A withdrawn question's marking convention is not in the sheet — the
      // board announces it separately — so import records the withdrawal and
      // leaves both conventions off until somebody sets them.
      graceMarksAwarded: false,
      excludedFromTotal: false,
      explanation: bilingual(get(row, 'explanation'), get(row, 'explanationHi')),
      questionNo: integerFrom(get(row, 'questionNumber')),
      paperSet: get(row, 'set') || undefined,
      year: integerFrom(get(row, 'year')) ?? pyq?.year,
      difficulty: parseDifficulty(get(row, 'difficulty')),
      marks: marksRaw ? Number(marksRaw) : undefined,
      negativeMarks: negRaw ? Number(negRaw) : undefined,
      pyq,
      source: get(row, 'source') || undefined,
      tags: splitList(get(row, 'tags')),
      conceptTags: splitList(get(row, 'conceptTags')),
      syllabusRef: get(row, 'syllabusRef') || undefined,
      avgTimeSeconds: 45,
      accuracy: 0.5,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const result: ValidationResult = validateQuestion(candidate, refs);
    const issues = [...result.errors];

    // A duplicate id would silently overwrite an existing question on commit.
    if (seenIds.has(candidate.id)) {
      duplicateIds += 1;
      issues.push({
        severity: 'error',
        code: 'duplicate',
        field: 'id',
        message: `Duplicate id "${candidate.id}" — already used earlier in this file`,
      });
    }

    if (issues.length) {
      rejected.push({ row: lineNumber, issues, raw: row });
      return;
    }

    seenIds.add(candidate.id);
    if (candidate.pyq) withPyq += 1;
    if (result.warnings.length) warnings.push({ row: lineNumber, issues: result.warnings });
    accepted.push(candidate);
  });

  return {
    accepted,
    rejected,
    warnings,
    stats: {
      total: rows.length,
      accepted: accepted.length,
      rejected: rejected.length,
      duplicateIds,
      withPyq,
    },
  };
}

/** Convenience for the common case: a CSV file in, a report out. */
export const importQuestionsFromCsv = (csv: string, options?: ImportOptions): ImportReport =>
  importQuestions(parseDelimited(csv), options);

/** A short human summary, for a CLI or the Studio's import screen. */
export const describeReport = (report: ImportReport): string => {
  const { stats } = report;
  const lines = [
    `${stats.accepted} of ${stats.total} rows ready to import` +
      (stats.withPyq ? ` (${stats.withPyq} with previous-year metadata)` : ''),
  ];
  if (stats.rejected) {
    lines.push(`${stats.rejected} rejected:`);
    for (const r of report.rejected.slice(0, 20)) {
      lines.push(`  row ${r.row}: ${r.issues.map((i) => `${i.field} — ${i.message}`).join('; ')}`);
    }
    if (report.rejected.length > 20) {
      lines.push(`  … and ${report.rejected.length - 20} more`);
    }
  }
  if (report.warnings.length) {
    lines.push(`${report.warnings.length} accepted with warnings.`);
  }
  return lines.join('\n');
};
