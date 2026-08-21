'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithPassword, signOut, type AuthError } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useStudioAccess } from '@/lib/useStudioAccess';

/**
 * Studio sign-in.
 *
 * Deliberately spare: this is the operator's way into the Studio, not the
 * learner funnel. Staff accounts are created by hand in the Supabase dashboard
 * and have a password, so email and password is the whole surface. The learner
 * funnel — Google, phone OTP, exam and level and subject — is P3's, and lands
 * in the same `@adhyapak/core` auth module rather than beside it.
 *
 * The learner side of the website is not gated by any of this.
 */
export default function StudioSignInPage() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();
  const { access, loading, refresh } = useStudioAccess();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signInWithPassword(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refresh();
    // Straight to the work: the only reason to be on this page is to import.
    router.push('/studio/import');
  };

  const leave = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    setPassword('');
    refresh();
  };

  const noBackend = access?.kind === 'no-backend';

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 pt-8 pb-12 sm:px-0">
      <header>
        <Link href="/studio" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← Studio
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">
          {hi ? 'स्टूडियो साइन इन' : 'Studio sign-in'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'शिक्षक और एडमिन खातों के लिए। शिक्षार्थियों को साइन इन की आवश्यकता नहीं है।'
            : 'For educator and admin accounts. Learners do not need to sign in.'}
        </p>
      </header>

      {noBackend ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? 'इस बिल्ड में कोई डेटाबेस नहीं है, इसलिए साइन इन करने के लिए कुछ नहीं है।'
            : 'This build has no database, so there is nothing to sign in to.'}
        </p>
      ) : null}

      {!loading && (access?.kind === 'staff' || access?.kind === 'not-staff') ? (
        <div className="card space-y-3 p-5">
          <p className="text-[13px]">
            {hi ? 'साइन इन:' : 'Signed in as'}{' '}
            <span className="font-bold">{access.email ?? '—'}</span>
          </p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {access.kind === 'staff'
              ? hi
                ? 'यह खाता स्टाफ़ है — आयात उपलब्ध है।'
                : 'This account is staff — importing is available.'
              : hi
                ? 'यह खाता स्टाफ़ नहीं है। भूमिका बदले बिना डेटाबेस आयात अस्वीकार करेगा।'
                : 'This account is not staff. Without a role change the database will refuse the import.'}
          </p>
          <div className="flex gap-2">
            {access.kind === 'staff' ? (
              <Link
                href="/studio/import"
                className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[13px] font-bold text-white"
              >
                {hi ? 'आयात करें' : 'Go to import'}
              </Link>
            ) : null}
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
      ) : (
        <form onSubmit={submit} className="card space-y-4 p-5">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || noBackend}
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-[14px] disabled:opacity-50"
            />
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
            {busy ? (hi ? 'साइन इन हो रहा है…' : 'Signing in…') : hi ? 'साइन इन' : 'Sign in'}
          </button>
        </form>
      )}
    </div>
  );
}
