import type { Bilingual, QuestionDifficulty, Question, TeachingLevel } from '../types';

/**
 * The content model.
 *
 * `Question` in ../types is what a *screen* renders: the minimum a practice card
 * or a test player needs. This file describes what a question *is* in the
 * library — where it sits in the syllabus, which paper it came from, whether it
 * has been reviewed, who to blame for it. A bulk import writes these; screens
 * never see them, because `toQuestion` narrows one down to the render shape.
 *
 * Keeping the two apart is what lets a 20,000-question HTET bank land in the
 * database without a single component changing.
 *
 * The hierarchy is
 *
 *   exam → level → subject → unit → topic → subtopic → content
 *
 * with unit and subtopic optional throughout. Different exams organise their
 * syllabus at different depths, and a model that forces every exam to the same
 * depth would need a special case per exam — exactly what section 34 of the
 * brief rules out.
 */

/* ------------------------------------------------------------- lifecycle */

/**
 * Editorial state. Nothing reaches a learner before `published`, and nothing is
 * ever destroyed — `archived` is the terminal state, because a question that
 * turned out to be wrong is still evidence about what an exam asked.
 */
export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export const PUBLISHED: ContentStatus = 'published';

/** Only published content is ever served to a learner. */
export const isLive = (status: ContentStatus): boolean => status === 'published';

/* ------------------------------------------------------------- hierarchy */

/** A chapter/unit: the level between a subject and its topics. */
export interface Unit {
  id: string;
  subjectId: string;
  name: Bilingual;
  /** Position within the subject. Syllabi are ordered, not alphabetical. */
  order: number;
}

/** The finest addressable level. "Mole Concept" inside "Some Basic Concepts". */
export interface Subtopic {
  id: string;
  topicId: string;
  name: Bilingual;
  order: number;
}

/* ---------------------------------------------------------- PYQ metadata */

/**
 * Where a previous-year question actually came from.
 *
 * Structured, never prose. The old model carried a string like
 * "CTET Dec 2022 Paper 1", which reads fine and answers no question: you cannot
 * filter by year, count repeats across shifts, or chart topic frequency without
 * parsing English back apart.
 */
export interface PyqRef {
  examId: string;
  year: number;
  /** Exam-defined session, e.g. 'december', 'phase-2'. Optional: many exams run once. */
  session?: string;
  /** References ExamPaper.id when the paper is modelled; a label otherwise. */
  paperId?: string;
  paperLabel?: string;
  /** Morning/evening sittings of the same paper. */
  shift?: string;
  /** Position in the original paper, where known. */
  questionNumber?: number;
}

/** Human-readable form of a PYQ reference — for badges and citations. */
export const formatPyq = (pyq: PyqRef, examShortName?: string): string =>
  [
    examShortName ?? pyq.examId.toUpperCase(),
    pyq.session ? capitalise(pyq.session) : '',
    String(pyq.year),
    pyq.paperLabel ?? '',
    pyq.shift ? `Shift ${pyq.shift}` : '',
  ]
    .filter(Boolean)
    .join(' ');

const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/* -------------------------------------------------------------- question */

/**
 * Question shapes the platform can hold.
 *
 * Only `mcq-single` is rendered today. The rest exist so an import does not have
 * to lie about what it is carrying: a stored assertion-reason question that no
 * screen renders yet is recoverable, whereas one flattened into an MCQ on the
 * way in is lost.
 */
export type QuestionKind =
  | 'mcq-single'
  | 'mcq-multiple'
  | 'assertion-reason'
  | 'match-the-following'
  | 'numerical'
  | 'true-false'
  | 'comprehension'
  | 'image-based'
  | 'statement-based';

/** Kinds the apps can render right now. Everything else stores but does not serve. */
export const RENDERABLE_KINDS: QuestionKind[] = ['mcq-single', 'true-false', 'statement-based'];

export interface ContentQuestion {
  id: string;
  status: ContentStatus;
  kind: QuestionKind;

  /** Placement. `examIds` may be empty for a question that is syllabus-generic. */
  examIds: string[];
  levels: TeachingLevel[];
  subjectId: string;
  unitId?: string;
  topicId: string;
  subtopicId?: string;

  text: Bilingual;
  options: Bilingual[];
  /** Indices into `options`. One entry for single-correct; several for multiple. */
  correctIndices: number[];
  explanation: Bilingual;

  difficulty: QuestionDifficulty;
  /** Per-question override; the test's own marks apply when absent. */
  marks?: number;
  negativeMarks?: number;

  /** Set when this question appeared in a real paper. */
  pyq?: PyqRef;
  /** Free-text provenance for non-PYQ material — a book, a syllabus doc. */
  source?: string;

  tags: string[];
  /** Concepts the question tests, for weak-area analysis across topics. */
  conceptTags: string[];
  /** Reference into the official syllabus, e.g. 'HTET-TGT-SCI-3.2'. */
  syllabusRef?: string;

  /** Observed statistics. Defaults are placeholders until attempts accumulate. */
  avgTimeSeconds: number;
  accuracy: number;

  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Narrows a library question to the shape screens render.
 *
 * Returns null for anything a screen cannot honestly display — an unpublished
 * question, or a kind with no renderer — so a caller cannot accidentally put
 * draft content in front of a learner.
 */
export const toQuestion = (
  q: ContentQuestion,
  examShortName?: string,
): Question | null => {
  if (!isLive(q.status)) return null;
  if (!RENDERABLE_KINDS.includes(q.kind)) return null;
  const correctIndex = q.correctIndices[0];
  if (correctIndex === undefined) return null;

  return {
    id: q.id,
    subjectId: q.subjectId,
    topicId: q.topicId,
    examIds: q.examIds,
    text: q.text,
    options: q.options,
    correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
    previousYear: q.pyq ? formatPyq(q.pyq, examShortName) : undefined,
    avgTimeSeconds: q.avgTimeSeconds,
    accuracy: q.accuracy,
  };
};

/** Lifts a legacy seed question into the library model, for a one-way migration. */
export const fromQuestion = (q: Question, now = new Date().toISOString()): ContentQuestion => ({
  id: q.id,
  status: 'published',
  kind: 'mcq-single',
  examIds: q.examIds,
  levels: [],
  subjectId: q.subjectId,
  topicId: q.topicId,
  text: q.text,
  options: q.options,
  correctIndices: [q.correctIndex],
  explanation: q.explanation,
  difficulty: q.difficulty,
  // The legacy field is prose, so it cannot be parsed into a PyqRef without
  // guessing. It is preserved as provenance rather than invented as metadata.
  source: q.previousYear,
  tags: [],
  conceptTags: [],
  avgTimeSeconds: q.avgTimeSeconds,
  accuracy: q.accuracy,
  createdAt: now,
  updatedAt: now,
});

/* ----------------------------------------------------------------- notes */

/** A note in the library. `Note` in ../types is what the PDF reader renders. */
export interface ContentNote {
  id: string;
  status: ContentStatus;
  title: Bilingual;
  examIds: string[];
  levels: TeachingLevel[];
  subjectId: string;
  unitId?: string;
  topicId?: string;
  subtopicId?: string;
  /** Uploaded PDF. When absent the reader renders `sections`. */
  fileUrl?: string;
  /** Bumped on every edit so a cached copy can be invalidated. */
  version: number;
  order: number;
  source?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
