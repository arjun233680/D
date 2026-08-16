import type { Batch } from '../types';

/** Unacademy-style live batches: a dated cohort with a fixed schedule and syllabus. */
/**
 * No bundled batches.
 *
 * There were six, each promising "400+ live classes with recordings" and "40
 * full-length mock tests" on a schedule nobody teaches, for a platform with ten
 * tests and no live classes at all. A prospective learner read those as an
 * offer.
 *
 * Empty rather than deleted: a batch is a schedule of live classes, and this is
 * the shape one takes when there is a scheduling backend to read from.
 */
export const BATCHES: Batch[] = [];

export const BATCH_BY_ID = new Map(BATCHES.map((b) => [b.id, b]));
export const getBatch = (id: string) => BATCH_BY_ID.get(id);
export const batchesByExam = (examId: string) => BATCHES.filter((b) => b.examId === examId);
