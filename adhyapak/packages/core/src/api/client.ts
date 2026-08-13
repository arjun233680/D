import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Backend connection.
 *
 * The app runs in two modes and the screens cannot tell them apart:
 *
 *   configured   — reads and writes go to Postgres, grading happens server-side,
 *                  ranks are computed against the real cohort.
 *   offline      — no credentials present, so the bundled researched content is
 *                  served instead. Nothing crashes, nothing is faked as a server
 *                  response, and `isBackendConfigured()` reports which mode is live.
 *
 * Offline is not only a development convenience: aspirants on patchy connections
 * still get the full question bank, and writes resume when the backend returns.
 */

export interface BackendConfig {
  url: string;
  anonKey: string;
}

let client: SupabaseClient | null = null;
let config: BackendConfig | null = null;

/** Reads credentials from whichever environment the caller runs in. */
const fromEnv = (): BackendConfig | null => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.EXPO_PUBLIC_SUPABASE_URL ??
    env.SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    env.SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
};

/**
 * Call once at start-up to hand in credentials explicitly. Not required when
 * they are already in the environment — Next.js and Expo both inline their
 * `*_PUBLIC_*` variables at build time.
 */
export const configureBackend = (next: BackendConfig | null): void => {
  config = next;
  client = null;
};

export const getBackend = (): SupabaseClient | null => {
  if (client) return client;
  const resolved = config ?? fromEnv();
  if (!resolved) return null;
  client = createClient(resolved.url, resolved.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    // The apps are read-heavy; realtime is opted into per screen instead.
    realtime: { params: { eventsPerSecond: 2 } },
  });
  return client;
};

export const isBackendConfigured = (): boolean => Boolean(config ?? fromEnv());

/**
 * Runs a backend query, falling back to bundled content on any failure.
 * A dropped connection degrades to offline rather than to an error screen.
 */
export const withFallback = async <T>(
  query: (db: SupabaseClient) => Promise<T>,
  fallback: () => T,
): Promise<T> => {
  const db = getBackend();
  if (!db) return fallback();
  try {
    return await query(db);
  } catch {
    return fallback();
  }
};
