'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { EXAMS, getExam, t, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';

const NAV = [
  { href: '/', label: UI.home, icon: '🏠' },
  { href: '/batches', label: UI.batches, icon: '🎥' },
  { href: '/practice', label: UI.practice, icon: '✍️' },
  { href: '/tests', label: UI.tests, icon: '🎯' },
  { href: '/notes', label: UI.notes, icon: '📚' },
] as const;

const MOBILE_NAV = [
  { href: '/', label: UI.home, icon: '🏠' },
  { href: '/batches', label: UI.batches, icon: '🎥' },
  { href: '/practice', label: UI.practice, icon: '✍️' },
  { href: '/tests', label: UI.tests, icon: '🎯' },
  { href: '/profile', label: UI.profile, icon: '👤' },
] as const;

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}



/**
 * Nothing is reachable without an account.
 *
 * The website had no gate at all: every route rendered for anybody, and signing
 * in changed only whether things were saved. Everything here is scoped to a
 * learner — the goal decides which subjects, tests and cut-offs appear at all —
 * so a visitor was being shown a product that does not exist for them.
 *
 * Rendered rather than redirected while the store is still reading
 * localStorage: a redirect fired on the first paint would bounce a signed-in
 * learner to the door on every hard refresh, which is the failure this shape
 * exists to avoid. `/sign-in` and the Studio stay open — the first is the door
 * and the second has its own staff sign-in.
 */
function RequireAccount({ children }: { children: ReactNode }) {
  const { user, ready, lang } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const open = pathname.startsWith('/sign-in') || pathname.startsWith('/studio');
  const allowed = open || Boolean(user.signedIn && user.id);

  useEffect(() => {
    if (ready && !allowed) router.replace('/sign-in');
  }, [ready, allowed, router]);

  if (!ready) return <div className="min-h-dvh" aria-hidden />;
  if (!allowed) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="text-[13px] text-[var(--color-muted)]">
          {lang === 'hi' ? 'साइन इन पर ले जा रहे हैं…' : 'Taking you to sign in…'}
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function GoalSwitcher() {
  const { user, lang } = useStore();
  const exam = getExam(user.goalExamId);

  /*
   * A way into the picker, not a third copy of it.
   *
   * This was a dropdown of exams calling `setGoal(e.id, e.papers[0]?.id)` — the
   * same guess the profile pages were making. It answered the paper question
   * itself and never asked which subject, so switching to HTET picked Level 1
   * for a PGT candidate and left their elective on a subject Level 1 does not
   * teach. The picker on the home page asks all three.
   */
  return (
    <Link
      href="/"
      title={lang === 'hi' ? 'लक्ष्य परीक्षा बदलें' : 'Change your goal exam'}
      className="flex max-w-[190px] items-center gap-2 rounded-full border-2 border-[var(--color-brand)]/35 bg-[var(--color-brand-light)] px-3 py-1.5 text-left transition-colors hover:border-[var(--color-brand)]"
    >
      <span className="text-base leading-none">🎯</span>
      <span className="min-w-0">
        <span className="block text-[10px] leading-tight font-medium text-[var(--color-faint)]">
          {lang === 'hi' ? 'लक्ष्य बदलें' : 'Change goal'}
        </span>
        <span className="block truncate text-[13px] leading-tight font-bold">
          {exam ? exam.shortName : lang === 'hi' ? 'चुनें' : 'Choose'}
        </span>
      </span>
    </Link>
  );
}

function LangToggle() {
  const { lang, toggleLang } = useStore();
  return (
    <button
      type="button"
      onClick={toggleLang}
      title={lang === 'hi' ? 'भाषा बदलें' : 'Switch language'}
      className="flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-bold transition-colors hover:border-[var(--color-line-strong)]"
    >
      <span className={lang === 'hi' ? 'text-[var(--color-brand)]' : 'text-[var(--color-faint)]'}>
        हिं
      </span>
      <span className="text-[var(--color-line-strong)]">/</span>
      <span className={lang === 'en' ? 'text-[var(--color-brand)]' : 'text-[var(--color-faint)]'}>
        EN
      </span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { lang, user } = useStore();

  /*
   * Two screens own the whole viewport.
   *
   * The test player, like every real exam engine — but it is behind the gate
   * too, or a paper could be sat with nowhere to record it.
   *
   * And the door itself. Wrapping /sign-in in the shell framed the way in with
   * a nav bar to places the visitor cannot go, an exam-goal switcher for a
   * learner with no goal yet, and a "Sign in" button on the sign-in page. The
   * Studio keeps its chrome: whoever reaches /studio/sign-in is staff and the
   * nav is theirs.
   *
   * Onboarding is the same argument one step later. The learner is signed in
   * but has not said which exams they sit, so the goal switcher has nothing to
   * switch between and the nav leads to five screens that would all ask the
   * question this one is asking.
   */
  const immersive =
    pathname.includes('/attempt') ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/onboarding') ||
    // The preparation screens carry the design's own drawer, title block and
    // five-tab bar, so the shell's header and nav would be a second set of both.
    pathname.startsWith('/prep') ||
    // The dashboard carries the design's own header and bottom bar. The
    // remaining inner screens still wear this shell, so its nav and the
    // dashboard's do not yet look like one another — that is a known gap, not
    // a decision.
    pathname === '/';
  if (immersive) return <RequireAccount>{children}</RequireAccount>;

  return (
    <RequireAccount>
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-brand)] text-base font-black text-white">
              अ
            </span>
            <span className="hidden text-[17px] font-extrabold tracking-tight sm:block">
              {t(UI.appName, lang)}
            </span>
          </Link>

          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  isActive(pathname, item.href)
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                    : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {t(item.label, lang)}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          <Link
            href="/explore"
            className="hidden h-9 items-center gap-2 rounded-full border border-[var(--color-line)] px-3 text-[13px] text-[var(--color-faint)] transition-colors hover:border-[var(--color-line-strong)] md:flex"
          >
            <span>🔍</span>
            <span className="hidden lg:block">{t(UI.search, lang)}</span>
          </Link>

          <LangToggle />
          <GoalSwitcher />

          {/* Signed out, the avatar was a face with nobody behind it — it linked
              to a profile page describing a learner who did not exist. Offer the
              way to become one instead. */}
          {user.signedIn && user.id ? (
            <Link
              href="/profile"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-ink)] text-base text-white"
              title={user.name || undefined}
            >
              {user.avatar}
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-1.5 text-[12px] font-bold transition-colors hover:border-[var(--color-line-strong)]"
            >
              {lang === 'hi' ? 'साइन इन' : 'Sign in'}
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl pb-24 lg:pb-10">{children}</main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-surface)] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2"
              >
                <span className={`text-[19px] leading-none ${active ? '' : 'opacity-45 grayscale'}`}>
                  {item.icon}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    active ? 'text-[var(--color-brand)]' : 'text-[var(--color-faint)]'
                  }`}
                >
                  {t(item.label, lang)}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
    </RequireAccount>
  );
}
