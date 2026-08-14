import type { Bilingual } from '../types';
import type { ContentNote, ContentQuestion, ContentStatus } from './types';

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
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

/** Ids that already exist, so a reference can be checked rather than assumed. */
export interface ContentRefs {
  examIds: ReadonlySet<string>;
  subjectIds: ReadonlySet<string>;
  topicIds: ReadonlySet<string>;
  unitIds?: ReadonlySet<string>;
  subtopicIds?: ReadonlySet<string>;
}

export const refsFrom = (ids: {
  exams?: string[];
  subjects?: string[];
  topics?: string[];
  units?: string[];
  subtopics?: string[];
}): ContentRefs => ({
  examIds: new Set(ids.exams ?? []),
  subjectIds: new Set(ids.subjects ?? []),
  topicIds: new Set(ids.topics ?? []),
  unitIds: new Set(ids.units ?? []),
  subtopicIds: new Set(ids.subtopics ?? []),
});

const err = (code: string, field: string, message: string): Issue => ({
  severity: 'error',
  code,
  field,
  message,
});

const warn = (code: string, field: string, message: string): Issue => ({
  severity: 'warning',
  code,
  field,
  message,
});

const blank = (s: string | undefined | null): boolean => !s || !s.trim();

/**
 * Checks a bilingual field.
 *
 * English missing is always an error: it is the fallback every screen falls back
 * *to*, so without it the app renders an empty string. Hindi missing is an error
 * only for content being published — the audience reads Hindi, and a silent
 * English substitution (section 20) is the failure being guarded against.
 */
const checkBilingual = (
  value: Bilingual | undefined,
  field: string,
  status: ContentStatus,
): Issue[] => {
  if (!value) return [err('missing', field, `${field} is required`)];
  const issues: Issue[] = [];
  if (blank(value.en)) issues.push(err('missing.en', `${field}.en`, `${field} has no English text`));
  if (blank(value.hi)) {
    issues.push(
      status === 'published'
        ? err('missing.hi', `${field}.hi`, `${field} has no Hindi text and cannot be published`)
        : warn('missing.hi', `${field}.hi`, `${field} has no Hindi text yet`),
    );
  }
  return issues;
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

  // An explanation is wanted, never required. Real previous-year banks arrive as
  // question-and-answer with no commentary; rejecting those rows would reject
  // exactly the material the platform most needs, and a question without an
  // explanation still works for practice. Flag it so it can be filled in later.
  if (!q.explanation || (blank(q.explanation.en) && blank(q.explanation.hi))) {
    issues.push(warn('missing', 'explanation', 'No explanation — learners will only see the answer'));
  } else {
    if (blank(q.explanation.en)) {
      issues.push(warn('missing.en', 'explanation.en', 'Explanation has no English text'));
    }
    if (blank(q.explanation.hi)) {
      issues.push(warn('missing.hi', 'explanation.hi', 'Explanation has no Hindi text'));
    }
  }

  // ---- options and answer
  const options = q.options ?? [];
  if (options.length < 2) {
    issues.push(err('too.few', 'options', 'A question needs at least two options'));
  }
  options.forEach((opt, i) => {
    issues.push(...checkBilingual(opt, `options.${i}`, status));
  });

  const seen = new Map<string, number>();
  options.forEach((opt, i) => {
    const key = (opt?.en ?? '').trim().toLowerCase();
    if (!key) return;
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push(
        warn('duplicate', `options.${i}`, `Option ${i + 1} repeats option ${first + 1}`),
      );
    } else {
      seen.set(key, i);
    }
  });

  const correct = q.correctIndices ?? [];
  if (correct.length === 0) {
    issues.push(err('missing', 'correctIndices', 'No correct answer marked'));
  }
  correct.forEach((idx, i) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
      issues.push(
        err(
          'out.of.range',
          `correctIndices.${i}`,
          `Correct answer ${idx} does not point at one of the ${options.length} options`,
        ),
      );
    }
  });
  if (new Set(correct).size !== correct.length) {
    issues.push(err('duplicate', 'correctIndices', 'The same option is marked correct twice'));
  }
  if (q.kind === 'mcq-single' && correct.length > 1) {
    issues.push(
      err('too.many', 'correctIndices', 'A single-correct question has more than one answer'),
    );
  }

  // ---- placement
  if (blank(q.subjectId)) issues.push(err('missing', 'subjectId', 'Question has no subject'));
  if (blank(q.topicId)) issues.push(err('missing', 'topicId', 'Question has no topic'));
  if (!q.examIds?.length) {
    issues.push(warn('missing', 'examIds', 'Question is not attached to any exam'));
  }

  if (refs) {
    if (q.subjectId && !refs.subjectIds.has(q.subjectId)) {
      issues.push(err('unknown.ref', 'subjectId', `Unknown subject "${q.subjectId}"`));
    }
    if (q.topicId && !refs.topicIds.has(q.topicId)) {
      issues.push(err('unknown.ref', 'topicId', `Unknown topic "${q.topicId}"`));
    }
    if (q.unitId && refs.unitIds?.size && !refs.unitIds.has(q.unitId)) {
      issues.push(err('unknown.ref', 'unitId', `Unknown unit "${q.unitId}"`));
    }
    if (q.subtopicId && refs.subtopicIds?.size && !refs.subtopicIds.has(q.subtopicId)) {
      issues.push(err('unknown.ref', 'subtopicId', `Unknown subtopic "${q.subtopicId}"`));
    }
    (q.examIds ?? []).forEach((id, i) => {
      if (!refs.examIds.has(id)) {
        issues.push(err('unknown.ref', `examIds.${i}`, `Unknown exam "${id}"`));
      }
    });
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
