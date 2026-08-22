import {
  fetchLearnerExamIds as fetchExamIdsRemote,
  fetchLearnerLevelIds as fetchLevelIdsRemote,
  fetchLearnerSubjects as fetchSubjectsRemote,
  saveLearnerExamIds as saveExamIdsRemote,
  saveLearnerLevelIds as saveLevelIdsRemote,
  saveLearnerSubject as saveSubjectRemote,
  type WriteOutcome,
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
 * at is the real HTET TGT Science syllabus, not a mock of one.
 *
 * Nothing is written. The saves try the database first and, in preview only,
 * report success when it refuses them for want of a session. They have to:
 * reads alone let step 1 be looked at and no further, because pressing
 * Continue writes, the write is refused, and the flow stops there. That is
 * how a broken continue button on step 2 went three rounds without anybody
 * being able to reach the screen it was broken on.
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
  subjects: [{ examId: 'htet', levelId: 'tgt', subjectId: 'science' }],
};

/**
 * What the walker has chosen this session, held in memory.
 *
 * The stand-in used to be the only answer preview could give, so the flow read
 * back "TGT" no matter what was tapped — and that made a whole branch of
 * onboarding untestable. A learner who takes both TGT and PGT answers the
 * subject question twice, and preview always reported one level, so the second
 * screen never came and the progress bar filled a step early. Both looked like
 * bugs in the flow; neither was.
 *
 * So the softened writes now remember. The seed still answers until something
 * is chosen, and nothing here ever reaches the database — this is preview's
 * own memory, cleared when the page reloads.
 */
const chosen: {
  examIds: string[] | null;
  levelIds: string[] | null;
  subjects: { examId: string; levelId: string; subjectId: string }[] | null;
} = { examIds: null, levelIds: null, subjects: null };

export const fetchLearnerExamIds = async (): Promise<string[]> => {
  const real = await fetchExamIdsRemote();
  // The real answer wins whenever there is one, so a signed-in developer sees
  // their own selections and not the stand-in.
  if (real.length > 0 || !isDevPreview()) return real;
  return chosen.examIds ?? PREVIEW.examIds;
};

export const fetchLearnerLevelIds = async (): Promise<string[]> => {
  const real = await fetchLevelIdsRemote();
  if (real.length > 0 || !isDevPreview()) return real;
  return chosen.levelIds ?? PREVIEW.levelIds;
};

export const fetchLearnerSubjects = async (): Promise<
  { examId: string; levelId: string; subjectId: string }[]
> => {
  const real = await fetchSubjectsRemote();
  if (real.length > 0 || !isDevPreview()) return real;
  return chosen.subjects ?? PREVIEW.subjects;
};


/* ------------------------------------------------------------ the answers */

/**
 * The saves, which in preview report success rather than blocking the walk.
 *
 * The real write is always attempted and its answer always wins — a signed-in
 * developer saves for real. Only a refusal is softened, only under the flag,
 * so the next step opens and the flow can be walked to its end.
 */
const previewOk = (outcome: WriteOutcome, remember: () => void): WriteOutcome => {
  if (outcome.ok || !isDevPreview()) return outcome;
  remember();
  return { ok: true };
};

export const saveLearnerExamIds = async (examIds: readonly string[]): Promise<WriteOutcome> =>
  previewOk(await saveExamIdsRemote(examIds), () => {
    chosen.examIds = [...examIds];
    // A new set of exams invalidates what was answered under the old one.
    chosen.levelIds = null;
    chosen.subjects = null;
  });

export const saveLearnerLevelIds = async (levelIds: readonly string[]): Promise<WriteOutcome> =>
  previewOk(await saveLevelIdsRemote(levelIds), () => {
    chosen.levelIds = [...levelIds];
    chosen.subjects = null;
  });

/**
 * Wrapped for the same reason as the other two.
 *
 * This one went unwrapped, so in preview the subject step's own save was
 * refused outright and the screen showed "could not save your choice" instead
 * of moving to the next level.
 */
export const saveLearnerSubject = async (
  examId: string,
  levelId: string,
  subjectId: string,
): Promise<WriteOutcome> =>
  previewOk(await saveSubjectRemote(examId, levelId, subjectId), () => {
    const rest = (chosen.subjects ?? []).filter(
      (sub) => !(sub.examId === examId && sub.levelId === levelId),
    );
    chosen.subjects = [...rest, { examId, levelId, subjectId }];
  });
