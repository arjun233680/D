import type { Question } from '../types';
import { getTopic } from './subjects';

/**
 * The bundled question bank — now empty, and deliberately so.
 *
 * This file used to carry 67 hand-written bilingual questions so the app had
 * something to show with no database behind it. They are gone: 0011 rebuilt the
 * question schema from scratch, and keeping a second copy of the bank in
 * TypeScript would have meant maintaining the same content in two shapes, one
 * of which nothing could import into, publish from, or review.
 *
 * The API below is unchanged, because a dozen screens and the test engine call
 * it. Every function now answers "nothing", which is the truthful answer for a
 * build with no database: `isBackendConfigured()` is what those screens branch
 * on, and the empty states it drives were already written.
 *
 * Questions reach the app through `api/repository.ts` from here on.
 */

/** Empty. Questions live in the database; see `api/repository.ts`. */
export const QUESTIONS: Question[] = [];

export const QUESTION_BY_ID = new Map<string, Question>(QUESTIONS.map((q) => [q.id, q]));

export const getQuestion = (id: string) => QUESTION_BY_ID.get(id);

export const getQuestions = (ids: string[]): Question[] =>
  ids.map((id) => QUESTION_BY_ID.get(id)).filter((q): q is Question => Boolean(q));

/**
 * Subject is resolved through the topic rather than stored on the question.
 *
 * The flat schema dropped `subject_id` from `questions`: a denormalised copy
 * could disagree with `topics.subject_id`, and did. One answer to which subject
 * a question belongs to is worth the extra lookup.
 */
export const questionsBySubject = (subjectId: string) =>
  QUESTIONS.filter((q) => q.topicId && getTopic(q.topicId)?.subjectId === subjectId);

export const questionsByTopic = (topicId: string) => QUESTIONS.filter((q) => q.topicId === topicId);

export const questionsByExam = (examId: string) =>
  QUESTIONS.filter((q) => q.examIds.includes(examId));

/** A question is a previous-year one when it carries the year it was asked in. */
export const previousYearQuestions = () => QUESTIONS.filter((q) => q.year !== undefined);
