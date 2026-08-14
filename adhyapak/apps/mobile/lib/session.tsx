import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  examTheme,
  getExam,
  getPaper,
  subjectsForPaperOrEmpty,
  theme,
  type ExamTheme,
  type Lang,
} from '@adhyapak/core';
import { useStore } from './store';

/**
 * Who the learner is, and what they are preparing for.
 *
 * The goal is not a preference buried in settings — it decides the app's accent
 * colour, which subjects appear, which batches and tests are offered, and which
 * paper the mock tests imitate. Every screen reads it from here.
 */

export interface Session {
  /** False until the learner has signed in or chosen to continue without an account. */
  signedIn: boolean;
  /** False until a goal exam has been picked. Gates the whole app. */
  onboarded: boolean;
  /** Accent derived from the chosen exam, so CTET and REET look different. */
  palette: ExamTheme;
  examName: string;
  examShortName: string;
  paperName: string | null;
  /** Subject ids the chosen paper actually tests. */
  subjectIds: string[];
  lang: Lang;
  signIn: (name: string, phoneOrEmail?: string) => void;
  continueAsGuest: () => void;
  chooseGoal: (examId: string, paperId?: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, lang, setGoal, patchUser } = useStore();

  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];

  const signIn = useCallback(
    (name: string, phoneOrEmail?: string) => {
      const isEmail = phoneOrEmail?.includes('@');
      patchUser({
        name: name.trim() || 'Learner',
        signedIn: true,
        email: isEmail ? phoneOrEmail : undefined,
        phone: isEmail ? undefined : phoneOrEmail,
      });
    },
    [patchUser],
  );

  const continueAsGuest = useCallback(() => {
    patchUser({ signedIn: true, name: 'Guest' });
  }, [patchUser]);

  const chooseGoal = useCallback(
    (examId: string, paperId?: string) => {
      setGoal(examId, paperId);
      patchUser({ onboarded: true });
    },
    [setGoal, patchUser],
  );

  const signOut = useCallback(() => {
    patchUser({ signedIn: false, onboarded: false });
  }, [patchUser]);

  const value = useMemo<Session>(
    () => ({
      signedIn: Boolean(user.signedIn),
      onboarded: Boolean(user.onboarded),
      palette: examTheme(exam?.color ?? theme.color.primary),
      examName: exam ? exam.name[lang] : '',
      examShortName: exam?.shortName ?? '',
      paperName: paper ? paper.name[lang] : null,
      subjectIds: subjectsForPaperOrEmpty(paper?.id, user.electiveSubjectId),
      lang,
      signIn,
      continueAsGuest,
      chooseGoal,
      signOut,
    }),
    [user.signedIn, user.onboarded, user.electiveSubjectId, exam, paper, lang, signIn, continueAsGuest, chooseGoal, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** Shorthand for screens that only need the exam's accent. */
export const usePalette = (): ExamTheme => useSession().palette;
