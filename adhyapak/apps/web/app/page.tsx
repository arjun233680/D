'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  currentStreak,
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
  listExams,
  listLevelSubjects,
  listLevels,
  nextOnboardingStep,
  t,
  type Exam,
  type Level,
  type LevelSubject,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * The dashboard.
 *
 * Answers one question — what should I do right now — against what the learner
 * told onboarding: the exams they sit, the levels they teach at, and the
 * subject they chose for each. Every card here is one of those answers made
 * actionable.
 *
 * WHAT IS REAL AND WHAT IS ZERO
 *
 * The streak and the questions-solved count come from the learner's own
 * activity. Study time and topics-completed have no source yet — nothing in the
 * schema records a minute spent or a topic finished — so they render as zero
 * with an honest label rather than as an invented percentage. The design shows
 * "45% Completed" on a selection card; that number would have to be made up
 * today, and a fabricated progress bar is worse than a bar at zero, because a
 * learner who has practised nothing would be told they are nearly halfway.
 * When topic completion is tracked, these read from it and nothing here moves.
 *
 * Rendered outside the app shell, like onboarding: this screen carries the
 * design's own header and bottom bar.
 */

const VIOLET = '#6d4aed';
const VIOLET_LIGHT = '#8b5cf6';
const INK = '#1e1b4b';

interface Selection {
  level: Level;
  /** Absent at levels that have no subject to choose — primary. */
  subject?: LevelSubject;
  exam?: Exam;
}

const QUICK = [
  { href: '/notes', icon: '📖', label: { en: 'Notes', hi: 'नोट्स' }, sub: { en: 'Study Smart', hi: 'बेहतर पढ़ाई' }, tint: '#efeafe', color: '#6d4aed' },
  { href: '/practice/pyq', icon: '📄', label: { en: 'PYQ', hi: 'विगत वर्ष' }, sub: { en: 'Previous Year Questions', hi: 'विगत वर्ष प्रश्न' }, tint: '#e8f7ee', color: '#16a34a' },
  { href: '/tests', icon: '📋', label: { en: 'Test Series', hi: 'टेस्ट सीरीज़' }, sub: { en: 'Practice & Improve', hi: 'अभ्यास एवं सुधार' }, tint: '#e6f0fd', color: '#2563eb' },
  { href: '/tests', icon: '🎯', label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' }, sub: { en: 'Real Exam Experience', hi: 'वास्तविक परीक्षा अनुभव' }, tint: '#fff1e6', color: '#ea580c' },
  { href: '/current-affairs', icon: '🌐', label: { en: 'Current Affairs', hi: 'समसामयिकी' }, sub: { en: 'Stay Updated Daily', hi: 'रोज़ अपडेट रहें' }, tint: '#fdeaf3', color: '#db2777' },
] as const;

const NAV = [
  { href: '/', icon: '🏠', label: { en: 'Home', hi: 'होम' } },
  { href: '/notes', icon: '📖', label: { en: 'Study', hi: 'अध्ययन' } },
  { href: '/analytics/pyq', icon: '📊', label: { en: 'Performance', hi: 'प्रदर्शन' } },
  { href: '/profile', icon: '👤', label: { en: 'Profile', hi: 'प्रोफ़ाइल' } },
] as const;

export default function HomePage() {
  const { lang, user, results, ready } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();

  const [selections, setSelections] = useState<Selection[] | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [examIds, levelIds, chosen] = await Promise.all([
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
      ]);
      if (!live) return;

      const [levels, exams] = await Promise.all([listLevels(), listExams()]);
      if (!live) return;

      /*
       * The same decision the chooser makes, from the same function.
       *
       * Answering it independently here is what creates a loop: a learner who
       * chose PRT alone owns no `learner_subjects` row, so a test for "has
       * subjects" calls them unfinished while the chooser — seeing nothing
       * owed — calls them finished, and the two screens volley them forever.
       */
      if (nextOnboardingStep(examIds, levels, levelIds, chosen) !== 'done') {
        router.replace('/onboarding/exams');
        return;
      }
      const offers = await Promise.all(levelIds.map((id) => listLevelSubjects(id)));
      if (!live) return;

      const mine = exams.filter((e) => examIds.includes(e.id));
      // One card per level the learner sits, so PRT — which has no subject —
      // still gets a line of its own rather than vanishing from the dashboard.
      const built = levelIds
        .map((levelId, i): Selection | undefined => {
          const level = levels.find((l) => l.id === levelId);
          if (!level) return undefined;
          const pick = chosen.find((c) => c.levelId === levelId);
          const subject = pick
            ? offers.flat().find((o) => o.levelId === levelId && o.subjectId === pick.subjectId)
            : undefined;
          /*
           * The badge is an exam, and which one is a genuine ambiguity: the
           * learner picked several and did not say which level belongs to
           * which. Pairing them off in order is a presentation choice, not a
           * claim — hence no attempt to look clever about it.
           */
          return { level, subject, exam: mine[i % Math.max(mine.length, 1)] };
        })
        .filter((s): s is Selection => s !== undefined);

      setSelections(built);
    })();
    return () => {
      live = false;
    };
  }, [router]);

  const streak = useMemo(() => currentStreak(user.activeDates ?? []), [user.activeDates]);
  const solved = results?.length ?? 0;

  if (!ready || selections === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#faf9ff]">
        <p className="text-[13px] text-[#8b869e]">{hi ? 'लाया जा रहा है…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#faf9ff] pb-24">
      <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px] px-5 pt-5">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            aria-label={hi ? 'प्रोफ़ाइल' : 'Profile'}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-[#eceaf6] bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke={INK} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
          <div className="flex gap-2.5">
            <Link
              href="/explore"
              aria-label={hi ? 'खोजें' : 'Search'}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-[#eceaf6] bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <circle cx="9" cy="9" r="6" stroke={INK} strokeWidth="1.9" />
                <path d="m13.6 13.6 3.4 3.4" stroke={INK} strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </Link>
            <Link
              href="/current-affairs"
              aria-label={hi ? 'सूचनाएँ' : 'Updates'}
              className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#eceaf6] bg-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path
                  d="M10 3a5 5 0 0 0-5 5v3l-1.4 2.2h12.8L15 11V8a5 5 0 0 0-5-5Z"
                  stroke={INK}
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M8.2 16a2 2 0 0 0 3.6 0" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#6d4aed]" />
            </Link>
          </div>
        </div>

        <header className="relative mt-4 pr-24 sm:pr-44">
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
              aria-hidden
            >
              <svg width="21" height="21" viewBox="0 0 40 40" fill="none">
                <path d="M20 9 31 13.6 20 18.2 9 13.6 20 9Z" fill="#fff" />
                <path d="M12 21h7.4c.4 0 .6.3.6.7V31c0-.5-.3-.8-.8-.8H12V21Z" fill="#fff" opacity=".95" />
                <path d="M28 21h-7.4c-.4 0-.6.3-.6.7V31c0-.5.3-.8.8-.8H28V21Z" fill="#fff" opacity=".78" />
              </svg>
            </span>
            <span className="text-[26px] font-extrabold tracking-tight" style={{ color: INK }}>
              Adhyapak
            </span>
          </div>
          <p className="mt-3 text-[17px] font-extrabold" style={{ color: INK }}>
            {hi ? `नमस्ते, ${user.name || 'साथी'}! 👋` : `Hello, ${user.name || 'there'}! 👋`}
          </p>
          <p className="mt-0.5 text-[13.5px] text-[#6b7280]">
            {hi ? 'चलिए तैयारी जारी रखें।' : "Let's continue your learning journey."}
          </p>
          <svg
            aria-hidden
            className="pointer-events-none absolute -top-1 right-0 w-[92px] sm:w-[150px]"
            viewBox="0 0 180 130"
            fill="none"
          >
            <circle cx="140" cy="34" r="32" fill="#efecfd" />
            <path d="M60 76c-9-3-14-11-12-19 9-1 17 4 19 12" fill="#34c77b" opacity=".8" />
            <rect x="66" y="86" width="96" height="14" rx="4" fill="#7c5cf7" />
            <rect x="72" y="100" width="88" height="14" rx="4" fill="#fbc02d" />
            <rect x="62" y="114" width="102" height="13" rx="4" fill="#eef1fb" />
            <path d="M113 40 158 56l-45 16-45-16 45-16Z" fill="#5b46d6" />
            <path d="M88 64v13c0 5 11 9 25 9s25-4 25-9V64l-25 9-25-9Z" fill="#6d4aed" />
          </svg>
        </header>

        {/* ---------------------------------------------------- selections */}
        <section className="mt-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold" style={{ color: INK }}>
              <span aria-hidden>🔖</span>
              {hi ? 'मेरे चुनाव' : 'My Selections'}
            </h2>
            <Link
              href="/onboarding/exams?change=1"
              className="flex items-center gap-1.5 rounded-xl border border-[#e2dcf7] px-3 py-2 text-[12.5px] font-bold"
              style={{ color: VIOLET }}
            >
              ✎ {hi ? 'बदलें' : 'Change Selections'}
            </Link>
          </div>

          <div className="rail mt-3 flex gap-3">
            {selections.map((s) => (
              <Link
                key={s.level.id}
                href={`/prep?level=${s.level.id}`}
                className="min-w-[70%] shrink-0 rounded-2xl border border-[#eceaf6] bg-white p-4 sm:min-w-[46%]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="rounded-lg px-2 py-1 text-[11px] font-bold"
                    style={{
                      backgroundColor: `${s.exam?.color ?? VIOLET}1a`,
                      color: s.exam?.color ?? VIOLET,
                    }}
                  >
                    {s.exam?.shortName ?? '—'}
                  </span>
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl text-[19px]"
                    style={{ backgroundColor: `${(s.subject?.color ?? s.level.color)}1a` }}
                    aria-hidden
                  >
                    {s.subject?.icon ?? s.level.icon}
                  </span>
                </div>
                <p className="mt-2 text-[21px] leading-none font-extrabold" style={{ color: INK }}>
                  {s.level.name}
                </p>
                {/* Primary has no subject line because it has no subject: the
                    whole paper is the syllabus. The level's own full name says
                    more there than a blank row would. */}
                <p className="mt-1 text-[14px] font-semibold text-[#4b5563]">
                  {s.subject ? t(s.subject.name, lang) : t(s.level.fullName, lang)}
                </p>
                <p className="mt-3 text-[12px] text-[#8b869e]">
                  {hi ? 'अभी शुरू नहीं किया' : 'Not started yet'}
                </p>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#efecfa]">
                  <div className="h-1.5 w-0 rounded-full" style={{ background: VIOLET }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- quick access */}
        <section className="mt-7">
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold" style={{ color: INK }}>
            <span aria-hidden>⚡</span>
            {hi ? 'त्वरित पहुँच' : 'Quick Access'}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#8b869e]">
            {hi ? 'आपकी तैयारी, आसान बनाई गई' : 'Your exam prep, simplified'}
          </p>
          <div className="rail mt-3 flex gap-3">
            {QUICK.map((q) => (
              <Link
                key={q.label.en}
                href={q.href}
                className="flex min-w-[132px] shrink-0 flex-col rounded-2xl p-3.5"
                style={{ backgroundColor: q.tint }}
              >
                <span aria-hidden className="text-[24px]">
                  {q.icon}
                </span>
                <span className="mt-2 text-[14px] font-bold" style={{ color: INK }}>
                  {t(q.label, lang)}
                </span>
                <span className="mt-0.5 text-[11.5px] leading-snug text-[#6b7280]">
                  {t(q.sub, lang)}
                </span>
                <span
                  aria-hidden
                  className="mt-3 grid h-7 w-7 place-items-center rounded-full text-white"
                  style={{ background: q.color }}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4 10h11m0 0-4-4m4 4-4 4"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ today's snapshot */}
        <section className="mt-7">
          <h2 className="flex items-center gap-2 text-[16px] font-extrabold" style={{ color: INK }}>
            <span aria-hidden>📊</span>
            {hi ? 'आज का सारांश' : "Today's Snapshot"}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat
              icon="🎯"
              tint="#e8f7ee"
              label={hi ? 'हल किए प्रश्न' : 'Questions Solved'}
              value={String(solved)}
            />
            <Stat
              icon="🔥"
              tint="#fff1e6"
              label={hi ? 'दैनिक श्रृंखला' : 'Daily Streak'}
              value={hi ? `${streak} दिन` : `${streak} day${streak === 1 ? '' : 's'}`}
            />
          </div>
          {/*
            Study time and topics completed are in the design and are not here:
            nothing in the schema records either, and a tile reading "42 min"
            that nobody measured is a lie told in a confident font.
          */}
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-[#a8a3bd]">
            {hi
              ? 'अध्ययन समय और पूर्ण विषय तब दिखेंगे जब उनका रिकॉर्ड रखा जाने लगेगा।'
              : 'Study time and topics completed appear once the app starts recording them.'}
          </p>
        </section>
      </div>

      {/* -------------------------------------------------------- bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-[#eeebf8] bg-white">
        <div className="mx-auto grid max-w-[760px] lg:max-w-[1040px] grid-cols-4">
          {NAV.map((item) => {
            const active = item.href === '/';
            return (
              <Link
                key={item.label.en}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <span aria-hidden className={`text-[19px] ${active ? '' : 'opacity-45 grayscale'}`}>
                  {item.icon}
                </span>
                <span
                  className="text-[10.5px] font-semibold"
                  style={{ color: active ? VIOLET : '#9b96b0' }}
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

function Stat({
  icon,
  tint,
  label,
  value,
}: {
  icon: string;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eceaf6] bg-white p-3.5">
      <span
        className="grid h-9 w-9 place-items-center rounded-xl text-[17px]"
        style={{ backgroundColor: tint }}
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-2 text-[19px] font-extrabold" style={{ color: INK }}>
        {value}
      </p>
      <p className="text-[11.5px] text-[#6b7280]">{label}</p>
    </div>
  );
}
