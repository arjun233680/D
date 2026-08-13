'use client';

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
 * Client-side application state.
 *
 * Everything here is what a backend would own: the signed-in user, saved
 * attempts, bookmarks and uploads. It persists to localStorage so a refresh
 * mid-test does not lose the paper — the same contract a server would give.
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

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota errors are non-fatal; the session simply stays in memory.
    }
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
    setState((s) => ({
      ...s,
      user: { ...s.user, savedNoteIds: toggle(s.user.savedNoteIds, noteId) },
    }));
  }, []);

  const toggleEnrolment = useCallback((batchId: string) => {
    setState((s) => ({
      ...s,
      user: { ...s.user, enrolledBatchIds: toggle(s.user.enrolledBatchIds, batchId) },
    }));
  }, []);

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
      setLang,
      toggleLang,
      setGoal,
      toggleBookmark,
      toggleSavedNote,
      toggleEnrolment,
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
