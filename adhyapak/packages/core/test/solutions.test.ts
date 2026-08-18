import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesSolutionFilter,
  solutionFilterOptions,
  solutionOutcome,
  type SolutionOutcome,
} from '../src/index.ts';

/**
 * Four screens show a solutions list — practice and mock, on web and on the
 * phone — and they all classify and count through this. A chip reading
 * "Incorrect (12)" above a list of nine is the failure being prevented.
 */

describe('what became of a question', () => {
  it('is correct when the marked option was the right one', () => {
    assert.equal(solutionOutcome('C', { correctAnswers: ['C'] as const, answerStatus: 'ok' as const }), 'correct');
  });

  it('is incorrect when a different option was marked', () => {
    assert.equal(solutionOutcome('A', { correctAnswers: ['C'] as const, answerStatus: 'ok' as const }), 'incorrect');
  });

  it('is unattempted when nothing was marked', () => {
    // null — passed over on screen.
    assert.equal(solutionOutcome(null, { correctAnswers: ['C'] as const, answerStatus: 'ok' as const }), 'unattempted');
    // undefined — never reached at all.
    assert.equal(solutionOutcome(undefined, { correctAnswers: ['C'] as const, answerStatus: 'ok' as const }), 'unattempted');
  });

  it('does not read option A as unattempted', () => {
    // The bug this guards: `!selectedIndex` is true for 0, so a learner who
    // marked A on every question would be told they attempted none of them.
    assert.equal(solutionOutcome('A', { correctAnswers: ['A'] as const, answerStatus: 'ok' as const }), 'correct');
    assert.equal(solutionOutcome('A', { correctAnswers: ['B'] as const, answerStatus: 'ok' as const }), 'incorrect');
  });
});

describe('the filter chips', () => {
  const outcomes: SolutionOutcome[] = [
    'correct',
    'correct',
    'incorrect',
    'unattempted',
    'unattempted',
    'unattempted',
  ];

  it('offers all, correct, incorrect and unattempted, in that order', () => {
    assert.deepEqual(
      solutionFilterOptions(outcomes).map((o) => o.value),
      ['all', 'correct', 'incorrect', 'unattempted'],
    );
  });

  it('counts each outcome, and all counts every question', () => {
    const counts = Object.fromEntries(solutionFilterOptions(outcomes).map((o) => [o.value, o.count]));
    assert.deepEqual(counts, { all: 6, correct: 2, incorrect: 1, unattempted: 3 });
  });

  it('the three outcome counts add up to the total', () => {
    const options = solutionFilterOptions(outcomes);
    const all = options.find((o) => o.value === 'all')!.count;
    const parts = options.filter((o) => o.value !== 'all').reduce((n, o) => n + o.count, 0);
    assert.equal(parts, all, 'every question falls under exactly one outcome');
  });

  it('keeps every chip at zero rather than hiding it', () => {
    // A chip that vanished when empty would make "nothing wrong" look like a
    // missing feature, and would shift the others under the learner's finger.
    const options = solutionFilterOptions(['correct', 'correct']);
    assert.equal(options.length, 4);
    assert.equal(options.find((o) => o.value === 'incorrect')!.count, 0);
    assert.equal(options.find((o) => o.value === 'unattempted')!.count, 0);
  });

  it('handles an empty sitting', () => {
    assert.deepEqual(
      solutionFilterOptions([]).map((o) => o.count),
      [0, 0, 0, 0],
    );
  });

  it('labels every chip in both languages', () => {
    for (const option of solutionFilterOptions(outcomes)) {
      assert.ok(option.labelEn.length > 0, `${option.value} has no English label`);
      assert.match(option.labelHi, /[ऀ-ॿ]/, `${option.value} has no Devanagari label`);
    }
  });
});

describe('what the filter lets through', () => {
  it('all lets everything through', () => {
    for (const outcome of ['correct', 'incorrect', 'unattempted'] as const) {
      assert.equal(matchesSolutionFilter(outcome, 'all'), true);
    }
  });

  it('an outcome filter lets only that outcome through', () => {
    assert.equal(matchesSolutionFilter('incorrect', 'incorrect'), true);
    assert.equal(matchesSolutionFilter('correct', 'incorrect'), false);
    assert.equal(matchesSolutionFilter('unattempted', 'incorrect'), false);
  });

  it('agrees with the counts on the chips', () => {
    const outcomes: SolutionOutcome[] = ['correct', 'incorrect', 'incorrect', 'unattempted'];
    for (const option of solutionFilterOptions(outcomes)) {
      const shown = outcomes.filter((o) => matchesSolutionFilter(o, option.value)).length;
      assert.equal(shown, option.count, `${option.value} chip promises ${option.count}, shows ${shown}`);
    }
  });
});
