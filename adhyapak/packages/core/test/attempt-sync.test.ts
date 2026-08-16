import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  answerChanged,
  clockIsDue,
  createAttemptSync,
  getTest,
  type AttemptAnswer,
  type TestAttempt,
} from '../src/index.ts';

/**
 * Mirroring a sitting to the server.
 *
 * With no backend configured — which is what this test environment is, and what
 * a learner on a dead connection has — every method must be a no-op that
 * returns rather than throws. An exception here would come out of the exam
 * window mid-paper, which is the single worst place in the app to crash.
 *
 * The write-scheduling decisions (only changed answers, clock at most every
 * fifteen seconds) are proved against a fake `now`, because they are the reason
 * this module exists and they are invisible from the outside otherwise.
 */

const test = getTest('test-ctet-p1-mock-1')!;

const attemptWith = (answers: TestAttempt['answers'], remainingMs = 5_400_000): TestAttempt => ({
  id: 'local',
  testId: test.id,
  userId: '',
  startedAt: '2026-08-16T09:00:00.000Z',
  answers,
  remainingMs,
  language: 'hi',
});

describe('an attempt with nowhere to sync to', () => {
  it('opens without throwing, and stays quiet afterwards', async () => {
    const sync = createAttemptSync(test, 'hi');
    await sync.open();

    // Recording is what runs on every keystroke in the window. It must not
    // throw and must not need an attempt id to have been obtained.
    sync.record(
      attemptWith({
        'q-cdp-001': {
          questionId: 'q-cdp-001',
          selectedIndex: 2,
          markedForReview: false,
          timeSpentMs: 4000,
        },
      }),
    );

    // Nothing to grade server-side means the caller keeps the local grade.
    assert.equal(await sync.submit(), null);
  });

  it('can be opened twice without starting a second attempt', async () => {
    // The database has a unique index on one live attempt per test per learner,
    // so a second insert is an error rather than a duplicate. Two callers
    // racing must share one request.
    const sync = createAttemptSync(test, 'hi');
    await Promise.all([sync.open(), sync.open(), sync.open()]);
    assert.equal(await sync.submit(), null);
  });

  it('survives an attempt with no answers at all', async () => {
    const sync = createAttemptSync(test, 'en');
    await sync.open();
    sync.record(attemptWith({}));
    assert.equal(await sync.submit(), null);
  });
});

describe('only real changes are written', () => {
  const base: AttemptAnswer = {
    questionId: 'q-cdp-001',
    selectedIndex: 2,
    markedForReview: false,
    timeSpentMs: 4000,
  };

  it('writes an answer it has never seen', () => {
    assert.equal(answerChanged(undefined, base), true);
  });

  it('does not write the same answer twice', () => {
    assert.equal(answerChanged(base, { ...base }), false);
  });

  it('writes a changed option, including one cleared back to blank', () => {
    assert.equal(answerChanged(base, { ...base, selectedIndex: 3 }), true);
    assert.equal(answerChanged(base, { ...base, selectedIndex: null }), true);
  });

  it('writes a change to the review flag', () => {
    assert.equal(answerChanged(base, { ...base, markedForReview: true }), true);
  });

  it('ignores sub-second drift in the timer, and notices a real second', () => {
    // The timer ticks continuously while a question is on screen. Comparing it
    // exactly would mark every answer dirty on every render and turn `record`
    // into one write per frame.
    assert.equal(answerChanged(base, { ...base, timeSpentMs: 4300 }), false);
    assert.equal(answerChanged(base, { ...base, timeSpentMs: 4999 }), false);
    assert.equal(answerChanged(base, { ...base, timeSpentMs: 5000 }), true);
    // Time can also go backwards between two reads of a resumed attempt.
    assert.equal(answerChanged(base, { ...base, timeSpentMs: 2000 }), true);
  });
});

describe('the clock is not written on every tick', () => {
  it('waits fifteen seconds between pushes', () => {
    // `record` runs whenever the attempt changes, which during a paper is once
    // a second. Pushing `remaining_ms` each time would be thousands of writes
    // to answer a question — "how much time was left when they closed the tab"
    // — that nobody asks to the second.
    assert.equal(clockIsDue(1_000_000, 1_000_000), false);
    assert.equal(clockIsDue(1_000_000, 1_014_999), false);
    assert.equal(clockIsDue(1_000_000, 1_015_000), true);
  });

  it('pushes on the very first record, whatever the clock reads', () => {
    // `clockSentAt` starts at 0, so the first call is always due — a paper
    // abandoned in its first fifteen seconds still resumes with a real time.
    assert.equal(clockIsDue(0, 1_000_000), true);
  });

  it('drives a whole paper of ticks without throwing', async () => {
    let clock = 1_000_000;
    const sync = createAttemptSync(test, 'hi', () => clock);
    await sync.open();
    for (let i = 0; i < 40; i += 1) {
      clock += 1000;
      sync.record(attemptWith({}, 5_400_000 - i * 1000));
    }
    assert.equal(await sync.submit(), null);
  });
});
