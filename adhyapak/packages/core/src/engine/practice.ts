import type { PracticeSessionResult, Question, QuestionDifficulty } from '../types';
import { QUESTIONS } from '../data/questions';
import { ALL_TOPICS, getTopic } from '../data/subjects';

/**
 * What a practice screen asks for.
 *
 * Every field is optional and they compose, so one filter type serves
 * "HTET → TGT → Science", "…→ Chemistry → Mole Concept" and
 * "…→ Science → PYQ → 2024" without a screen ever building its own query.
 * Levels the bundled data does not carry (unit, subtopic, level) are matched
 * against the database and ignored offline — see `buildPracticeSet`.
 */
export interface PracticeFilter {
  examId?: string;
  /** Teaching post: primary, upper-primary, secondary, senior-secondary. */
  level?: string;
  subjectId?: string;
  /** Chapter between subject and topic. Database-backed content only. */
  unitId?: string;
  topicId?: string;
  subtopicId?: string;
  /**
   * The paper a question was asked in.
   *
   * There is no "TGT paper" — there are twelve — so a paper is the only filter
   * that names a real set of questions. Absent from the bundled data, which
   * carries no provenance at all.
   */
  paperId?: string;
  difficulty?: QuestionDifficulty;
  /** Only previous-year questions. */
  pyqOnly?: boolean;
  /** A specific paper year — implies pyqOnly. */
  year?: number;
  /** Morning/evening sitting of that paper. */
  shift?: string;
  /** Restrict to these ids — used for bookmarks and module practice. */
  ids?: string[];
  /**
   * Return the questions in the order they were printed.
   *
   * A full-paper rehearsal is not a shuffle: question 42 follows question 41,
   * and a learner comparing their attempt against the real paper needs the
   * numbers to line up. Ignored offline, where the bundled bank has no
   * question numbers.
   */
  orderByQuestionNo?: boolean;
  limit?: number;
  /** Rows to skip, for paging a large bank. */
  offset?: number;
}

/**
 * The offline half of `listQuestions`.
 *
 * The bundled bank predates the unit/subtopic hierarchy and records provenance
 * as prose, so some filters cannot be applied here at all. There are two honest
 * responses to that and this uses both, depending on what the filter claims.
 *
 * A structural filter — unit, subtopic, teaching level — is dropped. The result
 * is wider than asked for, but every question in it is still a real question of
 * that subject and exam, and nothing on screen asserts otherwise.
 *
 * A provenance filter — `year`, `shift` — returns nothing. Those name a
 * specific sitting of a specific paper, and the screen prints that name next to
 * the count. Returning the 2023 questions for `year=2019` would put "2019"
 * above questions from another paper, which is worse than an empty state: the
 * empty state says the paper has not been collected yet, and that is true.
 */
export const buildPracticeSet = (filter: PracticeFilter = {}): Question[] => {
  // Nothing in the bundle carries a structured year or shift, so a filter on
  // either can only be answered with "none collected".
  if (filter.year !== undefined || filter.shift !== undefined) return [];

  let pool = QUESTIONS;
  if (filter.ids) {
    const wanted = new Set(filter.ids);
    pool = pool.filter((q) => wanted.has(q.id));
  }
  if (filter.examId) pool = pool.filter((q) => q.examIds.includes(filter.examId!));
  if (filter.subjectId) pool = pool.filter((q) => q.topicId !== undefined && getTopic(q.topicId)?.subjectId === filter.subjectId);
  if (filter.topicId) pool = pool.filter((q) => q.topicId === filter.topicId);
  if (filter.difficulty) pool = pool.filter((q) => q.difficulty === filter.difficulty);
  if (filter.pyqOnly) pool = pool.filter((q) => q.year !== undefined);
  const start = filter.offset ?? 0;
  return filter.limit ? pool.slice(start, start + filter.limit) : pool.slice(start);
};

export interface PracticeSummary {
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  avgTimeSeconds: number;
  /** Topic ids ordered worst-first, for the "revise these" strip. */
  reviseTopicIds: string[];
}

export const summarisePractice = (
  questions: Question[],
  results: PracticeSessionResult[],
): PracticeSummary => {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const attempted = results.filter((r) => r.selectedIndex !== null);
  const correct = attempted.filter((r) => r.correct).length;
  const incorrect = attempted.length - correct;
  const totalTime = results.reduce((sum, r) => sum + r.timeSpentMs, 0);

  const wrongByTopic = new Map<string, number>();
  for (const r of attempted) {
    if (r.correct) continue;
    const topicId = byId.get(r.questionId)?.topicId;
    if (topicId) wrongByTopic.set(topicId, (wrongByTopic.get(topicId) ?? 0) + 1);
  }

  return {
    total: questions.length,
    attempted: attempted.length,
    correct,
    incorrect,
    accuracy: attempted.length ? Math.round((correct / attempted.length) * 100) : 0,
    avgTimeSeconds: results.length ? Math.round(totalTime / results.length / 1000) : 0,
    reviseTopicIds: [...wrongByTopic.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topicId]) => topicId)
      .slice(0, 5),
  };
};

/**
 * Topics worth practising next: highest exam weightage first, restricted to
 * subjects that actually appear in the learner's target paper.
 *
 * Topics with no measured weightage sort last rather than first — an absent
 * figure means nobody has analysed those papers yet, which is not a reason to
 * recommend them ahead of a topic known to carry 18% of the marks.
 */
export const recommendedTopics = (subjectIds: string[], limit = 6) =>
  ALL_TOPICS.filter((t) => subjectIds.includes(t.subjectId))
    .sort((a, b) => (b.weightage ?? -1) - (a.weightage ?? -1))
    .slice(0, limit);

/** Consecutive days ending today. Feeds the streak flame on the home screen. */
export const currentStreak = (activeDates: string[], today: Date = new Date()): number => {
  const days = new Set(activeDates);
  let streak = 0;
  const cursor = new Date(today);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
