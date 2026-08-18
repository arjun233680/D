import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Deliberately the same shape as apps/web/lib/store.tsx — same keys, same
 * actions, same write-through — so a screen written for one app ports to the
 * other by swapping only the presentation primitives.
 *
 * The learner belongs to Postgres whenever somebody is signed in: goal,
 * language, bookmarks, saved notes, enrolments and practised days are rows,
 * read through `getCurrentUser()` and written back through the repository. Only
 * the paper in progress is genuinely local, so a phone that loses signal
 * mid-test does not lose the clock.
 */

const STORAGE_KEY = 'adhyapak.state.v1';

interface PersistedState {
  lang: Lang;
  user: User;
  attempts: Record<string, TestAttempt>;
  results: Record<string, TestResult>;
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
   * Whether the learner in state came from the database. A ref, not state:
   * every write-through reads it, and a callback reading it from state would
   * see whichever value it closed over.
   */
  const remote = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        setState((prev) => ({ ...prev, ...parsed, user: { ...prev.user, ...parsed.user } }));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Follows the signed-in account, on mount and on every auth change.
   */
  useEffect(() => {
    let live = true;

    const unsubscribe = onAuthStateChange((auth) => {
      if (!auth.userId) {
        // Signing out clears the cache as well as the state. A shared phone is
        // the normal case here, not the edge case: leaving the learner in
        // storage would hand the next person the previous one's progress.
        if (remote.current) {
          remote.current = false;
          void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
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
          setState((s) => ({ ...s, user, lang: user.language }));
        })
        .catch(() => {
          // A failed fetch is not a sign-out — patchy signal is the norm.
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  /**
   * Sends a change to Postgres when there is a signed-in learner to send it
   * for. Not awaited: the local state has already moved, and on a patchy
   * connection a learner would otherwise wait on the network to bookmark a
   * question. A failed write leaves the change local, exactly as offline.
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
      // Only the columns a learner owns. `signedIn` and `onboarded` are routing
      // state; id, role and subscription are the database's to decide.
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

  const saveResult = useCallback(
    (result: TestResult) => {
      setState((s) => ({ ...s, results: { ...s.results, [result.testId]: result } }));
    },
    [state.user],
  );

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
