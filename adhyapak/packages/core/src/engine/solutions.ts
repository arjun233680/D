import { isCorrectAnswer, type OptionLabel, type Question } from '../types';

/**
 * Reviewing a sitting, question by question.
 *
 * Both apps show a solutions list after practice and after a mock, which is
 * four screens that must agree on three things: what became of a question, what
 * the filter chips say, and how many fall under each. Getting that wrong in one
 * place and right in another is how "12 incorrect" ends up next to a list of
 * nine, so it lives here rather than in each screen.
 */

/** What became of one question in a sitting. */
export type SolutionOutcome = 'correct' | 'incorrect' | 'unattempted';

/** What a solutions list is currently showing. */
export type SolutionFilter = 'all' | SolutionOutcome;

/**
 * Classifies one question.
 *
 * `undefined` and `null` both mean unattempted, and deliberately so: undefined
 * is a question the learner never reached, null is one they passed over, and
 * neither put a mark on the answer sheet. Where that difference is still worth
 * showing, a screen can say so underneath — it is not a difference in outcome.
 */
export const solutionOutcome = (
  selected: OptionLabel | null | undefined,
  question: Pick<Question, 'correctAnswers' | 'answerStatus'>,
): SolutionOutcome =>
  selected === null || selected === undefined
    ? 'unattempted'
    : isCorrectAnswer(selected, question)
      ? 'correct'
      : 'incorrect';

export interface SolutionFilterOption {
  value: SolutionFilter;
  labelEn: string;
  labelHi: string;
  count: number;
}

const LABELS: Record<SolutionFilter, { en: string; hi: string }> = {
  all: { en: 'All', hi: 'सभी' },
  correct: { en: 'Correct', hi: 'सही' },
  incorrect: { en: 'Incorrect', hi: 'गलत' },
  unattempted: { en: 'Unattempted', hi: 'अनुत्तरित' },
};

/**
 * The filter chips for a set of outcomes, with their counts.
 *
 * Always all four, in this order, even at zero. A chip that disappeared when
 * empty would make "no incorrect answers" look like a missing feature rather
 * than a good result, and would move the other chips under the learner's finger
 * between one sitting and the next.
 */
export const solutionFilterOptions = (outcomes: SolutionOutcome[]): SolutionFilterOption[] => {
  const counts: Record<SolutionOutcome, number> = { correct: 0, incorrect: 0, unattempted: 0 };
  for (const outcome of outcomes) counts[outcome] += 1;

  return (['all', 'correct', 'incorrect', 'unattempted'] as const).map((value) => ({
    value,
    labelEn: LABELS[value].en,
    labelHi: LABELS[value].hi,
    count: value === 'all' ? outcomes.length : counts[value],
  }));
};

/** Whether one question belongs in the list under the current filter. */
export const matchesSolutionFilter = (outcome: SolutionOutcome, filter: SolutionFilter): boolean =>
  filter === 'all' || filter === outcome;
