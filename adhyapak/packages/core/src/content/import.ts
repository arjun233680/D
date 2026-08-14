import type { Bilingual, QuestionDifficulty, TeachingLevel } from '../types';
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
 * Excel and PDF are deliberately out of scope: both need a parser this package
 * cannot carry (core has no dependencies, by design). Convert to CSV, or hand
 * `importQuestions` rows from whatever parser the caller already has — the row
 * shape is a plain `Record<string, string>`.
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
 * ignores spaces, underscores and hyphens, so "Option A", "option_a" and
 * "OPTIONA" are one column.
 */
export interface ColumnMap {
  [canonical: string]: string[];
}

export const DEFAULT_COLUMNS: ColumnMap = {
  id: ['id', 'questionid', 'qid'],
  exam: ['exam', 'examid', 'exams'],
  level: ['level', 'post', 'examlevel'],
  subject: ['subject', 'subjectid'],
  unit: ['unit', 'chapter', 'unitid', 'chapterid'],
  topic: ['topic', 'topicid'],
  subtopic: ['subtopic', 'subtopicid', 'concept'],
  question: ['question', 'questionen', 'questiontext', 'questiontexten', 'q'],
  questionHi: ['questionhi', 'questionhindi', 'prashn', 'questiontexthi'],
  optionA: ['optiona', 'a', 'opt1', 'option1'],
  optionB: ['optionb', 'b', 'opt2', 'option2'],
  optionC: ['optionc', 'c', 'opt3', 'option3'],
  optionD: ['optiond', 'd', 'opt4', 'option4'],
  optionAHi: ['optionahi', 'ahi', 'option1hi'],
  optionBHi: ['optionbhi', 'bhi', 'option2hi'],
  optionCHi: ['optionchi', 'chi', 'option3hi'],
  optionDHi: ['optiondhi', 'dhi', 'option4hi'],
  answer: ['correctanswer', 'answer', 'correct', 'ans', 'key'],
  explanation: ['explanation', 'explanationen', 'solution', 'reason'],
  explanationHi: ['explanationhi', 'solutionhi', 'vyakhya'],
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

const normalise = (s: string): string => s.toLowerCase().replace(/[\s_\-.]/g, '');

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

/** "B" / "b" / "2" / "Option B" all mean the second option. */
export function parseAnswer(raw: string, optionCount: number): number[] {
  const cleaned = raw.trim().toLowerCase().replace(/option/g, '').trim();
  if (!cleaned) return [];
  // Multiple correct answers arrive as "A,C" or "A and C".
  const parts = cleaned.split(/[,;/&]|\band\b/).map((p) => p.trim()).filter(Boolean);
  const indices = parts.map((part) => {
    const letter = LETTERS.indexOf(part);
    if (letter >= 0 && letter < optionCount) return letter;
    const num = Number(part);
    if (Number.isInteger(num) && num >= 1 && num <= optionCount) return num - 1;
    return -1;
  });
  return indices.filter((i) => i >= 0);
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
    now = () => new Date().toISOString(),
    idPrefix = 'q',
  } = options;

  const headers = Object.keys(rows[0] ?? {});
  const col = resolveColumns(headers, columns);
  const get = (row: Row, field: string): string | undefined => {
    const header = col[field];
    return header ? row[header] : undefined;
  };

  const accepted: ContentQuestion[] = [];
  const rejected: RejectedRow[] = [];
  const warnings: { row: number; issues: Issue[] }[] = [];
  const seenIds = new Set<string>();
  let duplicateIds = 0;
  let withPyq = 0;

  rows.forEach((row, i) => {
    const lineNumber = i + 2; // header is row 1
    const timestamp = now();

    const options4 = [
      bilingual(get(row, 'optionA'), get(row, 'optionAHi')),
      bilingual(get(row, 'optionB'), get(row, 'optionBHi')),
      bilingual(get(row, 'optionC'), get(row, 'optionCHi')),
      bilingual(get(row, 'optionD'), get(row, 'optionDHi')),
    ].filter((o) => o.en || o.hi);

    const yearRaw = get(row, 'year');
    const year = yearRaw ? Number(yearRaw) : undefined;
    const examIds = splitList(get(row, 'exam'));
    const resolvedExams = examIds.length ? examIds : defaultExamIds;

    let pyq: PyqRef | undefined;
    if (year !== undefined && yearRaw !== '') {
      pyq = {
        examId: resolvedExams[0] ?? '',
        year,
        paperLabel: get(row, 'paper') || undefined,
        shift: get(row, 'shift') || undefined,
        questionNumber: get(row, 'questionNumber')
          ? Number(get(row, 'questionNumber'))
          : undefined,
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
      subjectId: get(row, 'subject') ?? '',
      unitId: get(row, 'unit') || undefined,
      topicId: get(row, 'topic') ?? '',
      subtopicId: get(row, 'subtopic') || undefined,
      text: bilingual(get(row, 'question'), get(row, 'questionHi')),
      options: options4,
      correctIndices: parseAnswer(get(row, 'answer') ?? '', options4.length),
      explanation: bilingual(get(row, 'explanation'), get(row, 'explanationHi')),
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
