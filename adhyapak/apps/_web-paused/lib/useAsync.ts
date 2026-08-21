'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs a repository call and reports what the screen needs to render.
 *
 * Every content screen needs the same four things — is it loading, did it fail,
 * is it empty, can I try again — and writing that by hand in each one is how
 * blank screens happen. This is deliberately not a data-fetching library: the
 * repository already handles caching and the offline fallback, so all that is
 * missing is the React state around one promise.
 *
 * `deps` behaves like a `useEffect` dependency list. A result that arrives after
 * the inputs changed is discarded, so switching topics quickly cannot leave the
 * previous topic's questions on screen.
 */
export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  /** Re-runs the call. Wired to the retry button in the error state. */
  retry: () => void;
}

export function useAsync<T>(run: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Identifies the in-flight request so a stale response can be ignored.
  const latest = useRef(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);
    setError(null);

    runRef
      .current()
      .then((result) => {
        if (ticket !== latest.current) return;
        setData(result);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (ticket !== latest.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, loading, error, retry };
}
