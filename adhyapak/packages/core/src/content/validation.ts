import type { Bilingual, MaybeBilingual, QuestionDifficulty } from '../types';
import { OPTION_LABELS } from '../types';
import type { AnswerStatus } from '../types';

/** Option labels in order, so an error can name B rather than "option 1". */
const LABELS = OPTION_LABELS;

const DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
import type { ContentNote, ContentQuestion, ContentStatus } from './types';
import { nearest } from './duplicates';

/**
 * Content validation.
 *
 * Import is the moment bad data becomes permanent, so every rule the brief lists
 * in section 26 is enforced here, once, in pure TypeScript — usable from the
 * importer, from the Studio before a save, and from a test.
 *
 * Severity is the whole design. A question with no Hindi is publishable in a
 * pinch; a question whose correct answer points past the end of its options is
 * not. Errors block. Warnings are recorded and let the row through.
 */

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  severity: IssueSeverity;
  /** Stable machine-readable code, so callers can filter without matching prose. */
  code: string;
  /** Field the problem is attached to, dotted for nesting: 'options.2.hi'. */
  field: string;
  message: string;
  /**
   * The value the importer thinks was meant, when a typo is the likely cause.
   * A rejection that only says `Unknown subject "chemsitry"` leaves someone to
   * find the right spelling across a 4,000-row file; naming it makes the fix a
   * keystroke. Never applied automatically — it is a suggestion, not a guess
   * acted upon.
   */
  suggestion?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

/** Ids that already exist, so a reference can be checked rather than assumed. */
export interface ContentRefs {
  /** Which subject each topic belongs to, for cross-checking the sheet's own column. */
  subjectOfTopic?: Map<string, string>;
  examIds: ReadonlySet<string>;
  subjectIds: ReadonlySet<string>;
  topicIds: ReadonlySet<string>;
  unitIds?: ReadonlySet<string>;
  subtopicIds?: ReadonlySet<string>;
  levels?: ReadonlySet<string>;
}

export const refsFrom = (ids: {
  exams?: string[];
  subjects?: string[];
  topics?: string[];
  units?: string[];
  subtopics?: string[];
  levels?: string[];
  /** [topicId, subjectId] pairs, so a sheet's subject column can be cross-checked. */
  topicSubjects?: [string, string][];
}): ContentRefs => ({
  examIds: new Set(ids.exams ?? []),
  subjectIds: new Set(ids.subjects ?? []),
  topicIds: new Set(ids.topics ?? []),
  unitIds: new Set(ids.units ?? []),
  subtopicIds: new Set(ids.subtopics ?? []),
  levels: new Set(ids.levels ?? []),
  subjectOfTopic: new Map(ids.topicSubjects ?? []),
});

const err = (code: string, field: string, message: string, suggestion?: string): Issue => ({
  severity: 'error',
  code,
  field,
  message,
  ...(suggestion ? { suggestion } : {}),
});

/** An unknown-reference error that names the closest id that does exist. */
const unknownRef = (
  field: string,
  value: string,
  label: string,
  known: ReadonlySet<string>,
): Issue => err('unknown.ref', field, `Unknown ${label} "${value}"`, nearest(value, [...known]));

const warn = (code: string, field: string, message: string): Issue => ({
  severity: 'warning',
  code,
  field,
  message,
});

const blank = (s: string | undefined | null): boolean => !s || !s.trim();

/**
 * Checks a field that carries text in one or both languages.
 *
 * One language is enough. The bank genuinely holds Haryana GK written only in
 * Hindi, and requiring English would reject exactly the material the audience
 * most needs. What is rejected is a field with nothing in it at all — and,
 * separately in `validateQuestion`, options written in a language the question
 * is not asked in, which is what a half-finished translation produces.
 */
const checkBilingual = (
  value: MaybeBilingual | undefined,
  field: string,
  _status: ContentStatus,
): Issue[] => {
  if (!value || (blank(value.en) && blank(value.hi))) {
    return [err('missing', field, `${field} is missing in both languages`)];
  }
  return [];
};

/* -------------------------------------------------------------- question */

export function validateQuestion(
  q: Partial<ContentQuestion>,
  refs?: ContentRefs,
): ValidationResult {
  const issues: Issue[] = [];
  const status: ContentStatus = q.status ?? 'draft';

  if (blank(q.id)) issues.push(err('missing', 'id', 'Question has no id'));

  issues.push(...checkBilingual(q.text, 'text', status));

  const options = q.options ?? [];
  const answerStatus: AnswerStatus = q.answerStatus ?? 'ok';

  // A question needs two answerable options. "Answerable" means there is text
  // to render, in either language — screens fall back through `inLang`, so an
  // option carried only in English still appears for a Hindi reader.
  //
  // This is deliberately weaker than "options in the same language as the
  // question", which is what the schema was first specified to require. The
  // real HTET CDP sheet is bilingual in its questions and explanations and
  // English-only in its options, because the options are proper nouns —
  // "Piaget – Cognitive Development Theory" is not translated by anybody. That
  // rule rejected 630 correct rows. The half-finished translation it was meant
  // to catch is still reported, as a warning, below.
  for (const [i, name] of [[0, 'A'], [1, 'B']] as const) {
    if (blank(options[i]?.en) && blank(options[i]?.hi)) {
      issues.push(err('missing', `options.${i}`, `Option ${name} is empty in both languages`));
    }
  }

  // The translation gap, reported rather than refused: a question asked in one
  // language whose options exist only in the other. Worth an editor's attention
  // and never worth throwing the question away over.
  for (const lang of ['en', 'hi'] as const) {
    if (blank(q.text?.[lang])) continue;
    const label = lang === 'en' ? 'English' : 'Hindi';
    const untranslated = [0, 1].filter(
      (i) => !blank(options[i]?.en) || !blank(options[i]?.hi),
    ).filter((i) => blank(options[i]?.[lang]));
    if (untranslated.length) {
      issues.push(
        warn(
          'untranslated',
          'options',
          `Question is in ${label} but its options are not — learners reading ${label} will see the other language`,
        ),
      );
      break;
    }
  }

  const seen = new Map<string, number>();
  options.forEach((opt, i) => {
    const key = ((opt?.en ?? opt?.hi) ?? '').trim().toLowerCase();
    if (!key) return;
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push(
        warn('duplicate', `options.${i}`, `Option ${LABELS[i]} repeats option ${LABELS[first]}`),
      );
    } else {
      seen.set(key, i);
    }
  });

  // ---- the answer key
  const correct = q.correctAnswers ?? [];

  if (answerStatus === 'ok' && correct.length === 0) {
    issues.push(
      err(
        'missing',
        'correctAnswers',
        "answer_status is 'ok' but no valid correct answer given",
      ),
    );
  }
  if (answerStatus !== 'ok' && correct.length > 0) {
    issues.push(
      err(
        'conflict',
        'correctAnswers',
        `answer_status is '${answerStatus}' but a correct answer is given`,
      ),
    );
  }

  correct.forEach((label) => {
    const i = LABELS.indexOf(label);
    if (i === -1) {
      issues.push(
        err('invalid', 'correctAnswers', `Correct answer '${label}' is not one of A, B, C or D`),
      );
      return;
    }
    // The check that catches a key of 'C' on a two-option question — the defect
    // that reads to a learner as being marked wrong for the right answer.
    if (blank(options[i]?.en) && blank(options[i]?.hi)) {
      issues.push(
        err(
          'empty.option',
          'correctAnswers',
          `Correct answer includes ${label} but Option ${label} is empty`,
        ),
      );
    }
  });

  if (new Set(correct).size !== correct.length) {
    issues.push(err('duplicate', 'correctAnswers', 'The same option is marked correct twice'));
  }

  // ---- explanation
  //
  // Required when the answer is known, and not otherwise: writing an
  // explanation for a question whose correct answer nobody has established
  // would be inventing reasoning to fit a guess.
  if (answerStatus === 'ok') {
    if (!q.explanation || (blank(q.explanation.en) && blank(q.explanation.hi))) {
      issues.push(err('missing', 'explanation', 'Explanation is missing in both languages'));
    }
  }

  // ---- difficulty
  if (blank(q.difficulty)) {
    issues.push(err('missing', 'difficulty', 'Difficulty is not set'));
  } else if (!DIFFICULTIES.includes(q.difficulty as QuestionDifficulty)) {
    issues.push(
      err('invalid', 'difficulty', `Difficulty '${q.difficulty}' is not easy, medium or hard`),
    );
  }

  // ---- placement
  //
  // A missing topic is a warning, not a rejection: the row lands as a draft and
  // somebody classifies it later. Rejecting it would throw away a correctly
  // transcribed question over a column the sheet may simply not have had.
  if (blank(q.topicId)) {
    issues.push(warn('missing', 'topicId', "Topic not set — can't be published until it has one"));
  }
  if (q.year !== undefined && (q.year < 2000 || q.year > 2030)) {
    issues.push(warn('out.of.range', 'year', `Year ${q.year} is outside 2000-2030`));
  }
  if (!q.examIds?.length) {
    issues.push(warn('missing', 'examIds', 'Question is not attached to any exam'));
  }

  if (refs) {
    if (q.topicId && !refs.topicIds.has(q.topicId)) {
      issues.push(unknownRef('topicId', q.topicId, 'topic', refs.topicIds));
    }
    // The sheet still has a subject column, but the schema no longer stores one:
    // subject is whatever the topic belongs to. Ignoring the column silently
    // would let a row filed under the wrong subject import looking correct, so
    // the two are compared and a disagreement is reported. The topic wins,
    // because it is the value that actually decides where the question lands.
    if (q.declaredSubjectId && q.topicId) {
      const actual = refs.subjectOfTopic?.get(q.topicId);
      if (actual && actual !== q.declaredSubjectId) {
        issues.push(
          warn(
            'mismatch',
            'subjectId',
            `Sheet says subject '${q.declaredSubjectId}' but topic '${q.topicId}' belongs to '${actual}' — the topic wins`,
          ),
        );
      }
    }
    if (q.unitId && refs.unitIds?.size && !refs.unitIds.has(q.unitId)) {
      issues.push(unknownRef('unitId', q.unitId, 'unit', refs.unitIds));
    }
    if (q.subtopicId && refs.subtopicIds?.size && !refs.subtopicIds.has(q.subtopicId)) {
      issues.push(unknownRef('subtopicId', q.subtopicId, 'subtopic', refs.subtopicIds));
    } else if (q.subtopicId && !refs.subtopicIds?.size) {
      // `subtopic_id` is a foreign key. When the taxonomy defines no subtopics
      // at all, any value here is unresolvable — and a real source file puts
      // prose in that column ("Basic processes of teaching and learning"), which
      // used to sail through validation and fail the whole batch on a Postgres
      // constraint the operator cannot act on. Saying it per row, by name, is
      // the point of validating before writing.
      issues.push(
        err(
          'unknown.ref',
          'subtopicId',
          `No subtopic ids exist in this taxonomy, so "${q.subtopicId}" cannot be one. ` +
            'Map that column to Tags, or leave it unmapped.',
        ),
      );
    }
    (q.examIds ?? []).forEach((id, i) => {
      if (!refs.examIds.has(id)) {
        issues.push(unknownRef(`examIds.${i}`, id, 'exam', refs.examIds));
      }
    });
    // Levels are a closed set, so a typo there is catchable the same way.
    if (refs.levels?.size) {
      (q.levels ?? []).forEach((level, i) => {
        if (!refs.levels!.has(level)) {
          issues.push(unknownRef(`levels.${i}`, level, 'level', refs.levels!));
        }
      });
    }
  }

  // ---- marks
  if (q.marks !== undefined && !(q.marks > 0)) {
    issues.push(err('invalid', 'marks', 'Marks must be greater than zero'));
  }
  if (q.negativeMarks !== undefined && q.negativeMarks < 0) {
    issues.push(
      err('invalid', 'negativeMarks', 'Negative marking is stored as a positive amount to deduct'),
    );
  }

  // ---- PYQ metadata
  if (q.pyq) {
    const year = q.pyq.year;
    const thisYear = new Date().getUTCFullYear();
    if (!Number.isInteger(year) || year < 1990 || year > thisYear + 1) {
      issues.push(err('invalid', 'pyq.year', `Implausible exam year "${year}"`));
    }
    if (blank(q.pyq.examId)) {
      issues.push(err('missing', 'pyq.examId', 'A previous-year question must name its exam'));
    } else if (refs && !refs.examIds.has(q.pyq.examId)) {
      issues.push(err('unknown.ref', 'pyq.examId', `Unknown exam "${q.pyq.examId}"`));
    }
  }

  return split(issues);
}

/* ----------------------------------------------------------------- notes */

export function validateNote(n: Partial<ContentNote>, refs?: ContentRefs): ValidationResult {
  const issues: Issue[] = [];
  const status: ContentStatus = n.status ?? 'draft';

  if (blank(n.id)) issues.push(err('missing', 'id', 'Note has no id'));
  issues.push(...checkBilingual(n.title, 'title', status));
  if (blank(n.subjectId)) issues.push(err('missing', 'subjectId', 'Note has no subject'));

  if (refs && n.subjectId && !refs.subjectIds.has(n.subjectId)) {
    issues.push(err('unknown.ref', 'subjectId', `Unknown subject "${n.subjectId}"`));
  }
  if (refs && n.topicId && !refs.topicIds.has(n.topicId)) {
    issues.push(err('unknown.ref', 'topicId', `Unknown topic "${n.topicId}"`));
  }
  if (n.fileUrl && !/^https?:\/\//i.test(n.fileUrl)) {
    issues.push(err('invalid', 'fileUrl', 'File URL must be absolute'));
  }
  if (status === 'published' && !n.fileUrl) {
    issues.push(
      warn('missing', 'fileUrl', 'No PDF attached; the reader will render sections instead'),
    );
  }
  return split(issues);
}

/* ----------------------------------------------------------------- tests */

export interface TestDraft {
  id?: string;
  title?: Bilingual;
  examId?: string;
  durationMinutes?: number;
  marksPerQuestion?: number;
  negativeMarking?: number;
  sections?: { title?: Bilingual; questionIds?: string[] }[];
}

/** Checks a test before publishing: section 26's second list. */
export function validateTest(t: TestDraft, knownQuestionIds?: ReadonlySet<string>): ValidationResult {
  const issues: Issue[] = [];

  if (blank(t.id)) issues.push(err('missing', 'id', 'Test has no id'));
  issues.push(...checkBilingual(t.title, 'title', 'published'));
  if (blank(t.examId)) issues.push(err('missing', 'examId', 'Test is not attached to an exam'));

  if (!(Number(t.durationMinutes) > 0)) {
    issues.push(err('invalid', 'durationMinutes', 'Duration must be greater than zero'));
  }
  if (!(Number(t.marksPerQuestion) > 0)) {
    issues.push(err('invalid', 'marksPerQuestion', 'Marks per question must be greater than zero'));
  }
  if (t.negativeMarking !== undefined && t.negativeMarking < 0) {
    issues.push(err('invalid', 'negativeMarking', 'Negative marking must not be below zero'));
  }
  if (
    t.negativeMarking !== undefined &&
    t.marksPerQuestion !== undefined &&
    t.negativeMarking > t.marksPerQuestion
  ) {
    issues.push(
      warn(
        'suspicious',
        'negativeMarking',
        'A wrong answer costs more than a right one earns — check this is intended',
      ),
    );
  }

  const sections = t.sections ?? [];
  if (sections.length === 0) issues.push(err('missing', 'sections', 'Test has no sections'));

  const everywhere = new Map<string, string>();
  sections.forEach((section, si) => {
    const ids = section.questionIds ?? [];
    if (ids.length === 0) {
      issues.push(err('empty', `sections.${si}`, `Section ${si + 1} has no questions`));
    }
    ids.forEach((id, qi) => {
      const field = `sections.${si}.questionIds.${qi}`;
      if (blank(id)) {
        issues.push(err('missing', field, 'Empty question reference'));
        return;
      }
      const seenIn = everywhere.get(id);
      if (seenIn) {
        issues.push(err('duplicate', field, `Question "${id}" already appears in ${seenIn}`));
      } else {
        everywhere.set(id, `section ${si + 1}`);
      }
      if (knownQuestionIds && !knownQuestionIds.has(id)) {
        issues.push(err('unknown.ref', field, `Question "${id}" does not exist`));
      }
    });
  });

  return split(issues);
}

const split = (issues: Issue[]): ValidationResult => {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return { ok: errors.length === 0, errors, warnings };
};
