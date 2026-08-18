'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  GUEST_USER,
  getCurrentUser,
  markActiveTodayRemote,
  onAuthStateChange,
  setGoalRemote,
  toggleBookmarkRemote,
  toggleEnrolmentRemote,
  toggleSavedNoteRemote,
  updateProfileRemote,
  type Lang,
  type Note,
  type TestAttempt,
  type TestResult,
  type User,
  type Video,
} from '@adhyapak/core';

/**
 * Client-side application state.
 *
 * Two things live here and they are not the same kind of thing.
 *
 * The **learner** is owned by Postgres whenever somebody is signed in. Their
 * goal, language, bookmarks, saved notes, enrolments and practised days are
 * rows this store reads through `getCurrentUser()` and writes back through the
 * repository. It used to be the other way round — the learner existed only in
 * `localStorage`, so signing in on a second device produced a stranger with no
 * streak and no bookmarks, and the columns built to hold all of it were never
 * written to once.
 *
 * The **paper in progress** is genuinely local. An attempt mid-flight is kept
 * here so a refresh does not lose the clock, and results are cached so the
 * review screen renders instantly.
 *
 * Signed out, or with no database in the build, everything falls back to
 * `localStorage` and the app works as it always did — that is the fallback
 * working, not a degraded mode.
 */

const STORAGE_KEY = 'adhyapak.state.v1';

interface PersistedState {
  lang: Lang;
  user: User;
  /** In-progress attempts, keyed by test id. */
  attempts: Record<string, TestAttempt>;
  /** Graded results, keyed by test id — the latest attempt wins. */
  results: Record<string, TestResult>;
  /** Content added through the Educator Studio in this browser. */
  uploadedVideos: Video[];
  uploadedNotes: Note[];
}

const initialState: PersistedState = {
  lang: GUEST_USER.language,
  user: GUEST_USER,
  attempts: {},
  results: {},
  uploadedVideos: [],
  uploadedNotes: [],
};

interface Store extends PersistedState {
  ready: boolean;
  /** True while the signed-in learner is being fetched from the database. */
  syncing: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setGoal: (examId: string, paperId?: string, electiveSubjectId?: string) => void;
  toggleBookmark: (questionId: string) => void;
  toggleSavedNote: (noteId: string) => void;
  toggleEnrolment: (batchId: string) => void;
  /** Shallow-merges fields onto the learner, and saves the ones they own. */
  patchUser: (patch: Partial<User>) => void;
  saveAttempt: (attempt: TestAttempt) => void;
  clearAttempt: (testId: string) => void;
  saveResult: (result: TestResult) => void;
  addVideo: (video: Video) => void;
  addNote: (note: Note) => void;
  markActiveToday: () => void;
}

const StoreContext = createContext<Store | null>(null);

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /**
   * Whether the learner in state came from the database.
   *
   * A ref rather than state because every write-through reads it, and a
   * `useCallback` reading it from state would see whichever value it closed
   * over — a bookmark tapped moments after signing in would take the offline
   * branch and never reach Postgres.
   */
  const remote = useRef(false);

  // Hydrate after mount so server and client render the same first pass.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState((prev) => ({ ...prev, ...parsed, user: { ...prev.user, ...parsed.user } }));
      }
    } catch {
      // Corrupt or unavailable storage should never block the app.
    }
    setReady(true);
  }, []);

  /**
   * Follows the signed-in account.
   *
   * Fires on mount and on every auth change, so signing in updates a tab that
   * was already open, and signing out empties this one rather than leaving
   * somebody else's bookmarks on screen.
   */
  useEffect(() => {
    let live = true;

    const unsubscribe = onAuthStateChange((auth) => {
      if (!auth.userId) {
        // Signing out clears the cache as well as the state: leaving the
        // learner in localStorage would hand the next person to open this
        // browser the previous one's goal, bookmarks and streak.
        if (remote.current) {
          remote.current = false;
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Nothing worth blocking a sign-out for.
          }
          setState((s) => ({ ...s, user: GUEST_USER }));
        }
        setSyncing(false);
        return;
      }

      setSyncing(true);
      void getCurrentUser()
        .then((user) => {
          if (!live || !user) return;
          remote.current = true;
          // The database is the authority for the learner, and the language
          // travels with them: it is a column, and the header toggle writes it.
          setState((s) => ({ ...s, user, lang: user.language }));
        })
        .catch(() => {
          // A failed fetch is not a sign-out. The cached learner stays on
          // screen and the next auth event tries again.
        })
        .finally(() => {
          if (live) setSyncing(false);
        });
    });

    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota errors are non-fatal; the session simply stays in memory.
    }
  }, [state, ready]);

  /**
   * Sends a change to Postgres when there is a signed-in learner to send it for.
   *
   * Deliberately not awaited. The local state has already moved — a bookmark
   * fills in the moment it is tapped — and nobody should watch a spinner on a
   * network round trip for that. A failed write leaves the change local, which
   * is the same state the app is in offline, and the next sign-in re-reads the
   * row rather than trusting this copy.
   */
  const push = useCallback((write: () => Promise<unknown>) => {
    if (!remote.current) return;
    void write().catch(() => undefined);
  }, []);

  const setLang = useCallback(
    (lang: Lang) => {
      setState((s) => ({ ...s, lang, user: { ...s.user, language: lang } }));
      push(() => updateProfileRemote({ language: lang }));
    },
    [push],
  );

  const toggleLang = useCallback(() => {
    setState((s) => {
      const lang: Lang = s.lang === 'hi' ? 'en' : 'hi';
      push(() => updateProfileRemote({ language: lang }));
      return { ...s, lang, user: { ...s.user, language: lang } };
    });
  }, [push]);

  const setGoal = useCallback(
    (examId: string, paperId?: string, electiveSubjectId?: string) => {
      setState((s) => ({
        ...s,
        user: {
          ...s.user,
          goalExamId: examId,
          targetPaperId: paperId,
          // Cleared, not kept, when the new paper has no subject choice — a
          // leftover elective is a subject the paper does not offer.
          electiveSubjectId,
          onboarded: true,
        },
      }));
      // `set_goal` stamps onboarded_at as well, so a learner who has chosen a
      // goal is never sent back to the picker on their next device.
      push(() => setGoalRemote(examId, paperId, electiveSubjectId));
    },
    [push],
  );

  const toggleBookmark = useCallback(
    (questionId: string) => {
      setState((s) => {
        const on = !s.user.bookmarkedQuestionIds.includes(questionId);
        push(() => toggleBookmarkRemote(questionId, on));
        return {
          ...s,
          user: {
            ...s.user,
            bookmarkedQuestionIds: toggle(s.user.bookmarkedQuestionIds, questionId),
          },
        };
      });
    },
    [push],
  );

  const toggleSavedNote = useCallback(
    (noteId: string) => {
      setState((s) => {
        const on = !s.user.savedNoteIds.includes(noteId);
        push(() => toggleSavedNoteRemote(noteId, on));
        return { ...s, user: { ...s.user, savedNoteIds: toggle(s.user.savedNoteIds, noteId) } };
      });
    },
    [push],
  );

  const toggleEnrolment = useCallback(
    (batchId: string) => {
      setState((s) => {
        const on = !s.user.enrolledBatchIds.includes(batchId);
        push(() => toggleEnrolmentRemote(batchId, on));
        return {
          ...s,
          user: { ...s.user, enrolledBatchIds: toggle(s.user.enrolledBatchIds, batchId) },
        };
      });
    },
    [push],
  );

  const patchUser = useCallback(
    (patch: Partial<User>) => {
      setState((s) => ({ ...s, user: { ...s.user, ...patch } }));
      // Only the columns a learner owns are sent. `signedIn` and `onboarded`
      // are client-side routing state; the id, role and subscription are the
      // database's to decide, and a profile update carrying them would be
      // refused by RLS at best and self-promotion at worst.
      push(() =>
        updateProfileRemote({
          name: patch.name,
          avatar: patch.avatar,
          language: patch.language,
          state: patch.state,
          phone: patch.phone,
          electiveSubjectId: patch.electiveSubjectId,
        }),
      );
    },
    [push],
  );

  const saveAttempt = useCallback((attempt: TestAttempt) => {
    setState((s) => ({ ...s, attempts: { ...s.attempts, [attempt.testId]: attempt } }));
  }, []);

  const clearAttempt = useCallback((testId: string) => {
    setState((s) => {
      const attempts = { ...s.attempts };
      delete attempts[testId];
      return { ...s, attempts };
    });
  }, []);

  const saveResult = useCallback((result: TestResult) => {
    setState((s) => ({ ...s, results: { ...s.results, [result.testId]: result } }));
  }, []);

  const addVideo = useCallback((video: Video) => {
    setState((s) => ({ ...s, uploadedVideos: [video, ...s.uploadedVideos] }));
  }, []);

  const addNote = useCallback((note: Note) => {
    setState((s) => ({ ...s, uploadedNotes: [note, ...s.uploadedNotes] }));
  }, []);

  const markActiveToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((s) =>
      s.user.activeDates.includes(today)
        ? s
        : { ...s, user: { ...s.user, activeDates: [...s.user.activeDates, today] } },
    );
    // `mark_active_today` is `on conflict do nothing`, so repeating it on a day
    // already recorded costs a round trip and changes nothing.
    push(() => markActiveTodayRemote());
  }, [push]);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      syncing,
      setLang,
      toggleLang,
      setGoal,
      toggleBookmark,
      toggleSavedNote,
      toggleEnrolment,
      patchUser,
      saveAttempt,
      clearAttempt,
      saveResult,
      addVideo,
      addNote,
      markActiveToday,
    }),
    [
      state,
      ready,
      syncing,
      setLang,
      toggleLang,
      setGoal,
      toggleBookmark,
      toggleSavedNote,
      toggleEnrolment,
      patchUser,
      saveAttempt,
      clearAttempt,
      saveResult,
      addVideo,
      addNote,
      markActiveToday,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Shorthand for the common `t(text, lang)` pairing. */
export function useLang() {
  const { lang, toggleLang, setLang } = useStore();
  return { lang, toggleLang, setLang };
}
