'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  isBackendConfigured,
  isStaff,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthError,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { authRedirectUrl } from '@/lib/authRedirect';

/**
 * Where a learner signs in, and where they make an account.
 *
 * One page rather than two. The two forms differ by a single field, and a
 * learner who mistypes their email on the sign-in form should be one tap from
 * creating the account they meant to — not navigating away and retyping it.
 *
 * The Studio's sign-in is deliberately separate (`/studio/sign-in`): it is for
 * staff accounts created by hand, it explains staff things, and mixing the two
 * would put "you are not an educator" in front of aspirants.
 *
 * This gates the app. It did not used to: the question bank was reachable
 * without an account, on the reasoning that an aspirant should get to it in two
 * taps. That decision has been withdrawn — everything behind this page is
 * scoped to a learner, and a visitor who could see all of it and keep none of
 * it was being shown a product that does not exist for them.
 */

type Mode = 'sign-in' | 'sign-up';

export default function SignInPage() {
  const { lang, user, syncing } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  /** Set when an account was created but a confirmation email has to be clicked. */
  const [confirmSent, setConfirmSent] = useState(false);

  // Read once, at render: this is a build-time fact, not a changing one.
  const noBackend = !isBackendConfigured();
  const signedIn = Boolean(user.signedIn && user.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmSent(false);

    if (mode === 'sign-in') {
      const result = await signInWithPassword(email, password);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // The store is subscribed to auth changes and is already fetching the
      // profile, so there is nothing to hand it here. Where to land is the one
      // decision left, and it is the account's role that makes it: an educator
      // signing in came to publish, not to practise.
      router.push((await isStaff()) ? '/studio' : '/');
      return;
    }

    const result = await signUpWithPassword(email, password, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.value.session) {
      // The project requires email confirmation. Saying "signed in" here and
      // sending them to a home screen that thinks they are signed out is the
      // failure this branch exists to prevent.
      setConfirmSent(true);
      setPassword('');
      return;
    }
    // A brand-new account is a learner until somebody gives it a role, so a
    // sign-up always lands in the student module.
    router.push('/');
  };

  /**
   * Google takes over the tab, so there is no success path to write here: this
   * page is unmounted by the navigation. Only the failure to *leave* lands back
   * in this component, which is why nothing resets `busy` on the happy path —
   * doing so would flicker the button back to life as the page is torn down.
   *
   * Where a Google learner lands is the redirect URL, not `isStaff()` as in the
   * password path. Staff sign in through /studio/sign-in with email, by design,
   * so there is no educator to route onward here.
   */
  const withGoogle = async () => {
    setBusy(true);
    setError(null);
    setConfirmSent(false);
    const started = await signInWithGoogle(authRedirectUrl());
    if (!started.ok) {
      setError(started.error);
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setPassword('');
  };

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 pt-8 pb-12 sm:px-0">
      <header>
        <h1 className="text-2xl font-extrabold">
          {mode === 'sign-in'
            ? hi
              ? 'साइन इन'
              : 'Sign in'
            : hi
              ? 'खाता बनाएँ'
              : 'Create your account'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'साइन इन करने पर आपकी प्रगति, बुकमार्क और लक्ष्य हर डिवाइस पर साथ चलते हैं। प्रश्न बैंक बिना खाते के भी खुला है।'
            : 'Signing in carries your progress, bookmarks and goal to every device. The question bank stays open without an account.'}
        </p>
      </header>

      {noBackend ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? 'इस बिल्ड में कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए साइन इन करने के लिए कुछ नहीं है। ऐप बंडल की गई सामग्री पर चल रहा है।'
            : 'This build has no database configured, so there is nothing to sign in to. The app is running on bundled content.'}
        </p>
      ) : null}

      {signedIn ? (
        <div className="card space-y-3 p-5">
          <p className="text-[13px]">
            {hi ? 'साइन इन:' : 'Signed in as'}{' '}
            <span className="font-bold">{user.email ?? user.name}</span>
          </p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {syncing
              ? hi
                ? 'आपका प्रोफ़ाइल लाया जा रहा है…'
                : 'Fetching your profile…'
              : hi
                ? 'आपकी प्रगति इस खाते में सहेजी जा रही है।'
                : 'Your progress is being saved to this account.'}
          </p>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[13px] font-bold text-white"
            >
              {hi ? 'तैयारी शुरू करें' : 'Start preparing'}
            </Link>
            <button
              type="button"
              onClick={leave}
              disabled={busy}
              className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] font-bold disabled:opacity-50"
            >
              {hi ? 'साइन आउट' : 'Sign out'}
            </button>
          </div>
        </div>
      ) : confirmSent ? (
        <div className="card space-y-3 p-5">
          <p className="text-[14px] font-bold">
            ✉️ {hi ? 'अपना ईमेल देखें' : 'Check your email'}
          </p>
          <p className="text-[13px] text-[var(--color-muted)]">
            {hi
              ? `हमने ${email} पर एक पुष्टिकरण लिंक भेजा है। उसे खोलने के बाद यहाँ साइन इन करें।`
              : `We sent a confirmation link to ${email}. Open it, then sign in here.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmSent(false);
              setMode('sign-in');
            }}
            className="rounded-full border border-[var(--color-line)] px-4 py-2 text-[13px] font-bold"
          >
            {hi ? 'साइन इन पर जाएँ' : 'Go to sign in'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/*
            Above the form, because it is the shorter path: no password to
            invent, and — the reason it matters here — no confirmation email to
            wait for. Google has already verified the address, so a learner who
            takes this route is signed in immediately rather than depending on
            an inbox.
          */}
          <button
            type="button"
            onClick={withGoogle}
            disabled={busy || noBackend}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-[13px] font-bold text-[#1f1f1f] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
              />
              <path
                fill="#FBBC05"
                d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
              />
            </svg>
            {busy
              ? hi
                ? 'रुकिए…'
                : 'Working…'
              : hi
                ? 'Google से जारी रखें'
                : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--color-line)]" />
            <span className="text-[11px] text-[var(--color-faint)]">
              {hi ? 'या ईमेल से' : 'or with email'}
            </span>
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>

          <form onSubmit={submit} className="card space-y-4 p-5">
          {mode === 'sign-up' ? (
            <div>
              <label htmlFor="name" className="text-[12px] font-bold">
                {hi ? 'आपका नाम' : 'Your name'}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy || noBackend}
                placeholder={hi ? 'जैसे: अर्जुन' : 'e.g. Arjun'}
                className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[14px] disabled:opacity-50"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="text-[12px] font-bold">
              {hi ? 'ईमेल' : 'Email'}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || noBackend}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[14px] disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-[12px] font-bold">
              {hi ? 'पासवर्ड' : 'Password'}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || noBackend}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[14px] disabled:opacity-50"
            />
            {mode === 'sign-up' ? (
              <p className="mt-1 text-[11px] text-[var(--color-faint)]">
                {hi ? 'कम से कम छह अक्षर।' : 'At least six characters.'}
              </p>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[var(--color-danger)] px-3 py-2 text-[13px]"
            >
              ✕ {hi ? error.hi : error.en}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || noBackend}
            className="w-full rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {busy
              ? hi
                ? 'रुकिए…'
                : 'Working…'
              : mode === 'sign-in'
                ? hi
                  ? 'साइन इन'
                  : 'Sign in'
                : hi
                  ? 'खाता बनाएँ'
                  : 'Create account'}
          </button>

          <p className="text-center text-[12px] text-[var(--color-muted)]">
            {mode === 'sign-in' ? (
              <>
                {hi ? 'खाता नहीं है?' : 'No account yet?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-up');
                    setError(null);
                  }}
                  className="font-bold text-[var(--color-brand)] underline"
                >
                  {hi ? 'बनाएँ' : 'Create one'}
                </button>
              </>
            ) : (
              <>
                {hi ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in');
                    setError(null);
                  }}
                  className="font-bold text-[var(--color-brand)] underline"
                >
                  {hi ? 'साइन इन करें' : 'Sign in'}
                </button>
              </>
            )}
          </p>
          </form>
        </div>
      )}

    </div>
  );
}
