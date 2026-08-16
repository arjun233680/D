import { startAttempt, saveAnswer, syncClock, submitAttempt } from './repository';
import type { AttemptAnswer, Lang, Test, TestAttempt, TestResult } from '../types';

/**
 * Mirroring a paper in progress to the server.
 *
 * `startAttempt`, `saveAnswer`, `syncClock` and `submitAttempt` were written
 * against the `attempts` and `attempt_answers` tables and then never called by
 * either app: every sitting was graded on the device and kept in local storage,
 * so `submit_attempt` — which computes the rank, the percentile and whether the
 * candidate cleared the cut-off against everyone else who has sat the paper —
 * had no rows to work from. A learner's result reported a rank of 1 out of 1
 * for as long as that was true, which is to say always.
 *
 * This is the piece between the exam window and the repository. It is
 * deliberately plain TypeScript rather than a hook: there are two apps, the
 * window is duplicated in both, and one implementation of *when to write* is
 * worth more than the few lines of React each app saves.
 *
 * Everything here degrades to nothing. Offline, signed out, or sitting a
 * bundled mock whose test id the database has never heard of, `open()` gets no
 * attempt id and every later call becomes a no-op — the caller grades locally
 * and neither knows nor cares. That is the same contract `withFallback` gives
 * the read side.
 */

/**
 * How often the clock is pushed. The clock exists so a learner who closes the
 * tab resumes with the time they had left, not so the server can watch it tick;
 * a write per second would be three thousand writes a paper to answer a
 * question nobody asks that precisely.
 */
const CLOCK_INTERVAL_MS = 15_000;

export interface AttemptSync {
  /**
   * Opens the paper server-side, or resumes the one already open. Safe to call
   * more than once — the second call returns the same id rather than starting a
   * second attempt, which the `attempts_one_live_per_test` index would refuse
   * anyway.
   */
  open: () => Promise<void>;
  /** Mirrors whatever changed since the last call. Cheap, and safe to spam. */
  record: (attempt: TestAttempt) => void;
  /**
   * Grades the paper in the database.
   *
   * Returns null when there is nothing to grade there, and the caller uses the
   * local result — which is the same score, without the rank.
   */
  submit: () => Promise<TestResult | null>;
}

/**
 * True when anything the server stores about this answer has changed.
 *
 * Exported because it is the whole scheduling decision, and it is invisible
 * from outside `record` — with no backend every write is a no-op, so a test of
 * `record` alone cannot tell "wrote nothing because nothing changed" from
 * "wrote nothing because there is nowhere to write".
 */
export const answerChanged = (a: AttemptAnswer | undefined, b: AttemptAnswer): boolean =>
  a === undefined ||
  a.selectedIndex !== b.selectedIndex ||
  a.markedForReview !== b.markedForReview ||
  // Time only counts as a change when it moves by a second or more. It ticks
  // continuously, so comparing exactly would make every answer dirty on every
  // render and turn `record` into one write per frame.
  Math.abs(a.timeSpentMs - b.timeSpentMs) >= 1000;

/** True when enough time has passed to push the clock again. */
export const clockIsDue = (lastSentAt: number, now: number): boolean =>
  now - lastSentAt >= CLOCK_INTERVAL_MS;

export const createAttemptSync = (
  test: Test,
  language: Lang,
  now: () => number = Date.now,
): AttemptSync => {
  let attemptId: string | null = null;
  let opening: Promise<void> | null = null;
  /** What the server was last told, so only real changes are sent. */
  const sent = new Map<string, AttemptAnswer>();
  let clockSentAt = 0;

  const open = async (): Promise<void> => {
    if (attemptId) return;
    // Concurrent callers share one request. Two `open()` calls racing would
    // otherwise both insert, and the loser would take the unique-index error.
    opening ??= startAttempt(test, language)
      .then((id) => {
        attemptId = id;
      })
      .catch(() => {
        // A paper that cannot be opened server-side is still a paper. The
        // learner sits it locally and nothing above here changes.
      })
      .finally(() => {
        opening = null;
      });
    return opening;
  };

  const record = (attempt: TestAttempt): void => {
    if (!attemptId) return;
    const id = attemptId;

    for (const [questionId, answer] of Object.entries(attempt.answers)) {
      if (!answerChanged(sent.get(questionId), answer)) continue;
      // Recorded as sent before the write resolves. A failed write is not
      // retried: the next change to the same question carries the same state,
      // and submitting re-grades from whatever did land. Blocking the exam
      // window on a retry queue would be a worse trade than a lost keystroke
      // on a paper that is about to be graded locally anyway.
      sent.set(questionId, { ...answer });
      void saveAnswer(id, questionId, {
        selectedIndex: answer.selectedIndex,
        markedForReview: answer.markedForReview,
        timeSpentMs: answer.timeSpentMs,
      }).catch(() => undefined);
    }

    const at = now();
    if (clockIsDue(clockSentAt, at)) {
      clockSentAt = at;
      void syncClock(id, attempt.remainingMs).catch(() => undefined);
    }
  };

  const submit = async (): Promise<TestResult | null> => {
    if (!attemptId) return null;
    try {
      return await submitAttempt(attemptId, test);
    } catch {
      return null;
    }
  };

  return { open, record, submit };
};
