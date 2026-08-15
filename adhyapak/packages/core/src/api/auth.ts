import type { Session, Subscription } from '@supabase/supabase-js';
import { getBackend } from './client';

/**
 * Authentication.
 *
 * The single place either app touches `supabase.auth`. Screens import from here
 * and never reach for the client themselves, so adding a sign-in method — P3
 * brings Google and phone OTP — is a change in this file rather than a change
 * in every screen that has to know about it.
 *
 * Two shapes hold that promise:
 *
 *   Every entry point returns `AuthResult`, never throws, and carries a message
 *   already written for a human in both languages. A screen renders
 *   `result.error` and does not need to know that Supabase says
 *   "Invalid login credentials" for a wrong password *and* for an account that
 *   does not exist.
 *
 *   `AuthState` describes who is signed in without describing how they signed
 *   in. A screen that renders it keeps working when the method list grows.
 *
 * Nothing here decides what a user may *do*. Roles live in `profiles` and are
 * enforced by row-level security; `isStaff()` in ./repository reads them. Being
 * signed in and being allowed are different questions, and the Studio has to
 * tell a learner apart from an educator apart from a missing database.
 */

/** A human-readable failure, in both languages, ready to render. */
export interface AuthError {
  /** Machine-readable, for the rare caller that branches on the cause. */
  kind: 'no-backend' | 'invalid-credentials' | 'rate-limited' | 'network' | 'unknown';
  en: string;
  hi: string;
}

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; error: AuthError };

/** Who is signed in, with no mention of how they signed in. */
export interface AuthState {
  /** Null when signed out, or when no backend is configured at all. */
  userId: string | null;
  email?: string;
  /** False when the app is running on bundled content with no project. */
  backendConfigured: boolean;
}

const NO_BACKEND: AuthError = {
  kind: 'no-backend',
  en: 'This build has no database configured, so signing in is not possible.',
  hi: 'इस बिल्ड में कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए साइन इन संभव नहीं है।',
};

/**
 * Turns whatever Supabase reported into something worth showing someone.
 *
 * Deliberately does not distinguish "no such account" from "wrong password":
 * the API does not, and inventing the distinction would leak which email
 * addresses exist.
 */
const toAuthError = (raw: unknown): AuthError => {
  const message = raw instanceof Error ? raw.message : String(raw ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return {
      kind: 'invalid-credentials',
      en: 'That email and password did not match an account.',
      hi: 'यह ईमेल और पासवर्ड किसी खाते से मेल नहीं खाते।',
    };
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return {
      kind: 'rate-limited',
      en: 'Too many attempts. Wait a minute and try again.',
      hi: 'बहुत अधिक प्रयास। एक मिनट रुककर पुनः प्रयास करें।',
    };
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('timeout')) {
    return {
      kind: 'network',
      en: 'Could not reach the server. Check your connection and try again.',
      hi: 'सर्वर तक नहीं पहुँच सके। अपना कनेक्शन जाँचकर पुनः प्रयास करें।',
    };
  }
  return {
    kind: 'unknown',
    en: message || 'Sign-in failed for an unknown reason.',
    hi: message || 'अज्ञात कारण से साइन इन विफल रहा।',
  };
};

const stateFrom = (session: Session | null): AuthState => ({
  userId: session?.user?.id ?? null,
  email: session?.user?.email ?? undefined,
  backendConfigured: true,
});

/* ------------------------------------------------------------- reading */

/** Who is signed in right now. Never throws; offline reads as signed out. */
export const getSession = async (): Promise<AuthState> => {
  const db = getBackend();
  if (!db) return { userId: null, backendConfigured: false };
  try {
    const { data } = await db.auth.getSession();
    return stateFrom(data.session);
  } catch {
    return { userId: null, backendConfigured: true };
  }
};

/**
 * Calls back whenever the signed-in user changes, and returns an unsubscribe.
 *
 * The unsubscribe is always callable, including when there is no backend, so a
 * caller's cleanup path needs no special case.
 */
export const onAuthStateChange = (listener: (state: AuthState) => void): (() => void) => {
  const db = getBackend();
  if (!db) {
    listener({ userId: null, backendConfigured: false });
    return () => {};
  }

  let subscription: Subscription | undefined;
  try {
    const { data } = db.auth.onAuthStateChange((_event, session) => listener(stateFrom(session)));
    subscription = data.subscription;
  } catch {
    // A backend that cannot be subscribed to still has a current session.
  }
  void getSession().then(listener);
  return () => subscription?.unsubscribe();
};

/* ------------------------------------------------------------- writing */

/**
 * Email and password.
 *
 * The method the Studio uses today, because an operator account is created by
 * hand in the Supabase dashboard and has a password. P3 adds the methods a
 * learner will actually use; this one stays for staff.
 */
export const signInWithPassword = async (
  email: string,
  password: string,
): Promise<AuthResult<AuthState>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: toAuthError(error) };
    return { ok: true, value: stateFrom(data.session) };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

export const signOut = async (): Promise<AuthResult> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };
  try {
    const { error } = await db.auth.signOut();
    if (error) return { ok: false, error: toAuthError(error) };
    return { ok: true, value: undefined };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

/* ------------------------------------------------------- access, not identity */

/**
 * What the Studio is allowed to do, as one value.
 *
 * Three states that look identical from a screen that only checks a boolean,
 * and which need three different sentences: there is no database at all, or
 * nobody is signed in, or somebody is signed in who is not staff. Conflating
 * them is why a blocked import used to read as a missing database.
 */
export type StudioAccess =
  | { kind: 'no-backend' }
  | { kind: 'signed-out' }
  | { kind: 'not-staff'; email?: string }
  | { kind: 'staff'; userId: string; email?: string };

/**
 * Resolves the three states in one round trip.
 *
 * `isStaff` is injected rather than imported so this module stays free of the
 * repository — auth answers who you are, the repository answers what your role
 * is, and neither should have to import the other.
 */
export const resolveStudioAccess = async (
  isStaff: () => Promise<boolean>,
): Promise<StudioAccess> => {
  const session = await getSession();
  if (!session.backendConfigured) return { kind: 'no-backend' };
  if (!session.userId) return { kind: 'signed-out' };
  return (await isStaff())
    ? { kind: 'staff', userId: session.userId, email: session.email }
    : { kind: 'not-staff', email: session.email };
};
