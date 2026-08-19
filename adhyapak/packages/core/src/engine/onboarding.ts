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
): OnboardingStep => {
  if (examIds.length === 0) return 'exams';
  if (levelIds.length === 0) return 'level';

  const owes = levels.some(
    (level) =>
      level.requiresSubject &&
      levelIds.includes(level.id) &&
      !subjects.some((s) => s.levelId === level.id),
  );
  return owes ? 'subject' : 'done';
};
