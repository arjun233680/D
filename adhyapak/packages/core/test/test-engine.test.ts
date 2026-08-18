import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OPTION_LABELS } from '../src/types';
import {
  QUESTIONS,
  TESTS,
  getQuestion,
  getTest,
  clearResponse,
  createAttempt,
  gradeAttempt,
  isTimeUp,
  paletteCounts,
  selectOption,
  statusOf,
  testQuestionIds,
  tick,
  toggleMarkForReview,
  visitQuestion,
  type Question,
  type Test,
  type TestAttempt,
} from '../src/index.ts';

/**
 * Scoring is the one place a bug is unrecoverable: a learner told they scored 82
 * when they scored 74 makes real decisions on it.
 *
 * These tests carry their own paper. They used to answer a bundled test against
 * the bundled question bank, which is empty since 0011 — grading nothing proves
 * nothing. `gradeAttempt` already takes a lookup so a paper assembled at runtime
 * can be marked, and that is the seam the fixture uses: the same code path the
 * app takes for a previous-year set pulled from the database.
 */

const FIXTURE_QUESTIONS: Question[] = Array.from({ length: 8 }, (_, i) => ({
  id: `fx-${i}`,
  topicId: 'cdp-piaget',
  examIds: ['ctet'],
  text: { en: `Question ${i}?`, hi: `प्रश्न ${i}?` },
  options: [
    { en: 'One', hi: 'एक' },
    { en: 'Two', hi: 'दो' },
    { en: 'Three', hi: 'तीन' },
    { en: 'Four', hi: 'चार' },
  ],
  // Rotating the key means a run of identical answers cannot score full marks
  // by accident, which a fixed key would have allowed.
  correctAnswers: [OPTION_LABELS[i % 4]!],
  answerStatus: 'ok',
  graceMarksAwarded: false,
  excludedFromTotal: false,
  explanation: { en: 'Because.', hi: 'क्योंकि।' },
  difficulty: 'easy',
  avgTimeSeconds: 40,
  accuracy: 0.5,
}));

const FIXTURE_BY_ID = new Map(FIXTURE_QUESTIONS.map((q) => [q.id, q]));
const find = (id: string) => FIXTURE_BY_ID.get(id);

const anyTest = (): Test => ({
  id: 'fx-test',
  title: { en: 'Fixture paper', hi: 'फ़िक्स्चर पेपर' },
  examId: 'ctet',
  type: 'mock',
  durationMinutes: 8,
  marksPerQuestion: 1,
  negativeMarking: 0.25,
  access: 'free',
  instructions: [{ en: 'Answer all questions.', hi: 'सभी प्रश्नों के उत्तर दें।' }],
  sections: [
    {
      id: 'fx-sec',
      name: { en: 'CDP', hi: 'बाल विकास' },
      subjectId: 'cdp',
      questionIds: FIXTURE_QUESTIONS.map((q) => q.id),
    },
  ],
});

const start = (test: Test): TestAttempt => createAttempt(test, 'user-test', 'en');

/** Answers the nth question of a test correctly or incorrectly. */
const answer = (attempt: TestAttempt, test: Test, n: number, correct: boolean): TestAttempt => {
  const id = testQuestionIds(test)[n]!;
  const q = find(id)!;
  const key = q.correctAnswers[0] ?? 'A';
  // The wrong answer is the next label round, so it is always a real option and
  // never accidentally another accepted one on a double-answer key.
  const wrong = OPTION_LABELS.filter((l) => !q.correctAnswers.includes(l))[0] ?? 'B';
  return selectOption(attempt, id, correct ? key : wrong);
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
    const a = selectOption(start(test), id, 'C');
    assert.equal(a.answers[id]?.selectedOption, 'C');
    assert.equal(statusOf(a, id), 'answered');
  });

  it('treats re-picking the same option as clearing it', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = selectOption(start(test), id, 'B');
    a = selectOption(a, id, 'B');
    assert.equal(a.answers[id]?.selectedOption, null);
    assert.equal(statusOf(a, id), 'not-answered');
  });

  it('clears a response without making the question unvisited', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = visitQuestion(start(test), id);
    a = selectOption(a, id, 'C');
    a = clearResponse(a, id);
    assert.equal(a.answers[id]?.selectedOption, null);
    assert.equal(statusOf(a, id), 'not-answered');
  });

  it('toggles mark-for-review both ways and keeps the answer', () => {
    const test = anyTest();
    const id = testQuestionIds(test)[0]!;
    let a = selectOption(start(test), id, 'B');
    a = toggleMarkForReview(a, id);
    assert.equal(statusOf(a, id), 'answered-marked');
    a = toggleMarkForReview(a, id);
    assert.equal(statusOf(a, id), 'answered');
    assert.equal(a.answers[id]?.selectedOption, 'B', 'the answer survives the toggle');
  });

  it('accounts for every question exactly once in the palette', () => {
    const test = anyTest();
    const ids = testQuestionIds(test);
    let a = start(test);
    a = selectOption(a, ids[0]!, 'A');
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
    const after = selectOption(before, id, 'D');
    assert.equal(before.answers[id]?.selectedOption, undefined, 'state is not mutated in place');
    assert.equal(after.answers[id]?.selectedOption, 'D');
  });
});

describe('grading', () => {
  it('counts correct, incorrect and skipped to the size of the paper', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    a = answer(a, test, 2, true);
    const r = gradeAttempt(test, a, find);
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
    const r = gradeAttempt(test, a, find);
    assert.equal(r.score, 2 * test.marksPerQuestion);
  });

  it('deducts for wrong answers and never for blanks', () => {
    const base = anyTest();
    const test: Test = { ...base, negativeMarking: 0.25, marksPerQuestion: 2 };
    let a = start(test);
    a = answer(a, test, 0, true); // +2
    a = answer(a, test, 1, false); // -0.25
    a = answer(a, test, 2, false); // -0.25
    const r = gradeAttempt(test, a, find);
    assert.equal(r.correct, 1);
    assert.equal(r.incorrect, 2);
    assert.equal(r.score, 1.5);

    const blank = gradeAttempt(test, start(test), find);
    assert.equal(blank.score, 0, 'an untouched paper is never negative');
  });

  it('never returns a score below zero', () => {
    const base = anyTest();
    const test: Test = { ...base, negativeMarking: 1, marksPerQuestion: 1 };
    let a = start(test);
    for (let i = 0; i < 4; i += 1) a = answer(a, test, i, false);
    const r = gradeAttempt(test, a, find);
    assert.ok(r.score >= 0, `score was ${r.score}`);
  });

  it('measures accuracy over what was attempted, not over the paper', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a, find);
    assert.equal(r.attempted, 2);
    assert.equal(Math.round(r.accuracy), 50);
  });

  it('reports a percentage of the maximum', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    const r = gradeAttempt(test, a, find);
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
    const r = gradeAttempt(test, a, find);
    assert.equal(r.rank, undefined);
    assert.equal(r.percentile, undefined);
    assert.equal(r.totalCandidates, undefined);
  });

  it('qualifies exactly when the percentage reaches the cutoff', () => {
    const test = anyTest();
    let a = start(test);
    for (const id of testQuestionIds(test)) {
      const q = find(id)!;
      a = selectOption(a, id, q.correctAnswers[0] ?? 'A');
    }
    const full = gradeAttempt(test, a, find);
    assert.equal(full.percentage, 100);
    assert.equal(full.qualified, true, 'a perfect paper qualifies');

    const empty = gradeAttempt(test, start(test), find);
    assert.equal(empty.qualified, false, 'an empty paper does not');
  });

  it('breaks the score down by subject, summing to the whole', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, true);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a, find);
    assert.ok(r.subjectScores.length > 0);
    const summed = r.subjectScores.reduce((n, s) => n + s.correct, 0);
    assert.equal(summed, r.correct);
  });

  it('surfaces weak topics only where the learner actually answered', () => {
    const test = anyTest();
    let a = start(test);
    a = answer(a, test, 0, false);
    a = answer(a, test, 1, false);
    const r = gradeAttempt(test, a, find);
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

  it('is empty, and every screen has to cope with that', () => {
    // The bundled bank held 67 hand-written questions so the app had something
    // to show with no database. 0011 rebuilt the schema and they went with it:
    // maintaining the same content in two shapes, one of which nothing could
    // import into or publish from, was the cost of a demo.
    //
    // The invariants this suite used to assert — an answer key inside its own
    // options, options in the language the question is asked in — now live
    // where content actually arrives, in `validateQuestion`, and are asserted
    // against real rows there rather than against a fixture.
    assert.equal(QUESTIONS.length, 0);
  });

  it('grades an empty paper without throwing', () => {
    // The offline path must survive a bank with nothing in it: this is what a
    // build with no database now does on every screen.
    const test = anyTest();
    const result = gradeAttempt(test, start(test), find);
    assert.equal(result.correct, 0);
    assert.equal(result.percentage, 0);
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
