'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BATCHES,
  EXAMS,
  TESTS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  getSubject,
  getTest,
  signOut,
  t,
  UI,
} from '@adhyapak/core';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, ProgressBar, SectionHeader, Stat } from '@/components/ui';

export default function ProfilePage() {
  const { lang, user, results, setGoal, setLang } = useStore();
  const router = useRouter();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const streak = currentStreak(user.activeDates);
  const attempted = Object.values(results);
  const enrolled = BATCHES.filter((b) => user.enrolledBatchIds.includes(b.id));
  // A guest is "signed in" to the app in the routing sense without having an
  // account; the id is what says whether there is a profile row behind them.
  const signedIn = Boolean(user.signedIn && user.id);
  const [leaving, setLeaving] = useState(false);

  /**
   * Ends the session. The store is subscribed to the auth change and clears the
   * cached learner itself — including the copy in localStorage, so the next
   * person to open this browser does not inherit somebody else's goal and
   * bookmarks.
   */
  const leave = async () => {
    setLeaving(true);
    await signOut();
    // Back to the door, not to a page that now says nothing. Mobile already did
    // this; the website left the learner on their own profile with every panel
    // emptied, which reads as the sign-out having failed.
    router.replace('/sign-in');
  };

  const bestPercentage = attempted.length
    ? Math.max(...attempted.map((r) => r.percentage))
    : 0;
  const avgAccuracy = attempted.length
    ? Math.round(attempted.reduce((s, r) => s + r.accuracy, 0) / attempted.length)
    : 0;

  // Last 28 days of activity, newest last — the streak calendar.
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, active: user.activeDates.includes(key) };
  });

  const subject = user.electiveSubjectId ? getSubject(user.electiveSubjectId) : undefined;

  return (
    /*
     * Flat surfaces and hairline rules rather than a stack of bordered cards.
     * The page is a settings screen with a little history on it, and eleven
     * boxed panels made every line look equally important — the goal, which is
     * the one thing here that changes what the whole app shows, read the same
     * as the language toggle.
     *
     * Order is identity, goal, activity, library, settings: who you are, what
     * you are working towards, how it is going, what you saved, and the
     * controls last because they are used least.
     */
    <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-0">
      {/* ---------------------------------------------------------- identity */}
      <header className="flex items-center gap-4 py-8">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-surface-alt)] text-2xl">
          {user.avatar || '🧑‍🎓'}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] leading-tight font-extrabold">
            {signedIn
              ? user.name || (lang === 'hi' ? 'शिक्षार्थी' : 'Learner')
              : lang === 'hi'
                ? 'आप साइन इन नहीं हैं'
                : 'You are not signed in'}
          </h1>
          <p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">
            {signedIn
              ? user.email || (lang === 'hi' ? 'खाता सक्रिय' : 'Account active')
              : lang === 'hi'
                ? 'सेटिंग्स इसी ब्राउज़र में सहेजी जाती हैं।'
                : 'Settings are saved in this browser only.'}
          </p>
        </div>
        {signedIn ? null : (
          <Link
            href="/sign-in"
            className="shrink-0 rounded-full bg-[var(--color-brand)] px-4 py-2 text-[13px] font-bold text-white"
          >
            {lang === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        )}
      </header>

      {/* -------------------------------------------------------------- goal */}
      {/*
        One link into the picker, not a row of exam chips and a row of paper
        chips. Those chips called `setGoal` with a paper and no subject, so
        switching to TGT here cleared the elective and offered no way to set it
        — the goal ended up half-answered from the one screen meant to show it.
      */}
      <Link
        href="/"
        className="-mx-3 flex items-center gap-4 rounded-2xl px-3 py-5 transition-colors hover:bg-[var(--color-surface-alt)]"
      >
        <span className="text-3xl">{exam?.emoji ?? '🎯'}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
            {lang === 'hi' ? 'आपका लक्ष्य' : 'Your goal'}
          </span>
          <span className="mt-0.5 block truncate text-[15px] font-bold">
            {exam ? t(exam.name, lang) : lang === 'hi' ? 'कोई लक्ष्य नहीं चुना' : 'No goal chosen'}
          </span>
          <span className="block truncate text-[12px] text-[var(--color-muted)]">
            {[paper ? t(paper.name, lang) : null, subject ? t(subject.name, lang) : null]
              .filter(Boolean)
              .join('  ·  ') ||
              (lang === 'hi' ? 'चुनने के लिए टैप करें' : 'Tap to choose')}
          </span>
        </span>
        <span className="text-[var(--color-muted)]">›</span>
      </Link>

      {/* ---------------------------------------------------------- activity */}
      <section className="border-t border-[var(--color-line)] py-7">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: lang === 'hi' ? 'श्रृंखला' : 'Streak', value: `🔥 ${streak}` },
            { label: lang === 'hi' ? 'टेस्ट' : 'Tests', value: String(attempted.length) },
            { label: lang === 'hi' ? 'सर्वश्रेष्ठ' : 'Best', value: `${bestPercentage}%` },
            { label: lang === 'hi' ? 'शुद्धता' : 'Accuracy', value: `${avgAccuracy}%` },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[18px] leading-tight font-extrabold tabular-nums">{stat.value}</p>
              <p className="text-[11px] text-[var(--color-muted)]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
          {days.map((d) => (
            <span
              key={d.key}
              title={d.key}
              className="aspect-square rounded-[3px]"
              style={{ background: d.active ? 'var(--color-brand)' : 'var(--color-line)' }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'पिछले 28 दिन — हर हरा वर्ग वह दिन है जब आपने अभ्यास किया।'
            : 'Last 28 days — each green square is a day you practised.'}
        </p>
      </section>

      {/* ----------------------------------------------------------- library */}
      <nav className="border-t border-[var(--color-line)] py-2">
        {[
          {
            href: '/practice/bookmarks',
            icon: '🔖',
            label: lang === 'hi' ? 'बुकमार्क' : 'Bookmarks',
            count: user.bookmarkedQuestionIds.length,
          },
          {
            href: '/notes',
            icon: '📚',
            label: lang === 'hi' ? 'सहेजे नोट्स' : 'Saved notes',
            count: user.savedNoteIds.length,
          },
          {
            href: '/batches',
            icon: '🎥',
            label: lang === 'hi' ? 'आपके बैच' : 'Your batches',
            count: enrolled.length,
          },
          {
            href: '/tests',
            icon: '🎯',
            label: lang === 'hi' ? 'टेस्ट इतिहास' : 'Test history',
            count: attempted.length,
          },
        ].map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-[var(--color-surface-alt)]"
          >
            <span className="text-[17px]">{row.icon}</span>
            <span className="flex-1 text-[14px] font-semibold">{row.label}</span>
            <span className="text-[13px] tabular-nums text-[var(--color-muted)]">{row.count}</span>
            <span className="text-[var(--color-muted)]">›</span>
          </Link>
        ))}
      </nav>

      {/* ---------------------------------------------------------- settings */}
      <section className="border-t border-[var(--color-line)] py-7">
        <p className="mb-2.5 text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
          {lang === 'hi' ? 'भाषा' : 'Language'}
        </p>
        <div className="flex gap-2">
          {(['hi', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`flex-1 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors ${
                lang === l
                  ? 'bg-[var(--color-ink)] text-white'
                  : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
              }`}
            >
              {l === 'hi' ? 'हिंदी' : 'English'}
            </button>
          ))}
        </div>

        {signedIn ? (
          <button
            type="button"
            onClick={leave}
            disabled={leaving}
            className="mt-6 w-full rounded-xl py-3 text-[13px] font-bold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger-light)] disabled:opacity-50"
          >
            {leaving
              ? lang === 'hi'
                ? 'रुकिए…'
                : 'Signing out…'
              : lang === 'hi'
                ? 'साइन आउट'
                : 'Sign out'}
          </button>
        ) : null}
      </section>
    </div>
  );
}
