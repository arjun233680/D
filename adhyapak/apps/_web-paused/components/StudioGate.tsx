'use client';

import Link from 'next/link';
import type { StudioAccess } from '@adhyapak/core';
import { Skeleton } from '@/components/ui';

/**
 * The three reasons the Studio may be unusable, each said in its own words.
 *
 * These used to be one boolean, so a blocked import looked exactly like a
 * missing database and an operator could not tell whether to check the deploy,
 * sign in, or ask for a role. They are different problems with different fixes:
 *
 *   no-backend  — this build was compiled without credentials. Nothing signs in.
 *   signed-out  — there is a database; nobody has authenticated to it.
 *   not-staff   — authenticated, but `profiles.role` is not educator or admin,
 *                 which is the state the database itself will refuse in.
 *
 * The last one is worth naming precisely: `commit_import_batch` raises "only
 * educators and admins may import questions", and no amount of retrying in the
 * browser changes that.
 */
export function StudioGate({
  access,
  loading,
  lang,
  children,
}: {
  access: StudioAccess | undefined;
  loading: boolean;
  lang: 'en' | 'hi';
  children: React.ReactNode;
}) {
  const hi = lang === 'hi';

  if (loading || !access) {
    return (
      <div className="space-y-3 px-4 pt-6 sm:px-0">
        <Skeleton className="h-8" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (access.kind === 'staff') return <>{children}</>;

  const panels = {
    'no-backend': {
      icon: '🔌',
      title: hi ? 'कोई डेटाबेस कॉन्फ़िगर नहीं' : 'No database configured',
      body: hi
        ? 'यह बिल्ड बिना क्रेडेंशियल के बना है, इसलिए साइन इन करने के लिए कुछ नहीं है। SUPABASE_URL और SUPABASE_ANON_KEY सेट करके दोबारा डिप्लॉय करें।'
        : 'This build was compiled without credentials, so there is nothing to sign in to. Set SUPABASE_URL and SUPABASE_ANON_KEY and deploy again.',
      action: null,
      hint: 'docs/BACKEND-SETUP.md',
    },
    'signed-out': {
      icon: '🔑',
      title: hi ? 'साइन इन करें' : 'Sign in to continue',
      body: hi
        ? 'डेटाबेस मौजूद है, पर आप साइन इन नहीं हैं। स्टूडियो में आयात करने के लिए शिक्षक या एडमिन खाते से साइन इन करें।'
        : 'The database is there, but you are not signed in. Importing needs an educator or admin account.',
      action: { href: '/studio/sign-in', label: hi ? 'साइन इन' : 'Sign in' },
      hint: null,
    },
    'not-staff': {
      icon: '🚫',
      title: hi ? 'यह खाता स्टाफ़ नहीं है' : 'This account is not staff',
      body: hi
        ? 'आप साइन इन हैं, पर इस खाते की भूमिका शिक्षक या एडमिन नहीं है। डेटाबेस स्वयं आयात अस्वीकार करेगा — यह ब्राउज़र की सीमा नहीं है।'
        : 'You are signed in, but this account’s role is not educator or admin. The database itself will refuse the import — this is not a limit the browser is imposing.',
      action: { href: '/studio/sign-in', label: hi ? 'दूसरा खाता' : 'Use another account' },
      hint: "update profiles set role = 'educator' where id = '…';",
    },
  } as const;

  const panel = panels[access.kind];
  const email = 'email' in access ? access.email : undefined;

  return (
    <div className="px-4 pt-6 sm:px-0">
      <div className="card flex flex-col items-start gap-3 p-6">
        <div className="text-3xl" aria-hidden>
          {panel.icon}
        </div>
        <div>
          <h1 className="text-lg font-bold">{panel.title}</h1>
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-[var(--color-muted)]">
            {panel.body}
          </p>
          {email ? (
            <p className="mt-1 text-[12px] text-[var(--color-muted)]">
              {hi ? 'साइन इन:' : 'Signed in as'} <span className="font-semibold">{email}</span>
            </p>
          ) : null}
        </div>
        {panel.action ? (
          <Link
            href={panel.action.href}
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            {panel.action.label}
          </Link>
        ) : null}
        {panel.hint ? (
          <code className="rounded bg-[var(--color-surface-alt)] px-2 py-1 text-[11px] break-all">
            {panel.hint}
          </code>
        ) : null}
      </div>
    </div>
  );
}
