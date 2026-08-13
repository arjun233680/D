import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEMO_USER,
  type Lang,
  type Note,
  type TestAttempt,
  type TestResult,
  type User,
  type Video,
} from '@adhyapak/core';

/**
 * Deliberately the same shape as apps/web/lib/store.tsx — same keys, same
 * actions — so a screen written for one app ports to the other by swapping
 * only the presentation primitives.
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
  lang: DEMO_USER.language,
  user: DEMO_USER,
  attempts: {},
  results: {},
  uploadedVideos: [],
  uploadedNotes: [],
};

interface Store extends PersistedState {
  ready: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  setGoal: (examId: string, paperId?: string) => void;
  toggleBookmark: (questionId: string) => void;
  toggleSavedNote: (noteId: string) => void;
  toggleEnrolment: (batchId: string) => void;
  /** Shallow-merges fields onto the signed-in learner. */
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

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  const setLang = useCallback((lang: Lang) => {
    setState((s) => ({ ...s, lang, user: { ...s.user, language: lang } }));
  }, []);

  const toggleLang = useCallback(() => {
    setState((s) => {
      const lang: Lang = s.lang === 'hi' ? 'en' : 'hi';
      return { ...s, lang, user: { ...s.user, language: lang } };
    });
  }, []);

  const setGoal = useCallback((examId: string, paperId?: string) => {
    setState((s) => ({ ...s, user: { ...s.user, goalExamId: examId, targetPaperId: paperId } }));
  }, []);

  const toggleBookmark = useCallback((questionId: string) => {
    setState((s) => ({
      ...s,
      user: { ...s.user, bookmarkedQuestionIds: toggle(s.user.bookmarkedQuestionIds, questionId) },
    }));
  }, []);

  const toggleSavedNote = useCallback((noteId: string) => {
    setState((s) => ({ ...s, user: { ...s.user, savedNoteIds: toggle(s.user.savedNoteIds, noteId) } }));
  }, []);

  const toggleEnrolment = useCallback((batchId: string) => {
    setState((s) => ({
      ...s,
      user: { ...s.user, enrolledBatchIds: toggle(s.user.enrolledBatchIds, batchId) },
    }));
  }, []);

  const patchUser = useCallback((patch: Partial<User>) => {
    setState((s) => ({ ...s, user: { ...s.user, ...patch } }));
  }, []);

  const saveAttempt = useCallback((attempt: TestAttempt) => {
    setState((s) => ({ ...s, attempts: { ...s.attempts, [attempt.testId]: attempt } }));
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
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
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
