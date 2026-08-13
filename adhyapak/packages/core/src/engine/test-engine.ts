import type {
  AttemptAnswer,
  Lang,
  Question,
  QuestionStatus,
  SubjectScore,
  Test,
  TestAttempt,
  TestResult,
  TopicPerformance,
} from '../types';
import { getQuestion } from '../data/questions';
import { testMaxMarks, testQuestionIds } from '../data/tests';
import { getPaper } from '../data/exams';

/* ------------------------------------------------------------- lifecycle */

export const createAttempt = (
  test: Test,
  userId: string,
  language: Lang,
  now: Date = new Date(),
): TestAttempt => ({
  id: `attempt-${test.id}-${now.getTime()}`,
  testId: test.id,
  userId,
  startedAt: now.toISOString(),
  answers: {},
  remainingMs: test.durationMinutes * 60_000,
  currentQuestionId: testQuestionIds(test)[0],
  language,
});

const blankAnswer = (questionId: string): AttemptAnswer => ({
  questionId,
  selectedIndex: null,
  markedForReview: false,
  timeSpentMs: 0,
});

const withAnswer = (
  attempt: TestAttempt,
  questionId: string,
  patch: Partial<AttemptAnswer>,
): TestAttempt => {
  const existing = attempt.answers[questionId] ?? blankAnswer(questionId);
  return {
    ...attempt,
    answers: { ...attempt.answers, [questionId]: { ...existing, ...patch } },
  };
};

/** Selecting the option already chosen clears it — matches every real test engine. */
export const selectOption = (
  attempt: TestAttempt,
  questionId: string,
  optionIndex: number,
): TestAttempt => {
  const current = attempt.answers[questionId]?.selectedIndex ?? null;
  return withAnswer(attempt, questionId, {
    selectedIndex: current === optionIndex ? null : optionIndex,
  });
};

export const clearResponse = (attempt: TestAttempt, questionId: string): TestAttempt =>
  withAnswer(attempt, questionId, { selectedIndex: null });

export const toggleMarkForReview = (attempt: TestAttempt, questionId: string): TestAttempt =>
  withAnswer(attempt, questionId, {
    markedForReview: !(attempt.answers[questionId]?.markedForReview ?? false),
  });

/** Records that the learner has seen the question, so the palette can show "not answered". */
export const visitQuestion = (attempt: TestAttempt, questionId: string): TestAttempt => ({
  ...withAnswer(attempt, questionId, {}),
  currentQuestionId: questionId,
});

export const addTimeSpent = (
  attempt: TestAttempt,
  questionId: string,
  deltaMs: number,
): TestAttempt =>
  withAnswer(attempt, questionId, {
    timeSpentMs: (attempt.answers[questionId]?.timeSpentMs ?? 0) + deltaMs,
  });

export const tick = (attempt: TestAttempt, deltaMs: number): TestAttempt => ({
  ...attempt,
  remainingMs: Math.max(0, attempt.remainingMs - deltaMs),
});

export const isTimeUp = (attempt: TestAttempt): boolean => attempt.remainingMs <= 0;

/* --------------------------------------------------------------- palette */

export const statusOf = (attempt: TestAttempt, questionId: string): QuestionStatus => {
  const a = attempt.answers[questionId];
  if (!a) return 'not-visited';
  if (a.selectedIndex !== null && a.markedForReview) return 'answered-marked';
  if (a.markedForReview) return 'marked';
  if (a.selectedIndex !== null) return 'answered';
  return 'not-answered';
};

export interface PaletteCounts {
  answered: number;
  notAnswered: number;
  notVisited: number;
  marked: number;
  answeredMarked: number;
}

export const paletteCounts = (test: Test, attempt: TestAttempt): PaletteCounts => {
  const counts: PaletteCounts = {
    answered: 0,
    notAnswered: 0,
    notVisited: 0,
    marked: 0,
    answeredMarked: 0,
  };
  for (const id of testQuestionIds(test)) {
    switch (statusOf(attempt, id)) {
      case 'answered':
        counts.answered += 1;
        break;
      case 'not-answered':
        counts.notAnswered += 1;
        break;
      case 'marked':
        counts.marked += 1;
        break;
      case 'answered-marked':
        counts.answeredMarked += 1;
        break;
      default:
        counts.notVisited += 1;
    }
  }
  return counts;
};

/* --------------------------------------------------------------- grading */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic cohort simulation. With a backend this is replaced by the real
 * distribution; the shape of the output never changes, so no screen is touched.
 */
const simulateRank = (percentage: number, attempts: number) => {
  // Teaching-exam cohorts cluster in the 45-65% band; this curve reproduces that.
  const percentile = round2(
    Math.min(99.98, Math.max(0.5, 100 / (1 + Math.exp(-(percentage - 52) / 9)))),
  );
  const totalCandidates = Math.max(1000, attempts);
  const rank = Math.max(1, Math.round(totalCandidates * (1 - percentile / 100)));
  return { percentile, rank, totalCandidates };
};

export const gradeAttempt = (test: Test, attempt: TestAttempt): TestResult => {
  const ids = testQuestionIds(test);
  const maxScore = testMaxMarks(test);

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  let totalTimeMs = 0;

  const bySubject = new Map<string, SubjectScore>();
  const byTopic = new Map<string, TopicPerformance>();

  for (const id of ids) {
    const question = getQuestion(id);
    if (!question) continue;

    const answer = attempt.answers[id];
    const selected = answer?.selectedIndex ?? null;
    const timeSpentMs = answer?.timeSpentMs ?? 0;
    totalTimeMs += timeSpentMs;

    const subject =
      bySubject.get(question.subjectId) ??
      {
        subjectId: question.subjectId,
        attempted: 0,
        correct: 0,
        incorrect: 0,
        skipped: 0,
        score: 0,
        maxScore: 0,
        accuracy: 0,
        timeSpentMs: 0,
      };
    subject.maxScore += test.marksPerQuestion;
    subject.timeSpentMs += timeSpentMs;

    const topic =
      byTopic.get(question.topicId) ??
      { topicId: question.topicId, subjectId: question.subjectId, attempted: 0, correct: 0, accuracy: 0 };

    if (selected === null) {
      skipped += 1;
      subject.skipped += 1;
    } else {
      subject.attempted += 1;
      topic.attempted += 1;
      if (selected === question.correctIndex) {
        correct += 1;
        subject.correct += 1;
        subject.score += test.marksPerQuestion;
        topic.correct += 1;
      } else {
        incorrect += 1;
        subject.incorrect += 1;
        subject.score -= test.negativeMarking;
      }
    }

    bySubject.set(question.subjectId, subject);
    byTopic.set(question.topicId, topic);
  }

  const attempted = correct + incorrect;
  const rawScore = correct * test.marksPerQuestion - incorrect * test.negativeMarking;
  // A negative total is never carried forward in Indian teaching exams.
  const score = round2(Math.max(0, rawScore));
  const percentage = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const accuracy = attempted > 0 ? round2((correct / attempted) * 100) : 0;

  const subjectScores = [...bySubject.values()].map((s) => ({
    ...s,
    score: round2(Math.max(0, s.score)),
    accuracy: s.attempted > 0 ? round2((s.correct / s.attempted) * 100) : 0,
  }));

  const topicPerformance = [...byTopic.values()]
    .filter((t) => t.attempted > 0)
    .map((t) => ({ ...t, accuracy: round2((t.correct / t.attempted) * 100) }));

  const sortedTopics = [...topicPerformance].sort((a, b) => a.accuracy - b.accuracy);
  const weakTopics = sortedTopics.filter((t) => t.accuracy < 60).slice(0, 5);
  const strongTopics = [...sortedTopics].reverse().filter((t) => t.accuracy >= 75).slice(0, 5);

  const paper = test.paperId ? getPaper(test.paperId)?.paper : undefined;
  const cutoff = paper?.cutoffGeneral ?? 60;

  const { percentile, rank, totalCandidates } = simulateRank(percentage, test.attempts);

  return {
    attemptId: attempt.id,
    testId: test.id,
    score,
    maxScore,
    percentage,
    correct,
    incorrect,
    skipped,
    attempted,
    accuracy,
    totalTimeMs,
    rank,
    totalCandidates,
    percentile,
    qualified: percentage >= cutoff,
    cutoff,
    subjectScores,
    weakTopics,
    strongTopics,
  };
};

/** Questions the learner got wrong or skipped — the solutions screen defaults to these. */
export const reviewList = (
  test: Test,
  attempt: TestAttempt,
): { question: Question; selectedIndex: number | null; correct: boolean }[] =>
  testQuestionIds(test)
    .map((id) => {
      const question = getQuestion(id);
      if (!question) return null;
      const selectedIndex = attempt.answers[id]?.selectedIndex ?? null;
      return { question, selectedIndex, correct: selectedIndex === question.correctIndex };
    })
    .filter((r): r is { question: Question; selectedIndex: number | null; correct: boolean } =>
      Boolean(r),
    );
