'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
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

function GoalSwitcher() {
  const { user, lang, setGoal } = useStore();
  const [open, setOpen] = useState(false);
  const exam = getExam(user.goalExamId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[190px] items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pr-2 pl-3 text-left transition-colors hover:border-[var(--color-line-strong)]"
      >
        <span className="text-base leading-none">{exam?.emoji ?? '🎯'}</span>
        <span className="min-w-0">
          <span className="block text-[10px] leading-tight font-medium text-[var(--color-faint)]">
            {lang === 'hi' ? 'लक्ष्य' : 'Goal'}
          </span>
          {/* A dash read as a broken control. Nobody has a goal until they
              choose one, so the button says what to do about it instead. */}
          <span className="block truncate text-[13px] leading-tight font-bold">
            {exam?.shortName ?? (lang === 'hi' ? 'चुनें' : 'Choose')}
          </span>
        </span>
        <span className="text-[10px] text-[var(--color-faint)]">▼</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[300px] overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-xl">
            <p className="px-2 py-1.5 text-[11px] font-bold tracking-wide text-[var(--color-faint)] uppercase">
              {t(UI.selectGoal, lang)}
            </p>
            {EXAMS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setGoal(e.id, e.papers[0]?.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--color-surface-alt)] ${
                  e.id === user.goalExamId ? 'bg-[var(--color-brand-light)]' : ''
                }`}
              >
                <span className="text-lg">{e.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{e.shortName}</span>
                  <span className="block truncate text-[11px] text-[var(--color-muted)]">
                    {t(e.name, lang)}
                  </span>
                </span>
                {e.id === user.goalExamId ? (
                  <span className="text-[var(--color-brand)]">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
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

  // The test player takes over the whole screen, like every real exam engine.
  const immersive = pathname.includes('/attempt');
  if (immersive) return <>{children}</>;

  return (
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
  );
}
