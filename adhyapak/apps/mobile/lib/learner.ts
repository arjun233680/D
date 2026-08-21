import {
  fetchLearnerExamIds as fetchExamIdsRemote,
  fetchLearnerLevelIds as fetchLevelIdsRemote,
  fetchLearnerSubjects as fetchSubjectsRemote,
} from '@adhyapak/core';

/**
 * The learner's three onboarding answers, with a way to stand them in while the
 * door is being worked on.
 *
 * WHY THIS EXISTS
 *
 * Everything past the login screen is scoped to a signed-in learner: the
 * dashboard, Study, the whole preparation section and the PYQ browser all begin
 * by asking which exams, levels and subjects this person chose, and row-level
 * security answers "none" to anyone without a session. So with sign-in
 * unavailable — no SMS provider, and Google needing a secure origin — none of
 * those screens could be opened at all, by anybody. Not to review the design,
 * not to screenshot, not to check a layout at 360pt.
 *
 * With `EXPO_PUBLIC_DEV_PREVIEW=1` in apps/mobile/.env, the gate opens and
 * these three reads answer with one selection so the app is walkable.
 *
 * WHAT IS AND IS NOT FAKE
 *
 * Only the three answers. Every exam, level, subject, topic, paper, question
 * and year still comes from the database over the anon key, because that
 * content is public and reads fine without a session — so what you are looking
 * at is the real HTET TGT Science syllabus, not a mock of one. Nothing is
 * written: `saveLearner*` is untouched and still needs a real session, so the
 * preview cannot corrupt anybody's account.
 *
 * WHY AN ENV FLAG RATHER THAN A COMMENT
 *
 * The obvious move is to comment the gate out, and it is the wrong one: a
 * commented-out gate is one careless commit away from shipping, and the deploy
 * runs on every push to main. `.env` is git-ignored, so this cannot reach the
 * live build even by accident. Turn it off by deleting the line.
 */

const flag = (): string | undefined => {
  try {
    return process.env.EXPO_PUBLIC_DEV_PREVIEW;
  } catch {
    // `process` may not exist and the name may not have been inlined, which is
    // a roundabout way of saying the flag was not set at build time.
    return undefined;
  }
};

/** True only when the flag was explicitly set to 1 in a local .env. */
export const isDevPreview = (): boolean => flag()?.trim() === '1';

/**
 * The selection the preview stands in.
 *
 * HTET TGT Science, because it is the one the content is richest for — seven
 * paper sections, a composite Science section with three parts, and seven years
 * of previous papers — so the screens have something real to render rather than
 * a row of empty states.
 */
const PREVIEW = {
  examIds: ['htet'],
  levelIds: ['tgt'],
  subjects: [{ levelId: 'tgt', subjectId: 'science' }],
};

export const fetchLearnerExamIds = async (): Promise<string[]> => {
  const real = await fetchExamIdsRemote();
  // The real answer wins whenever there is one, so a signed-in developer sees
  // their own selections and not the stand-in.
  if (real.length > 0 || !isDevPreview()) return real;
  return PREVIEW.examIds;
};

export const fetchLearnerLevelIds = async (): Promise<string[]> => {
  const real = await fetchLevelIdsRemote();
  if (real.length > 0 || !isDevPreview()) return real;
  return PREVIEW.levelIds;
};

export const fetchLearnerSubjects = async (): Promise<
  { levelId: string; subjectId: string }[]
> => {
  const real = await fetchSubjectsRemote();
  if (real.length > 0 || !isDevPreview()) return real;
  return PREVIEW.subjects;
};
