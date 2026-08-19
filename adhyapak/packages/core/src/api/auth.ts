import type { Session, Subscription } from '@supabase/supabase-js';
import { getBackend } from './client';

/**
 * Authentication.
 *
 * The single place either app touches `supabase.auth`. Screens import from here
 * and never reach for the client themselves, so adding a sign-in method is a
 * change in this file rather than a change in every screen that has to know
 * about it. Four ways in live here now: phone OTP, Google, and email with a
 * password for staff.
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
  kind:
    | 'no-backend'
    | 'invalid-credentials'
    | 'email-unconfirmed'
    | 'email-taken'
    | 'weak-password'
    | 'rate-limited'
    | 'network'
    | 'oauth-cancelled'
    | 'oauth-unavailable'
    | 'invalid-phone'
    | 'invalid-otp'
    | 'sms-unavailable'
    | 'unknown';
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
 *
 * Exported so the mapping can be tested against the strings GoTrue actually
 * sends. Every entry point here funnels through it, so an unmapped message is
 * the one way an English sentence reaches a Hindi screen — the `unknown` branch
 * renders the raw text for *both* languages. That is not hypothetical: it is
 * what "Email not confirmed" did until a live sign-in surfaced it, and a test
 * that cannot reach this function cannot prove it will not happen again.
 */
export const toAuthError = (raw: unknown): AuthError => {
  const message = raw instanceof Error ? raw.message : String(raw ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return {
      kind: 'invalid-credentials',
      en: 'That email and password did not match an account.',
      hi: 'यह ईमेल और पासवर्ड किसी खाते से मेल नहीं खाते।',
    };
  }
  /*
   * "Email not confirmed" used to fall through to `unknown`, and `unknown`
   * renders the raw message for *both* languages — so a learner reading the app
   * in Hindi was shown an English sentence from GoTrue, which is the one thing
   * `Bilingual` exists to make impossible. It also said nothing about the fix.
   *
   * This is not an edge case: with "Confirm email" on, it is what everybody who
   * signs up and tries to sign in before opening their inbox sees first.
   */
  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return {
      kind: 'email-unconfirmed',
      en: 'Your email is not confirmed yet. Open the link we sent you, then sign in.',
      hi: 'आपका ईमेल अभी पुष्ट नहीं हुआ है। हमने जो लिंक भेजा है उसे खोलें, फिर साइन इन करें।',
    };
  }
  // Sign-up, unlike sign-in, *must* say that an address is taken: the person
  // typing it is trying to create that account, and "something went wrong"
  // leaves them retrying a password they never set. The enumeration this leaks
  // is one Supabase already leaks on this endpoint.
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return {
      kind: 'email-taken',
      en: 'An account with that email already exists. Sign in instead.',
      hi: 'इस ईमेल से खाता पहले से मौजूद है। इसके बजाय साइन इन करें।',
    };
  }
  if (lower.includes('password should be') || lower.includes('weak password')) {
    return {
      kind: 'weak-password',
      en: 'That password is too short. Use at least six characters.',
      hi: 'यह पासवर्ड बहुत छोटा है। कम से कम छह अक्षर लगाएँ।',
    };
  }
  /*
   * The two ways a code can fail read identically to Supabase — "Token has
   * expired or is invalid" covers a mistyped digit and a code that sat too
   * long — so the message has to cover both and point at the way out.
   */
  if (
    lower.includes('token has expired') ||
    lower.includes('invalid otp') ||
    lower.includes('otp_expired') ||
    lower.includes('invalid token')
  ) {
    return {
      kind: 'invalid-otp',
      en: 'That code is wrong or has expired. Ask for a new one.',
      hi: 'यह कोड गलत है या समय समाप्त हो चुका है। नया कोड माँगें।',
    };
  }
  if (lower.includes('invalid phone') || lower.includes('phone number')) {
    return {
      kind: 'invalid-phone',
      en: 'That does not look like a valid mobile number.',
      hi: 'यह वैध मोबाइल नंबर नहीं लगता।',
    };
  }
  /*
   * Phone sign-in needs an SMS provider wired up in the dashboard, which is a
   * setup step rather than anything the aspirant did. Point them at the door
   * that is definitely open, and keep the real cause in `kind` for the logs.
   */
  if (lower.includes('sms') || lower.includes('phone provider')) {
    return {
      kind: 'sms-unavailable',
      en: 'Sign-in by SMS is unavailable right now. Continue with Google instead.',
      hi: 'SMS से साइन इन अभी उपलब्ध नहीं है। इसके बजाय Google से जारी रखें।',
    };
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return {
      kind: 'rate-limited',
      en: 'Too many attempts. Wait a minute and try again.',
      hi: 'बहुत अधिक प्रयास। एक मिनट रुककर पुनः प्रयास करें।',
    };
  }
  /*
   * Both of these are misconfiguration rather than anything the person at the
   * keyboard did: the provider is switched off in the dashboard, or the URL the
   * app asked to come back to is missing from Authentication → URL
   * Configuration. Neither is worth explaining to an aspirant, so the message
   * points at the door that is definitely open — email — while the `kind` keeps
   * the real cause for whoever is reading logs.
   */
  if (
    lower.includes('provider is not enabled') ||
    lower.includes('unsupported provider') ||
    lower.includes('redirect_to') ||
    lower.includes('redirect url')
  ) {
    return {
      kind: 'oauth-unavailable',
      en: 'Google sign-in is unavailable right now. Use your email and password instead.',
      hi: 'Google साइन इन अभी उपलब्ध नहीं है। इसके बजाय अपना ईमेल और पासवर्ड इस्तेमाल करें।',
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
 * Staff accounts are made by hand in the Supabase dashboard and sign in through
 * /studio/sign-in, so this is now the Studio's door rather than the learner's:
 * learners arrive by phone OTP or Google.
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

/**
 * What happened after a successful sign-up.
 *
 * `session` is null when the project has "Confirm email" switched on: the
 * account exists, but nobody is signed in until the link in the inbox is
 * clicked. A screen that assumed a session here would send a learner into an
 * app that thinks they are signed out, so the caller is made to look.
 */
export interface SignUpOutcome {
  state: AuthState;
  /** False when a confirmation email has to be clicked before signing in. */
  session: boolean;
}

/**
 * Creates a learner account.
 *
 * The name is passed as user metadata rather than written to `profiles`
 * afterwards, because the `on_auth_user_created` trigger reads
 * `raw_user_meta_data->>'name'` when it inserts the profile row. Writing it
 * here means the profile is correct from the instant it exists; a follow-up
 * update would leave a window where the learner is "Learner", and would fail
 * outright when the project requires email confirmation and there is no
 * session to authorise the write.
 */
export const signUpWithPassword = async (
  email: string,
  password: string,
  name: string,
): Promise<AuthResult<SignUpOutcome>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  try {
    const { data, error } = await db.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) return { ok: false, error: toAuthError(error) };
    return {
      ok: true,
      value: {
        state: data.session
          ? stateFrom(data.session)
          : { userId: null, email: data.user?.email ?? undefined, backendConfigured: true },
        session: Boolean(data.session),
      },
    };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

/* ------------------------------------------------------------ phone / OTP */

/**
 * Puts a typed Indian mobile number into the E.164 form GoTrue insists on.
 *
 * Aspirants type their number every way there is — `98765 43210`,
 * `+91-98765-43210`, `098765 43210` — and Supabase accepts exactly one of
 * them. Normalising here rather than in the screen means the phone app and the
 * website cannot disagree about what a number is, which is the whole reason
 * this module exists.
 *
 * Returns null when what is left cannot be a mobile number, so the caller can
 * say so without a round trip. The leading zero is dropped because STD-style
 * `0…` is a trunk prefix, not part of the subscriber number.
 */
export const toE164India = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length > 10
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  // Indian mobile numbers are ten digits and never begin 0–5.
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
};

const BAD_PHONE: AuthError = {
  kind: 'invalid-phone',
  en: 'Enter a ten-digit mobile number.',
  hi: 'दस अंकों का मोबाइल नंबर डालें।',
};

/**
 * Sends a one-time code by SMS.
 *
 * `shouldCreateUser` is left at its default of true: an aspirant who has never
 * opened the app before is signing up by doing this, and asking them to pick a
 * "create account" branch first would be a screen that exists only to ask a
 * question the number already answers.
 *
 * Needs an SMS provider configured under Authentication → Providers → Phone.
 * Without one the failure comes back as `sms-unavailable`, which is a setup
 * problem rather than something the person at the keyboard can fix.
 */
export const sendPhoneOtp = async (phone: string): Promise<AuthResult<{ phone: string }>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  const e164 = toE164India(phone);
  if (!e164) return { ok: false, error: BAD_PHONE };

  try {
    const { error } = await db.auth.signInWithOtp({ phone: e164 });
    if (error) return { ok: false, error: toAuthError(error) };
    return { ok: true, value: { phone: e164 } };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

/**
 * Exchanges the code for a session.
 *
 * The number passed here must be the one `sendPhoneOtp` returned, not the one
 * the learner typed: GoTrue matches the code against the E.164 string it sent
 * to, so re-normalising a second time from raw input would be one more chance
 * to disagree with the first.
 */
export const verifyPhoneOtp = async (
  phone: string,
  code: string,
): Promise<AuthResult<AuthState>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  try {
    const { data, error } = await db.auth.verifyOtp({
      phone,
      token: code.replace(/\D/g, ''),
      type: 'sms',
    });
    if (error) return { ok: false, error: toAuthError(error) };
    return { ok: true, value: stateFrom(data.session) };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

/* ----------------------------------------------------------------- Google */

/** What a started OAuth sign-in handed back. */
export interface OAuthStart {
  /**
   * The provider URL to open.
   *
   * Null on the web, where supabase-js has already navigated the page and there
   * is nothing left for the caller to do. Set when `openExternally` was asked
   * for, which is how the phone gets a URL it can hand to an in-app browser.
   */
  url: string | null;
}

const OAUTH_NO_CODE: AuthError = {
  kind: 'oauth-unavailable',
  en: 'Google sent us back without a sign-in code. Try again, or use your email and password.',
  hi: 'Google ने साइन-इन कोड के बिना वापस भेजा। दोबारा कोशिश करें, या ईमेल और पासवर्ड इस्तेमाल करें।',
};

/** The learner closed the browser, which is a choice rather than a failure. */
export const OAUTH_CANCELLED: AuthError = {
  kind: 'oauth-cancelled',
  en: 'Google sign-in was cancelled.',
  hi: 'Google साइन इन रद्द कर दिया गया।',
};

/**
 * Starts Google sign-in.
 *
 * `redirectTo` is a parameter and not something this module works out, because
 * the right answer differs per platform and neither answer belongs in a package
 * that must stay free of platform APIs: the website needs its own origin *plus*
 * the `basePath` Pages serves it under, and the phone needs the `adhyapak://`
 * deep link. Whatever is passed has to be listed in the project's
 * Authentication → URL Configuration, or Supabase refuses the round trip.
 *
 * The two platforms also want opposite things from the browser, which is what
 * `openExternally` selects:
 *
 *   web    — let supabase-js navigate this tab to Google. The session is picked
 *            up on the way back by `detectSessionInUrl`, so no callback screen
 *            has to exist.
 *   mobile — hand the URL back instead, so the app can open it in a system auth
 *            session that closes itself on the redirect, and then finish through
 *            `completeOAuthSignIn`.
 */
export const signInWithGoogle = async (
  redirectTo: string,
  options: { openExternally?: boolean } = {},
): Promise<AuthResult<OAuthStart>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  try {
    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: options.openExternally === true,
      },
    });
    if (error) return { ok: false, error: toAuthError(error) };
    return { ok: true, value: { url: data?.url ?? null } };
  } catch (thrown) {
    return { ok: false, error: toAuthError(thrown) };
  }
};

/**
 * Pulls the PKCE code out of the URL a provider redirected back to.
 *
 * Parsed with a pattern rather than `new URL()` on purpose. The phone's callback
 * is `adhyapak://…`, a custom scheme that the URL parser in some React Native
 * engines will not accept, and `@adhyapak/core` ships no dependencies to paper
 * over that. The code is opaque and single-use, so reading it out of the query
 * string is all there is to it.
 *
 * Exported because a returned-from-Google URL is worth being able to inspect in
 * a test without a network.
 */
export const codeFromCallback = (callbackUrl: string): string | null => {
  const code = /[?&]code=([^&#]+)/.exec(callbackUrl)?.[1];
  return code ? decodeURIComponent(code) : null;
};

/**
 * Finishes a sign-in the app opened itself — the phone's half of the flow.
 *
 * The website never calls this: supabase-js does the same exchange for it when
 * the page reloads on the callback URL.
 */
export const completeOAuthSignIn = async (
  callbackUrl: string,
): Promise<AuthResult<AuthState>> => {
  const db = getBackend();
  if (!db) return { ok: false, error: NO_BACKEND };

  const code = codeFromCallback(callbackUrl);
  if (!code) return { ok: false, error: OAUTH_NO_CODE };

  try {
    const { data, error } = await db.auth.exchangeCodeForSession(code);
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
