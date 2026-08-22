import type { LearnerSubject, Level } from '../types';

/**
 * Which onboarding question is still outstanding.
 *
 * Extracted from the screens because three of them have to agree about it, and
 * when they disagree the failure is not a wrong page — it is a loop. The
 * dashboard sends an unfinished learner to the chooser, the chooser sends a
 * finished one to the dashboard, and any gap between those two definitions
 * volleys somebody between two screens forever. Deciding it in one function
 * that can be tested is what stops that being a thing you discover in
 * production.
 *
 * The subtle case is a level with no subject to choose. Primary is taught and
 * examined as one whole paper, so a learner who picked PRT alone has answered
 * everything there is to answer and owns no `learner_subjects` row at all.
 * Testing "has subjects" rather than "owes subjects" is precisely the gap that
 * loops.
 */
export type OnboardingStep = 'exams' | 'level' | 'subject' | 'done';

export const nextOnboardingStep = (
  examIds: readonly string[],
  levels: readonly Level[],
  levelIds: readonly string[],
  subjects: readonly LearnerSubject[],
  /**
   * Which of the learner's exams examine which of their levels.
   *
   * Omit it and every chosen level counts once, which is the old behaviour and
   * the right answer for a learner sitting one exam. Pass it and the question
   * is asked per exam, because CTET's Paper II and HTET's TGT are one level
   * here and two different subject lists in life.
   */
  pairs?: readonly { examId: string; levelId: string }[],
): OnboardingStep => {
  if (examIds.length === 0) return 'exams';
  if (levelIds.length === 0) return 'level';

  const asks = levels.filter((l) => l.requiresSubject && levelIds.includes(l.id));

  const owes = pairs
    ? pairs.some(
        (p) =>
          examIds.includes(p.examId) &&
          asks.some((l) => l.id === p.levelId) &&
          !subjects.some((s) => s.examId === p.examId && s.levelId === p.levelId),
      )
    : asks.some((level) => !subjects.some((s) => s.levelId === level.id));

  return owes ? 'subject' : 'done';
};
