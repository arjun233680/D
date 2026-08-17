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
  getTest,
  signOut,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, ProgressBar, SectionHeader, Stat } from '@/components/ui';

export default function ProfilePage() {
  const { lang, user, results, setGoal, setLang } = useStore();
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
    setLeaving(false);
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

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      {/* Signed out there is no name, no email and no join date, and rendering
          the card anyway produced an avatar beside an empty heading and an
          empty line — which reads as a page that failed to load rather than as
          a learner without an account. The settings below are still theirs to
          change, so the page stays; only the identity block knows the
          difference. */}
      {signedIn ? (
        <header className="card flex items-center gap-4 p-5">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-ink)] text-3xl">
            {user.avatar}
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold">{user.name || (lang === 'hi' ? 'शिक्षार्थी' : 'Learner')}</h1>
            {user.email ? (
              <p className="text-[12px] text-[var(--color-muted)]">{user.email}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="brand">
                {user.subscription === 'free' ? t(UI.free, lang) : user.subscription}
              </Badge>
              {user.state ? <Badge tone="neutral">{user.state}</Badge> : null}
            </div>
          </div>
          {/* Signing out lived only on the sign-in page, which meant somebody
              already signed in had to open a page that invites them to sign in
              before they could leave. It belongs where the identity is. */}
          <button
            type="button"
            onClick={leave}
            disabled={leaving}
            className="ml-auto shrink-0 self-start rounded-full border border-[var(--color-line)] px-3.5 py-2 text-[12px] font-bold text-[var(--color-muted)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
          >
            {leaving
              ? lang === 'hi'
                ? 'रुकिए…'
                : 'Signing out…'
              : lang === 'hi'
                ? 'साइन आउट'
                : 'Sign out'}
          </button>
        </header>
      ) : (
        <header className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-surface-alt)] text-3xl">
            🧑‍🎓
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold">
              {lang === 'hi' ? 'आप साइन इन नहीं हैं' : 'You are not signed in'}
            </h1>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              {lang === 'hi'
                ? 'नीचे की सेटिंग्स इसी ब्राउज़र में सहेजी जाती हैं। साइन इन करने पर लक्ष्य, बुकमार्क और प्रगति हर डिवाइस पर साथ चलते हैं।'
                : 'The settings below are saved in this browser. Signing in carries your goal, bookmarks and progress to every device.'}
            </p>
          </div>
          <Link
            href="/sign-in"
            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-[13px] font-bold text-white"
          >
            {lang === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        </header>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={lang === 'hi' ? 'श्रृंखला' : 'Streak'} value={`🔥 ${streak}`} tone="brand" />
        <Stat
          label={lang === 'hi' ? 'टेस्ट दिए' : 'Tests taken'}
          value={String(attempted.length)}
          tone="accent"
        />
        <Stat
          label={lang === 'hi' ? 'सर्वश्रेष्ठ स्कोर' : 'Best score'}
          value={`${bestPercentage}%`}
          tone="success"
        />
        <Stat label={lang === 'hi' ? 'औसत शुद्धता' : 'Avg accuracy'} value={`${avgAccuracy}%`} />
      </div>

      <section className="card p-4">
        <h2 className="text-[15px] font-bold">
          {lang === 'hi' ? 'पिछले 28 दिन' : 'Last 28 days'}
        </h2>
        <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
          {days.map((d) => (
            <span
              key={d.key}
              title={d.key}
              className="aspect-square rounded"
              style={{
                background: d.active ? 'var(--color-brand)' : 'var(--color-line)',
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'हर हरा वर्ग वह दिन है जब आपने अभ्यास किया।'
            : 'Each green square is a day you practised.'}
        </p>
      </section>

      <section className="card p-4">
        <h2 className="text-[15px] font-bold">{lang === 'hi' ? 'आपका लक्ष्य' : 'Your goal'}</h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl">{exam?.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold">{exam ? t(exam.name, lang) : '—'}</p>
            {paper ? (
              <p className="truncate text-[12px] text-[var(--color-muted)]">{t(paper.name, lang)}</p>
            ) : null}
          </div>
        </div>

        {exam && exam.papers.length > 1 ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[12px] font-bold text-[var(--color-muted)]">
              {lang === 'hi' ? 'पेपर बदलें' : 'Change paper'}
            </p>
            <div className="flex flex-wrap gap-2">
              {exam.papers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setGoal(exam.id, p.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                    user.targetPaperId === p.id
                      ? 'border-transparent bg-[var(--color-brand)] text-white'
                      : 'border-[var(--color-line)] text-[var(--color-muted)]'
                  }`}
                >
                  {t(p.name, lang)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          <p className="mb-1.5 text-[12px] font-bold text-[var(--color-muted)]">
            {t(UI.changeGoal, lang)}
          </p>
          <div className="rail flex gap-2">
            {EXAMS.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setGoal(e.id, e.papers[0]?.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                  user.goalExamId === e.id
                    ? 'border-transparent bg-[var(--color-ink)] text-white'
                    : 'border-[var(--color-line)] text-[var(--color-muted)]'
                }`}
              >
                {e.emoji} {e.shortName}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-[15px] font-bold">{lang === 'hi' ? 'भाषा' : 'Language'}</h2>
        <div className="mt-2 flex gap-2">
          {(['hi', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-[13px] font-bold ${
                lang === l
                  ? 'border-transparent bg-[var(--color-brand)] text-white'
                  : 'border-[var(--color-line)] text-[var(--color-muted)]'
              }`}
            >
              {l === 'hi' ? 'हिंदी' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title={lang === 'hi' ? 'टेस्ट इतिहास' : 'Test history'}
          href="/tests"
          action={lang === 'hi' ? 'और टेस्ट' : 'More tests'}
        />
        {attempted.length ? (
          <div className="space-y-2">
            {attempted.map((r) => {
              const test = getTest(r.testId) ?? TESTS.find((x) => x.id === r.testId);
              return (
                <Link key={r.testId} href={`/tests/${r.testId}/result`} className="card block p-4">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">
                      {test ? t(test.title, lang) : r.testId}
                    </span>
                    <Badge tone={r.qualified ? 'success' : 'danger'}>
                      {r.score}/{r.maxScore}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={r.percentage}
                      color={r.qualified ? 'var(--color-success)' : 'var(--color-danger)'}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">
                    {r.rank !== undefined ? `${t(UI.rank, lang)} #${formatCount(r.rank)} · ` : ''}
                    {t(UI.accuracy, lang)} {r.accuracy}%
                    {r.percentile !== undefined ? ` · ${t(UI.percentile, lang)} ${r.percentile}` : ''}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="🎯"
            title={lang === 'hi' ? 'अभी कोई टेस्ट नहीं दिया' : 'No tests taken yet'}
            body={
              lang === 'hi'
                ? 'एक निःशुल्क मॉक से शुरुआत करें — रैंक और विश्लेषण तुरंत मिलेगा।'
                : 'Start with a free mock — you get rank and analysis instantly.'
            }
          />
        )}
      </section>

      <section>
        <SectionHeader title={lang === 'hi' ? 'आपके बैच' : 'Your batches'} href="/batches" />
        {enrolled.length ? (
          <div className="space-y-2">
            {enrolled.map((b) => (
              <Link key={b.id} href={`/batches/${b.id}`} className="card block p-4">
                <p className="text-[13px] font-bold">{t(b.title, lang)}</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                  {t(b.schedule, lang)}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🎥"
            title={lang === 'hi' ? 'किसी बैच में नामांकित नहीं' : 'Not enrolled in a batch'}
            body={
              lang === 'hi'
                ? 'निःशुल्क बैच में शामिल हों और लाइव कक्षाएँ शुरू करें।'
                : 'Join a free batch and start attending live classes.'
            }
          />
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/practice/bookmarks"
          className="card flex items-center gap-2 p-4 text-[13px] font-bold"
        >
          🔖 {lang === 'hi' ? 'बुकमार्क' : 'Bookmarks'} ({user.bookmarkedQuestionIds.length})
        </Link>
        <Link href="/notes" className="card flex items-center gap-2 p-4 text-[13px] font-bold">
          📚 {lang === 'hi' ? 'सहेजे नोट्स' : 'Saved notes'} ({user.savedNoteIds.length})
        </Link>
      </div>
    </div>
  );
}
