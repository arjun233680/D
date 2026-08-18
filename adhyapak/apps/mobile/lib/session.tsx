import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  OAUTH_CANCELLED,
  completeOAuthSignIn,
  examTheme,
  getExam,
  getPaper,
  signInWithGoogle as startGoogleSignIn,
  signInWithPassword,
  signOut as signOutRemote,
  signUpWithPassword,
  subjectsForPaperOrEmpty,
  theme,
  type AuthResult,
  type AuthState,
  type ExamTheme,
  type Lang,
  type SignUpOutcome,
} from '@adhyapak/core';
import { useStore } from './store';

// Closes the pop-up left behind when this same code runs on the Expo web build.
// A no-op on a real device, and cheap enough not to be worth branching on.
WebBrowser.maybeCompleteAuthSession();

/**
 * Who the learner is, and what they are preparing for.
 *
 * The goal is not a preference buried in settings — it decides the app's accent
 * colour, which subjects appear, which batches and tests are offered, and which
 * paper the mock tests imitate. Every screen reads it from here.
 *
 * Signing in is real now. `signIn` used to take a *name* and write it to local
 * state: there was no account, no password and nothing on a server, so the
 * "sign in" a learner performed at 11pm produced progress that could never
 * reach a second device. It now goes through Supabase, and the store — which is
 * subscribed to the same auth events — replaces the local learner with the one
 * from the database.
 *
 * Continuing without an account survives all of that, deliberately. An aspirant
 * downloading a prep app should reach the question bank in two taps, and the
 * bundled bank has never needed an account.
 */

export interface Session {
  /** False until the learner has signed in or chosen to continue without an account. */
  signedIn: boolean;
  /** Signed in locally with no account behind it: nothing here will sync. */
  guest: boolean;
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
  signIn: (email: string, password: string) => Promise<AuthResult<AuthState>>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult<SignUpOutcome>>;
  /** Opens Google in a system auth session and finishes the exchange. */
  signInWithGoogle: () => Promise<AuthResult<AuthState>>;
  continueAsGuest: () => void;
  chooseGoal: (examId: string, paperId?: string, electiveSubjectId?: string) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, lang, setGoal, patchUser } = useStore();

  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];

  /**
   * Signs in and gets out of the way.
   *
   * Nothing is written to local state on success: the store is subscribed to
   * the same auth change and is already fetching the profile. Patching a name
   * here as well would race that fetch and could leave the typed value sitting
   * on top of the one the database holds.
   */
  const signIn = useCallback(
    (email: string, password: string) => signInWithPassword(email, password),
    [],
  );

  const signUp = useCallback(
    (email: string, password: string, name: string) => signUpWithPassword(email, password, name),
    [],
  );

  /**
   * Google, on a phone.
   *
   * Three steps rather than the website's one, because a native app cannot just
   * navigate itself away and come back:
   *
   *   1. ask Supabase for the provider URL instead of following it, which is
   *      what `openExternally` means;
   *   2. open it in the system's auth session — the tab that already holds the
   *      person's Google cookies, and that closes itself the moment the redirect
   *      fires. A plain `Linking.openURL` would leave them in a browser app with
   *      no way back;
   *   3. exchange the code the redirect carried for a real session.
   *
   * `Linking.createURL` builds the return address rather than a hard-coded
   * `adhyapak://`, because Expo Go serves the app from an `exp://` URL during
   * development and a literal scheme would break every device test before the
   * app is ever built standalone.
   *
   * A dismissed browser is not an error worth styling as one — it is somebody
   * changing their mind — but the caller still has to stop showing a spinner,
   * so it comes back as a normal failed `AuthResult` with its own kind.
   */
  const signInWithGoogle = useCallback(async (): Promise<AuthResult<AuthState>> => {
    const redirectTo = Linking.createURL('auth-callback');

    const started = await startGoogleSignIn(redirectTo, { openExternally: true });
    if (!started.ok) return started;
    if (!started.value.url) return { ok: false, error: OAUTH_CANCELLED };

    const opened = await WebBrowser.openAuthSessionAsync(started.value.url, redirectTo);
    if (opened.type !== 'success') return { ok: false, error: OAUTH_CANCELLED };

    return completeOAuthSignIn(opened.url);
  }, []);

  /**
   * Uses the app with no account at all.
   *
   * `signedIn` here means "past the door", not "authenticated" — it is what the
   * gate in _layout reads. No name is invented: the old version set 'Guest',
   * which then appeared in the greeting on the home screen as though somebody
   * had typed it.
   */
  const continueAsGuest = useCallback(() => {
    patchUser({ signedIn: true });
  }, [patchUser]);

  const chooseGoal = useCallback(
    (examId: string, paperId?: string, electiveSubjectId?: string) => {
      // `setGoal` writes `set_goal` through for a signed-in learner and stays
      // local for a guest, so this is one call either way.
      setGoal(examId, paperId, electiveSubjectId);
      patchUser({ onboarded: true });
    },
    [setGoal, patchUser],
  );

  /**
   * Signs out of both halves.
   *
   * The remote sign-out is what clears the Supabase session and triggers the
   * store to drop the cached learner. The local patch is still needed: a guest
   * has no session to end, and without it the gate would leave them inside the
   * app they just asked to leave.
   */
  const signOut = useCallback(async () => {
    await signOutRemote();
    patchUser({ signedIn: false, onboarded: false });
  }, [patchUser]);

  const value = useMemo<Session>(
    () => ({
      signedIn: Boolean(user.signedIn),
      guest: Boolean(user.signedIn) && !user.id,
      onboarded: Boolean(user.onboarded),
      palette: examTheme(exam?.color ?? theme.color.primary),
      examName: exam ? exam.name[lang] : '',
      examShortName: exam?.shortName ?? '',
      paperName: paper ? paper.name[lang] : null,
      subjectIds: subjectsForPaperOrEmpty(paper?.id, user.electiveSubjectId),
      lang,
      signIn,
      signUp,
      signInWithGoogle,
      continueAsGuest,
      chooseGoal,
      signOut,
    }),
    [
      user.signedIn,
      user.id,
      user.onboarded,
      user.electiveSubjectId,
      exam,
      paper,
      lang,
      signIn,
      signUp,
      signInWithGoogle,
      continueAsGuest,
      chooseGoal,
      signOut,
    ],
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
