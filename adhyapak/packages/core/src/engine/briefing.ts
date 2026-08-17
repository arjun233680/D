import type { Bilingual, Test } from '../types';
import { testMaxMarks, testQuestionCount } from '../data/tests';

/**
 * What a candidate is told before the clock starts.
 *
 * Every figure here is read off the paper itself rather than written into a
 * screen, so the two apps cannot drift and neither can state a duration or a
 * mark total the paper does not carry. It exists because the instructions page
 * is exactly the place a wrong number does the most damage: somebody plans
 * their two and a half hours around it.
 */
export interface TestBriefing {
  questionCount: number;
  maxMarks: number;
  durationMinutes: number;
  marksPerQuestion: number;
  /** Positive number, or 0. Shown as a deduction, so the sign lives in the copy. */
  negativeMarking: number;
  sections: { id: string; name: Bilingual; questionCount: number }[];
}

export const testBriefing = (test: Test): TestBriefing => ({
  questionCount: testQuestionCount(test),
  maxMarks: testMaxMarks(test),
  durationMinutes: test.durationMinutes,
  marksPerQuestion: test.marksPerQuestion,
  negativeMarking: test.negativeMarking,
  sections: test.sections.map((s) => ({
    id: s.id,
    name: s.name,
    questionCount: s.questionIds.length,
  })),
});

/**
 * How a sitting treats the answer key.
 *
 * `exam` withholds everything until the paper is submitted — the answer, the
 * explanation, whether the choice was even right. That is what a mock is for: a
 * measurement is worthless if the thing being measured can see the key.
 *
 * `guided` marks each answer as it is chosen and offers the explanation there
 * and then, which is how somebody learns a topic rather than tests it.
 *
 * The candidate picks before starting, because only they know which of the two
 * they came for, and the choice cannot be changed mid-paper — switching to
 * `guided` halfway would turn a measurement into something else without saying
 * so on the result.
 */
export type SolutionMode = 'exam' | 'guided';

/** Whether the sitting reveals anything before submission. */
export const revealsDuringPaper = (mode: SolutionMode): boolean => mode === 'guided';
