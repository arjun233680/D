'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BATCHES,
  EXAMS,
  TESTS,
  electivesForPaper,
  examPickerGroups,
  electivePickerItems,
  currentStreak,
  formatDate,
  getExam,
  getPaper,
  getSubject,
  getTopic,
  liveVideos,
  recommendedTopics,
  subjectsForPaperOrEmpty,
  t,
  UI,
  type Exam,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * Dashboard.
 *
 * Answers one question: what should I do right now. Batches, tests, notes,
 * videos and current affairs each own a page of their own, so the dashboard
 * links to them rather than repeating their contents — what it shows instead is
 * what no browse page can: the countdown, the streak, the next thing to
 * practise, and what changed in this exam's cycle.
 */

/** Icon shortcuts. No rails: a rail here would be a second copy of a page. */
// Upload is not here. It is the admin module's, and it sat in a learner's
// shortcut row offering an educator tool to somebody preparing for an exam.
const LIBRARY = [
  { href: '/notes', icon: '📚', label: { en: 'Notes', hi: 'नोट्स' }, color: '#F97316' },
  { href: '/videos', icon: '🎥', label: { en: 'Videos', hi: 'वीडियो' }, color: '#DB2777' },
  { href: '/practice/pyq', icon: '📜', label: { en: 'Previous year', hi: 'विगत वर्ष' }, color: '#0891B2' },
  { href: '/doubts', icon: '💬', label: { en: 'Doubts', hi: 'शंका' }, color: '#7C3AED' },
  { href: '/current-affairs', icon: '📰', label: { en: 'Affairs', hi: 'समसामयिकी' }, color: '#DC2626' },
];

const daysUntil = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : null;
};

export default function HomePage() {
  const { lang, user, results } = useStore();
  const hi = lang === 'hi';

  const exam = getExam(user.goalExamId);
  const examName = exam ? t(exam.name, lang) : '';
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const accent = exam?.color ?? '#4F46E5';
  const streak = currentStreak(user.activeDates);
  const attempts = Object.values(results);
  const countdown = daysUntil(exam?.nextExamDate);
  const avgAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, x) => sum + x.accuracy, 0) / attempts.length)
    : 0;

  // What to do next, in priority order.
  const dailyQuiz = TESTS.find((x) => x.type === 'daily-quiz');
  const nextMock = TESTS.find(
    (x) => x.examId === user.goalExamId && x.type === 'mock' && !results[x.id],
  );
  const weakTopicId = attempts.flatMap((x) => x.weakTopics)[0]?.topicId;
  // Empty when the paper has an unresolved elective: the home feed then
  // recommends nothing rather than recommending somebody else's subject.
  const subjectIds = subjectsForPaperOrEmpty(paper?.id, user.electiveSubjectId);
  const suggested = weakTopicId ? getTopic(weakTopicId) : recommendedTopics(subjectIds, 1)[0];
  const live = liveVideos().filter((v) => v.examIds.includes(user.goalExamId));
  // The home screen is this exam's dashboard, so an enrolment from a previous
  // goal does not belong on it. It is still on the batches page, which is where
  // your own enrolments live.
  const myBatch = BATCHES.find(
    (b) => b.examId === user.goalExamId && user.enrolledBatchIds.includes(b.id),
  );

  const upcoming = (exam?.updates ?? []).filter(
    (u) => new Date(u.date).getTime() >= Date.now() - 86_400_000,
  );
  const timeline = (upcoming.length ? upcoming : (exam?.updates ?? []).slice(-2)).slice(0, 3);

  // Nobody has a goal until they choose one, and the whole dashboard is scoped
  // by it — the countdown, the cut-off, the next mock, the recommended topic.
  // It used to open on CTET's because the bundled learner was seeded with it,
  // which meant a first-time visitor was shown a countdown to an exam they had
  // never said they were sitting.
  if (!exam) return <GoalPicker />;

  // What to do today, in priority order. A live class jumps the queue while it
  // is on air and only while it is.
  const liveNow = live[0];
  const rows = [
    dailyQuiz && {
      href: `/tests/${dailyQuiz.id}`,
      icon: '⚡',
      tint: '#4F46E5',
      title: hi ? 'आज की प्रश्नोत्तरी' : "Today's quiz",
      sub: `10 ${hi ? 'प्रश्न' : 'questions'} · 10 ${hi ? 'मिनट' : 'min'}`,
      cta: hi ? 'अभी करें' : 'Practise now',
    },
    suggested && {
      href: `/practice/topic/${suggested.id}`,
      icon: '🎯',
      tint: '#D97706',
      title: weakTopicId
        ? hi ? 'कमज़ोर टॉपिक सुधारें' : 'Fix your weak topic'
        : hi ? 'सर्वाधिक भार वाला टॉपिक' : 'Highest-weightage topic',
      sub: `${getSubject(suggested.subjectId)?.icon ?? ''} ${t(suggested.name, lang)}`,
      cta: hi ? 'अभ्यास' : 'Practise',
    },
    nextMock && {
      href: `/tests/${nextMock.id}`,
      icon: '📝',
      tint: '#0891B2',
      title: hi ? 'अगला मॉक टेस्ट' : 'Next mock test',
      sub: t(nextMock.title, lang),
      cta: hi ? 'टेस्ट दें' : 'Attempt',
    },
    myBatch && {
      href: `/batches/${myBatch.id}`,
      icon: '🎓',
      tint: '#0284C7',
      title: hi ? 'आपका बैच' : 'Your batch',
      sub: t(myBatch.title, lang),
      cta: hi ? 'खोलें' : 'Open',
    },
  ].filter(Boolean) as ActionItem[];

  return (
    <div className="space-y-6 px-4 pt-4 pb-10 sm:px-0 sm:pt-5">
      {/* --------------------------------------------------------- 1. the day
          A prep app is opened daily, so the page names the day rather than
          repeating the app's own name back at somebody who just tapped its
          icon. The date runs through `formatDate`, which is deterministic —
          the platform's own formatter disagrees with itself between the build
          machine and the browser, and broke hydration when it was trusted. */}
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">
          {hi ? 'आज' : 'Today'}
          <span className="ml-2 text-[15px] font-semibold text-[var(--color-faint)]">
            {formatDate(new Date().toISOString().slice(0, 10), lang)}
          </span>
        </h1>
        {/* The exam switcher lives in the header bar, which on the website is
            already the top-most row on the page. A second one here would be two
            controls doing one job. This is the way into the exam's own page. */}
        <Link href={`/goal/${exam.slug}`} className="shrink-0 text-[12px] font-bold" style={{ color: accent }}>
          {exam.emoji} {exam.shortName} →
        </Link>
      </header>

      {/* ------------------------------------------------------- 2. the deadline
          Slimmer than it was. The countdown is the reason to open the app on a
          Tuesday; the rest of the exam's detail lives on its own page. */}
      <Link
        href={`/goal/${exam.slug}`}
        className="relative isolate flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-4 text-white"
        style={{ background: `linear-gradient(120deg, ${accent} 0%, ${accent}cc 100%)` }}
      >
        <span aria-hidden className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-[15px] font-extrabold">{t(exam.name, lang)}</span>
          {paper ? (
            <span className="mt-0.5 block truncate text-[12px] text-white/80">{t(paper.name, lang)}</span>
          ) : null}
        </span>
        {countdown !== null ? (
          <span className="relative shrink-0 text-right">
            <span className="block text-[26px] leading-none font-extrabold tabular-nums">{countdown}</span>
            <span className="mt-0.5 block text-[10px] font-semibold tracking-wide text-white/75 uppercase">
              {hi ? 'दिन शेष' : 'days left'}
            </span>
          </span>
        ) : paper ? (
          <span className="relative shrink-0 text-right">
            <span className="block text-[26px] leading-none font-extrabold tabular-nums">
              {paper.cutoffGeneral}%
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold tracking-wide text-white/75 uppercase">
              {hi ? 'कट-ऑफ' : 'cut-off'}
            </span>
          </span>
        ) : null}
      </Link>

      {/* ------------------------------------------------------- 3. two figures
          Both are counted from the learner's own record. There is deliberately
          no "0 / 2 practice" here: a daily target implies a study plan this app
          does not have, and the progress bar on it would be against nothing. */}
      <section className="grid grid-cols-2 gap-3">
        <Tile
          label={hi ? 'श्रृंखला' : 'Streak'}
          value={`${streak}`}
          unit={hi ? (streak === 1 ? 'दिन' : 'दिन') : streak === 1 ? 'day' : 'days'}
          foot={
            streak > 0
              ? hi ? 'बनाए रखिए' : 'Keep it going'
              : hi ? 'आज से शुरू कीजिए' : 'Start it today'
          }
          color="#D97706"
        />
        <Tile
          label={hi ? 'बुकमार्क' : 'Bookmarks'}
          value={`${user.bookmarkedQuestionIds.length}`}
          unit={hi ? 'प्रश्न' : 'saved'}
          foot={hi ? 'दोबारा हल करें →' : 'Practise them →'}
          href="/practice/bookmarks"
          color="#4F46E5"
        />
      </section>

      {/* ------------------------------------------ 4. the one thing to do now */}
      {liveNow ? (
        <FeatureRow
          href={`/videos/${liveNow.id}`}
          icon="🔴"
          tint="#DC2626"
          label={hi ? 'अभी लाइव' : 'Live now'}
          title={t(liveNow.title, lang)}
          cta={hi ? 'जुड़ें' : 'Join'}
          accent="#DC2626"
        />
      ) : rows[0] ? (
        <FeatureRow
          href={rows[0].href}
          icon={rows[0].icon}
          tint={rows[0].tint}
          label={hi ? 'आज का अभ्यास' : "Today's practice"}
          title={rows[0].title}
          sub={rows[0].sub}
          cta={rows[0].cta}
          accent={accent}
        />
      ) : null}

      {/* ------------------------------------------------------- 5. the rest */}
      {rows.length > 1 ? (
        <section className="space-y-2.5">
          {rows.slice(liveNow ? 0 : 1).map((r) => (
            <Row key={r.href} href={r.href} icon={r.icon} tint={r.tint} title={r.title} sub={r.sub} />
          ))}
        </section>
      ) : null}

      {/* --------------------------------------------------------- 6. shortcuts
          Back to tiles rather than the chip row, in the softer style: a tinted
          square, one word under it. They are shortcuts to pages already in the
          header, so they stay small and stay here rather than at the top. */}
      <section>
        <h2 className="mb-3 text-[17px] font-extrabold">{hi ? 'सामग्री' : 'Quick access'}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {LIBRARY.map((item) => (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-2">
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl text-2xl transition-transform hover:-translate-y-0.5"
                style={{ background: `${item.color}1f` }}
              >
                {item.icon}
              </span>
              <span className="text-center text-[12px] leading-tight font-semibold">
                {t(item.label, lang)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- 7. what changed */}
      {timeline.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[12px] font-bold tracking-[0.12em] text-[var(--color-faint)] uppercase">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {hi ? `${exam.shortName} अपडेट` : `${exam.shortName} updates`}
            </h2>
            <Link href={`/goal/${exam.slug}`} className="text-[12px] font-bold" style={{ color: accent }}>
              {hi ? 'सभी' : 'All'}
            </Link>
          </div>
          <ol className="space-y-2.5">
            {timeline.map((u) => (
              <li key={`${u.date}-${u.title.en}`} className="card p-4">
                <p className="text-[11px] font-bold tracking-wide" style={{ color: accent }}>
                  {formatDate(u.date, lang)}
                </p>
                <h3 className="mt-1 text-[14px] leading-snug font-bold">{t(u.title, lang)}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                  {t(u.detail, lang)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <footer className="border-t border-[var(--color-line)] pt-7">
        <h2 className="text-[14px] font-bold">
          {hi
            ? 'अध्यापक — शिक्षक भर्ती परीक्षाओं की संपूर्ण तैयारी'
            : 'Adhyapak — complete preparation for teaching exams'}
        </h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--color-muted)]">
          {hi
            ? `${examName ? examName + ' ' : ''}हेतु नोट्स, MCQ अभ्यास, विगत वर्ष प्रश्न तथा पूर्ण मॉक टेस्ट — हिंदी एवं अंग्रेज़ी दोनों में।`
            : `Notes, MCQ practice, previous-year questions and full-length mock tests${examName ? ` for ${examName}` : ''} — in both Hindi and English.`}
        </p>
      </footer>
    </div>
  );
}

/** One counted figure, in the soft-tile style of the reference. */
function Tile({
  label,
  value,
  unit,
  foot,
  color,
  href,
}: {
  label: string;
  value: string;
  unit: string;
  foot: string;
  color: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color }}>
        {label}
      </p>
      <p className="mt-1.5 text-[26px] leading-none font-extrabold tabular-nums">
        {value}
        <span className="ml-1.5 text-[13px] font-semibold text-[var(--color-muted)]">{unit}</span>
      </p>
      <p className="mt-1.5 text-[12px] font-semibold" style={href ? { color } : undefined}>
        {href ? foot : <span className="text-[var(--color-muted)]">{foot}</span>}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className="card p-4 transition-shadow hover:shadow-[0_10px_24px_-16px_rgba(11,17,32,0.4)]">
      {inner}
    </Link>
  ) : (
    <div className="card p-4">{inner}</div>
  );
}

/** The single most important thing to do, with its own button. */
function FeatureRow({
  href,
  icon,
  tint,
  label,
  title,
  sub,
  cta,
  accent,
}: {
  href: string;
  icon: string;
  tint: string;
  label: string;
  title: string;
  sub?: string;
  cta: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-[0_10px_24px_-16px_rgba(11,17,32,0.4)] sm:p-5"
      style={{ borderColor: `${accent}59` }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
        style={{ background: `${tint}1f` }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tracking-[0.1em] uppercase" style={{ color: accent }}>
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[14px] font-bold">{title}</span>
        {/* On its own line: joined with the title it truncated the part that
            says what the thing costs you — "10 questions · 10 min". */}
        {sub ? (
          <span className="block truncate text-[12px] text-[var(--color-muted)]">{sub}</span>
        ) : null}
      </span>
      <span
        className="shrink-0 rounded-full px-4 py-2 text-[12px] font-bold text-white"
        style={{ background: accent }}
      >
        {cta}
      </span>
    </Link>
  );
}

/** A quieter row: icon, two lines, a chevron. */
function Row({
  href,
  icon,
  tint,
  title,
  sub,
}: {
  href: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="card flex items-center gap-3.5 p-3.5 transition-colors hover:border-[var(--color-line-strong)]"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px]"
        style={{ background: `${tint}1f` }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold">{title}</span>
        <span className="block truncate text-[12px] text-[var(--color-muted)]">{sub}</span>
      </span>
      <span className="shrink-0 text-[var(--color-line-strong)]">›</span>
    </Link>
  );
}

interface ActionItem {
  href: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
}

/**
 * The first screen of a brand-new visit: choose what you are preparing for.
 *
 * Deliberately the whole page rather than a banner above an empty dashboard.
 * Every panel below the fold — countdown, cut-off, next mock, weak topic — is
 * scoped to the goal, so with none chosen there is nothing truthful to render
 * underneath. Choosing writes `set_goal` for a signed-in learner and stays
 * local for everybody else, which is the same contract as the goal switcher in
 * the header.
 */
function GoalPicker() {
  const { lang, setGoal } = useStore();
  const hi = lang === 'hi';

  const [query, setQuery] = useState('');
  const [examId, setExamId] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const examGroups = useMemo(() => examPickerGroups(query, lang), [query, lang]);
  const exam = examId ? getExam(examId) : undefined;
  // No fallback to `papers[0]`. That silently recorded a PGT candidate who
  // tapped HTET and then Continue as sitting Level 1 — wrong syllabus, wrong
  // cut-off, and nothing on screen having asked. A single-paper exam has one
  // answer and it is chosen for them; anything else has to be picked.
  const needsPaper = Boolean(exam && exam.papers.length > 1);
  const chosenPaperId = needsPaper ? (paperId ?? undefined) : exam?.papers[0]?.id;
  const group = electivesForPaper(chosenPaperId)[0];

  // Each step invalidates the ones under it. HTET TGT's twelve subjects and
  // CTET Paper 2's two share no options, so a subject carried across a paper
  // change would be one the new paper does not offer.
  const pickExam = (id: string) => {
    setExamId(id);
    setPaperId(null);
    setSubjectId(null);
  };
  const pickPaper = (id: string) => {
    setPaperId(id);
    setSubjectId(null);
  };

  const ready = Boolean(exam) && Boolean(chosenPaperId) && (!group || Boolean(subjectId));

  const confirm = () => {
    if (!exam || !ready) return;
    setGoal(exam.id, chosenPaperId, subjectId ?? undefined);
  };

  return (
    <div className="space-y-6 px-4 pt-8 pb-12 sm:px-0">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {hi ? 'आप कौन-सी परीक्षा दे रहे हैं?' : 'Which exam are you preparing for?'}
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'यही तय करता है कि कौन-से विषय, टेस्ट, बैच और कट-ऑफ दिखें। इसे ऊपर दाईं ओर से कभी भी बदला जा सकता है।'
            : 'This decides which subjects, tests, batches and cut-offs you see. You can change it any time from the top right.'}
        </p>
      </header>

      {/*
        Twenty-eight exams: a search box and two groups, not a wall of cards.
        National first because CTET is what most people came for and it is one
        row rather than twenty-three.
      */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={hi ? 'परीक्षा खोजें…' : 'Search exams…'}
        aria-label={hi ? 'परीक्षा खोजें' : 'Search exams'}
        className="w-full rounded-xl bg-[var(--color-surface-alt)] px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
      />

      {examGroups.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted)]">
          {hi ? 'कोई परीक्षा नहीं मिली।' : 'No exam matches that.'}
        </p>
      ) : null}

      {examGroups.map((group) => (
        <section key={group.title.en}>
          <h2 className="mb-2 text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
            {t(group.title, lang)}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => pickExam(item.value)}
                aria-pressed={examId === item.value}
                className={`flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  examId === item.value
                    ? 'bg-[var(--color-brand-light)]'
                    : 'hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">
                    {hi ? item.labelHi : item.labelEn}
                  </span>
                  <span className="block truncate text-[12px] text-[var(--color-muted)]">
                    {hi ? item.hintHi : item.hintEn}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {exam && exam.papers.length > 1 ? (
        <section>
          <h2 className="text-[15px] font-bold">{hi ? 'कौन-सा पेपर?' : 'Which paper?'}</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {exam.papers.map((paper) => (
              <button
                key={paper.id}
                type="button"
                onClick={() => pickPaper(paper.id)}
                aria-pressed={paperId === paper.id}
                className={`card p-3 text-left transition-colors ${
                  paperId === paper.id
                    ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                    : 'hover:border-[var(--color-brand)]'
                }`}
              >
                <span className="block text-[13px] font-bold">{t(paper.name, lang)}</span>
                <span className="block text-[12px] text-[var(--color-muted)]">
                  {paper.post ? `${paper.post} · ` : ''}
                  {paper.totalQuestions} {hi ? 'प्रश्न' : 'questions'} · {paper.durationMinutes} min
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/*
        The subject. There is no single "TGT paper" — there are twelve, and they
        differ only in this block, so until it is answered the app does not know
        which sixty of a hundred and fifty marks belong to this learner.
      */}
      {exam && group ? (
        <section>
          <h2 className="text-[15px] font-bold">{t(group.name, lang)}?</h2>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            {hi
              ? 'यही तय करता है कि पेपर का कौन-सा भाग आपका है।'
              : 'This decides which part of the paper is yours.'}
          </p>
          {/*
            A wrapping grid, not a row of chips. Twelve TGT subjects and
            twenty-one PGT ones do not fit a row, and a row that scrolls
            sideways hides most of them off the right edge with no sign of how
            many are there — a candidate looking for Sanskrit had to drag the
            list to find out whether it was even offered.
          */}
          {/*
            A wrapping grid, not a row of chips. Twelve TGT subjects and
            twenty-one PGT ones do not fit a row, and one that scrolls sideways
            hides most of them off the right edge with no sign of how many are
            there — a candidate looking for Sanskrit had to drag the list to
            find out whether it was even offered.
          */}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {electivePickerItems(group.choices, exam.id).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSubjectId(item.value)}
                aria-pressed={subjectId === item.value}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                  subjectId === item.value
                    ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                    : 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-brand-light)]'
                }`}
              >
                <span>{item.icon}</span>
                <span className="min-w-0 truncate">{hi ? item.labelHi : item.labelEn}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {exam ? (
        <button
          type="button"
          onClick={confirm}
          disabled={!ready}
          className="w-full rounded-full bg-[var(--color-brand)] px-5 py-3 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {hi
            ? `${exam.shortName} की तैयारी शुरू करें`
            : `Start preparing for ${exam.shortName}`}
        </button>
      ) : null}

      <p className="text-[12px] text-[var(--color-muted)]">
        {hi
          ? 'साइन इन करने पर यह चुनाव आपके खाते में सहेजा जाता है और हर डिवाइस पर साथ चलता है।'
          : 'Signed in, this choice is saved to your account and follows you to every device.'}{' '}
        <Link href="/sign-in" className="font-bold text-[var(--color-brand)] underline">
          {hi ? 'साइन इन' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
}
