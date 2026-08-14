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

/**
 * Reads one build-time variable.
 *
 * The literal text `process.env.NAME` is the point of this function. Next's
 * DefinePlugin and Expo's Metro transform activate credentials by substituting
 * that exact source expression for the value, before the code ever runs. This
 * file used to read `globalThis.process?.env` into a local and then take
 * properties off it, which left the bundlers nothing to match: nothing was
 * inlined, and in a browser — where `process` does not exist — the local was
 * always `{}`. The app was permanently offline no matter what secrets were set.
 *
 * Two things this deliberately does not do:
 *
 * A `typeof process !== 'undefined'` guard would reintroduce the same bug from
 * the other side. After substitution the read is a string literal, but `process`
 * still does not exist in the browser, so the guard would be false and the
 * literal would be thrown away.
 *
 * The reads are wrapped one at a time rather than in a single shared `try`.
 * A bundler only replaces the variables it knows about, so a build always
 * contains a mix: Next inlines `NEXT_PUBLIC_*` and leaves the others as live
 * references. Where those survive as a bare `process`, in a runtime that has
 * none, evaluating one throws — and a single shared block would discard the
 * successfully inlined names alongside it. Next and Expo both happen to ship a
 * `process` shim today, so this is insurance rather than something load-bearing;
 * it costs nothing and it is what stops the next bundler from resurrecting the
 * bug.
 */
const readEnv = (read: () => string | undefined): string | undefined => {
  let value: string | undefined;
  try {
    value = read();
  } catch {
    // `process` is absent and this name was not inlined, which is only ever a
    // roundabout way of saying it was not set at build time.
    return undefined;
  }
  // An unset GitHub Actions secret interpolates to an empty string rather than
  // to nothing, so empty has to mean absent or it would mask the next fallback.
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/** Reads credentials from whichever environment the caller runs in. */
const fromEnv = (): BackendConfig | null => {
  const url =
    readEnv(() => process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    readEnv(() => process.env.EXPO_PUBLIC_SUPABASE_URL) ??
    readEnv(() => process.env.SUPABASE_URL);
  const anonKey =
    readEnv(() => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    readEnv(() => process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
    readEnv(() => process.env.SUPABASE_ANON_KEY);
  return url && anonKey ? { url, anonKey } : null;
};

/**
 * Says once, out loud, which mode the app came up in.
 *
 * `isBackendConfigured()` already reports this, but nothing surfaced it, so a
 * misconfigured build looked exactly like a working one — the app just quietly
 * served bundled content. That is precisely how the inlining bug above survived
 * a deploy. The host is named so two projects can be told apart; the anon key
 * never is.
 */
let announced: 'connected' | 'offline' | null = null;

const announce = (resolved: BackendConfig | null): void => {
  const mode = resolved ? 'connected' : 'offline';
  if (announced === mode) return;
  announced = mode;

  if (resolved) {
    let host = 'the configured project';
    try {
      host = new URL(resolved.url).host;
    } catch {
      // A malformed URL is worth saying plainly rather than crashing the log.
      host = 'an unparseable URL';
    }
    console.info(`[adhyapak] backend connected — ${host}`);
  } else {
    console.info(
      '[adhyapak] backend offline — no credentials in this build, serving bundled content. ' +
        'Set SUPABASE_URL and SUPABASE_ANON_KEY and rebuild; see docs/BACKEND-SETUP.md.',
    );
  }
};

/** The resolved credentials, announcing the mode the first time it settles. */
const resolveConfig = (): BackendConfig | null => {
  const resolved = config ?? fromEnv();
  announce(resolved);
  return resolved;
};

/**
 * Call once at start-up to hand in credentials explicitly. Not required when
 * they are already in the environment — Next.js and Expo both inline their
 * `*_PUBLIC_*` variables at build time.
 */
export const configureBackend = (next: BackendConfig | null): void => {
  config = next;
  client = null;
  // The mode may have just changed, so let it be announced again.
  announced = null;
};

export const getBackend = (): SupabaseClient | null => {
  if (client) return client;
  const resolved = resolveConfig();
  if (!resolved) return null;
  client = createClient(resolved.url, resolved.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
    // The apps are read-heavy; realtime is opted into per screen instead.
    realtime: { params: { eventsPerSecond: 2 } },
  });
  return client;
};

export const isBackendConfigured = (): boolean => Boolean(resolveConfig());

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
