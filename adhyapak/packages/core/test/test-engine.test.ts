import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  QUESTIONS,
  TESTS,
  clearResponse,
  createAttempt,
  getQuestion,
  getTest,
  gradeAttempt,
  isTimeUp,
  paletteCounts,
  selectOption,
  statusOf,
  testQuestionIds,
  tick,
  toggleMarkForReview,
  visitQuestion,
  type Test,
  type TestAttempt,
} from '../src/index.ts';

/**
 * Scoring is the one place a bug is unrecoverable: a learner told they scored 82
 * when they scored 74 makes real decisions on it.
 *
 * `gradeAttempt` resolves questions through the bundled bank, so these tests use
 * a real test and answer it deliberately — right, wrong, or not at all — rather
 * than inventing questions the grader could not see.
 */

const anyTest = (): Test => {
  const t = TESTS.find((x) => testQuestionIds(x).length >= 4);
  if (!t) throw new Error('seed data has no test with at least four questions');
  return t;
};

const start = (test: Test): TestAttempt => createAttempt(test, 'user-test', 'en');

/** Answers the nth question of a test correctly or incorrectly. */
const answer = (attempt: TestAttempt, test: Test, n: number, correct: boolean): TestAttempt => {
  const id = testQuestionIds(test)[n]!;
  const q = getQuestion(id)!;
  const index = correct ? q.correctIndex : (q.correctIndex + 1) % q.options.length;
  return selectOption(attempt, id, index);
};

describe('attempt state', () => {
  it('starts with nothing visited and the clock full', () => {
    const test = anyTest();
    const a = start(test);
    const counts = paletteCounts(test, a);
    assert.equal(counts.answered, 0);
    assert.equal(counts.notVisited, testQuestionIds(test).length);
    assert.equal(a.remainingMs, test.durationMinutes * 60_000);
    assert.equal(isTimeUp(a), false);
  });

  it('records a selection and reports it as answered', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    const a = selectOption(start(test), id, 2);
    assert.equal(a.answers[id]?.selectedIndex, 2);
    assert.equal(statusOf(a, id), 'answered');
  });

  it('treats re-picking the same option as clearing it', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = selectOption(start(test), id, 1);
    a = selectOption(a, id, 1);
    assert.equal(a.answers[id]?.selectedIndex, null);
    assert.equal(statusOf(a, id), 'not-answered');
  });

  it('clears a response without making the question unvisited', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = visitQuestion(start(test), id);
    a = selectOption(a, id, 2);
    a = clearResponse(a, id);
    assert.equal(a.answers[id]?.selectedIndex, null);
    assert.equal(statusOf(a, id), 'not-answered');
  });

  it('toggles mark-for-review both ways and keeps the answer', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = selectOption(start(test), id, 1);
    a = toggleMarkForReview(a, id);
    assert.equal(statusOf(a, id), 'answered-marked');
    a = toggleMarkForReview(a, id);
    assert.equal(statusOf(a, id), 'answered');
    assert.equal(a.answers[id]?.selectedIndex, 1, 'the answer survives the toggle');
  });

  it('accounts for every question exactly once in the palette', () => {
    const test = anyTest();
    const ids = testQuestionIds(test);
    let a = start(test);
    a = selectOption(a, ids[0]!, 0);
    a = visitQuestion(a, ids[1]!);
    a = toggleMarkForReview(a, ids[2]!);
    const c = paletteCounts(test, a);
    assert.equal(
      c.answered + c.notAnswered + c.marked + c.answeredMarked + c.notVisited,
      ids.length,
    );
  });

  it('never lets the clock run past zero', () => {
    const test = anyTest();
    const a = tick(start(test), test.durationMinutes * 60_000 + 5_000);
    assert.equal(a.remainingMs, 0);
    assert.equal(isTimeUp(a), true);
  });

  it('leaves the previous state untouched when answering', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    const before = start(test);
    const after = selectOption(before, id, 3);
    assert.equal(before.answers[id]?.selectedIndex, undefined, 'state is not mutated in place');
    assert.equal(after.answers[id]?.selectedIndex, 3);
  });
});

describe('grading', () => {
  it('counts correct, incorrect and skipped to the size of the paper', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    a = answer(a, test, 2, true);
    const r = gradeAttempt(test, a);
    assert.equal(r.correct, 2);
    assert.equal(r.incorrect, 1);
    assert.equal(r.attempted, 3);
    assert.equal(r.correct + r.incorrect + r.skipped, testQuestionIds(test).length);
  });

  it('awards marks per question', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, true);
    const r = gradeAttempt(test, a);
    assert.equal(r.score, 2 * test.marksPerQuestion);
  });

  it('deducts for wrong answers and never for blanks', () => {
    const base = anyTest();
    const test: Test = { ...base, negativeMarking: 0.25, marksPerQuestion: 2 };
    let a = start(test);
    a = answer(a, test, 0, true); // +2
    a = answer(a, test, 1, false); // -0.25
    a = answer(a, test, 2, false); // -0.25
    const r = gradeAttempt(test, a);
    assert.equal(r.correct, 1);
    assert.equal(r.incorrect, 2);
    assert.equal(r.score, 1.5);

    const blank = gradeAttempt(test, start(test));
    assert.equal(blank.score, 0, 'an untouched paper is never negative');
  });

  it('never returns a score below zero', () => {
    const base = anyTest();
    const test: Test = { ...base, negativeMarking: 1, marksPerQuestion: 1 };
    let a = start(test);
    for (let i = 0; i < 4; i += 1) a = answer(a, test, i, false);
    const r = gradeAttempt(test, a);
    assert.ok(r.score >= 0, `score was ${r.score}`);
  });

  it('measures accuracy over what was attempted, not over the paper', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a);
    assert.equal(r.attempted, 2);
    assert.equal(Math.round(r.accuracy), 50);
  });

  it('reports a percentage of the maximum', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    const r = gradeAttempt(test, a);
    assert.ok(r.maxScore > 0);
    assert.equal(Math.round(r.percentage), Math.round((r.score / r.maxScore) * 100));
  });

  it('claims no rank, because a device cannot know one', () => {
    // This used to run the percentage through a logistic curve and multiply by
    // a seeded field size, so a learner who answered one question was told they
    // were "#1,80,000 of 1,80,000, 0.5 percentile" — a real-sounding standing
    // among candidates who had not sat anything. Only `submit_attempt` can
    // answer it, because only the database holds the other attempts.
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    const r = gradeAttempt(test, a);
    assert.equal(r.rank, undefined);
    assert.equal(r.percentile, undefined);
    assert.equal(r.totalCandidates, undefined);
  });

  it('qualifies exactly when the percentage reaches the cutoff', () => {
    const test = anyTest();
    let a = start(test);
    for (const id of testQuestionIds(test)) {
      const q = getQuestion(id)!;
      a = selectOption(a, id, q.correctIndex);
    }
    const full = gradeAttempt(test, a);
    assert.equal(full.percentage, 100);
    assert.equal(full.qualified, true, 'a perfect paper qualifies');

    const empty = gradeAttempt(test, start(test));
    assert.equal(empty.qualified, false, 'an empty paper does not');
  });

  it('breaks the score down by subject, summing to the whole', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a);
    assert.ok(r.subjectScores.length > 0);
    const summed = r.subjectScores.reduce((n, s) => n + s.correct, 0);
    assert.equal(summed, r.correct);
  });

  it('surfaces weak topics only where the learner actually answered', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, false);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a);
    for (const topic of r.weakTopics) {
      assert.ok(topic.attempted > 0, `${topic.topicId} reported as weak without being attempted`);
    }
  });
});

describe('seed data integrity', () => {
  it('every test references questions that exist', () => {
    for (const test of TESTS) {
      for (const id of testQuestionIds(test)) {
        assert.ok(getQuestion(id), `${test.id} references missing question ${id}`);
      }
    }
  });

  it('every question has its correct answer inside its own options', () => {
    for (const q of QUESTIONS) {
      assert.ok(
        Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length,
        `${q.id} has correctIndex ${q.correctIndex} for ${q.options.length} options`,
      );
    }
  });

  it('every question carries both languages', () => {
    for (const q of QUESTIONS) {
      assert.ok(q.text.en.trim(), `${q.id} has no English text`);
      assert.ok(q.text.hi.trim(), `${q.id} has no Hindi text`);
      q.options.forEach((o, i) => {
        assert.ok(o.en.trim(), `${q.id} option ${i + 1} has no English`);
        assert.ok(o.hi.trim(), `${q.id} option ${i + 1} has no Hindi`);
      });
    }
  });

  it('has no duplicate question ids', () => {
    const seen = new Set<string>();
    for (const q of QUESTIONS) {
      assert.ok(!seen.has(q.id), `duplicate question id ${q.id}`);
      seen.add(q.id);
    }
  });

  it('finds every advertised test by id', () => {
    for (const t of TESTS) assert.ok(getTest(t.id), `getTest could not find ${t.id}`);
  });
});
