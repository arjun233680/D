import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { Platform } from 'react-native';
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
  /**
   * Whether there is an account behind this session.
   *
   * There is no longer a third state. Continuing without an account used to be
   * a first-class path — the product decision was that an aspirant downloading
   * a prep app at 11pm should reach the question bank in two taps — and it has
   * been withdrawn: the app is behind sign-in now, so `signedIn` means a real
   * profile row rather than "past the door".
   */
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
  signIn: (email: string, password: string) => Promise<AuthResult<AuthState>>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult<SignUpOutcome>>;
  /** Opens Google in a system auth session and finishes the exchange. */
  signInWithGoogle: () => Promise<AuthResult<AuthState>>;
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
   * Google.
   *
   * Two code paths, because a browser and a phone come back from a provider in
   * genuinely different ways — and running the phone's path in a browser is
   * what broke this for a week.
   *
   * ON THE WEB
   *
   * Supabase navigates the tab to Google itself and the browser comes back to
   * `redirectTo` carrying `?code=`; supabase-js has `detectSessionInUrl` on by
   * default, so it exchanges that code during the next load without anybody
   * asking it to. Nothing here has to open a window or read a URL, which is the
   * whole point: `WebBrowser.openAuthSessionAsync` used to run here and cost
   * three separate failures.
   *
   *   - It opens a second window. Inside the phone-frame preview that window is
   *     full desktop width, so a finished sign-in looked like the app had
   *     "jumped to the web layout".
   *   - It needs WebCrypto, and WebCrypto only exists in a secure context. Over
   *     `http://<lan-ip>:8081` — how anybody tests on a real handset — there is
   *     no `crypto.subtle`, so it threw "the current environment doesn't support
   *     crypto" and no amount of app code could have fixed it.
   *   - Google refuses to render inside an iframe, so the popup was the only
   *     thing that worked there at all, and it worked badly.
   *
   * The return address is the page the learner is standing on, minus any query
   * or hash. That is deliberately not `Linking.createURL('auth-callback')`:
   * on web that helper ignores the app's `baseUrl`, so it produced
   * `/auth-callback` for a build served from `/D/` and sent the browser
   * somewhere the app is not. Returning to the current page needs no knowledge
   * of the base path and is correct on localhost and on Pages alike.
   *
   * ON A DEVICE
   *
   * A native app cannot navigate itself away and come back, so it keeps the
   * three-step dance: ask for the provider URL rather than following it, open
   * the system auth session — the tab that already holds the person's Google
   * cookies and closes itself when the redirect fires — then exchange the code.
   * `Linking.createURL` is right here, where there is no base path and the
   * scheme differs between Expo Go and a standalone build.
   *
   * A dismissed browser is not an error worth styling as one — it is somebody
   * changing their mind — but the caller still has to stop showing a spinner,
   * so it comes back as a normal failed `AuthResult` with its own kind.
   */
  const signInWithGoogle = useCallback(async (): Promise<AuthResult<AuthState>> => {
    if (Platform.OS === 'web') {
      const { origin, pathname } = window.location;
      const returnTo = `${origin}${pathname}`;

      /*
       * Google refuses to be framed — it answers a request whose top-level
       * document is somebody else's page with a bare 403 — so inside the
       * phone-size preview the iframe cannot be the thing that navigates.
       * `window.top !== window.self` is the only reliable test, and it throws
       * on a cross-origin parent, which is itself the answer.
       */
      let framed = false;
      try {
        framed = window.top !== window.self;
      } catch {
        framed = true;
      }

      const started = await startGoogleSignIn(returnTo, { openExternally: framed });
      if (!started.ok) return started;

      if (framed) {
        // A real top-level window, because that is the only context Google will
        // draw in. The session lands in localStorage against this same origin,
        // so the frame picks it up on its next load.
        if (!started.value.url) return { ok: false, error: OAUTH_CANCELLED };
        window.open(started.value.url, '_blank', 'noopener,noreferrer');
        return { ok: false, error: OAUTH_CANCELLED };
      }

      /*
       * Not framed: `skipBrowserRedirect` was off, so supabase-js has already
       * begun navigating this tab away. There is no session to return — this
       * page is being torn down — and the caller must not reset its spinner, or
       * the button flickers back to life on the way out.
       */
      return { ok: false, error: OAUTH_CANCELLED };
    }

    const redirectTo = Linking.createURL('auth-callback');

    const started = await startGoogleSignIn(redirectTo, { openExternally: true });
    if (!started.ok) return started;
    if (!started.value.url) return { ok: false, error: OAUTH_CANCELLED };

    const opened = await WebBrowser.openAuthSessionAsync(started.value.url, redirectTo);
    if (opened.type !== 'success') return { ok: false, error: OAUTH_CANCELLED };

    return completeOAuthSignIn(opened.url);
  }, []);

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
      // Both halves: the local flag says they came through the door, the id
      // says an account is behind it. Without the id there is nothing to sync
      // to and nothing to come back to on another device.
      signedIn: Boolean(user.signedIn && user.id),
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
