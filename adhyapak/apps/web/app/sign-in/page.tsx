'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  isBackendConfigured,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthError,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

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
 * Nothing here gates the app. Signing in is what makes progress follow you to
 * another device; the question bank has never needed an account and still does
 * not.
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
      // profile, so there is nothing to hand it here.
      router.push('/');
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
    router.push('/');
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
      )}

      <p className="text-center text-[12px] text-[var(--color-muted)]">
        <Link href="/" className="underline">
          {hi ? 'बिना खाता बनाए शुरू करें' : 'Start without an account'}
        </Link>
      </p>
    </div>
  );
}
