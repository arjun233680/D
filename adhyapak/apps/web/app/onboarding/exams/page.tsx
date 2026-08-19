'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXAM_CHOOSER_FILTERS,
  examSubtitle,
  fetchLearnerExamIds,
  filterExamsForChooser,
  isBackendConfigured,
  listExams,
  saveLearnerExamIds,
  type Exam,
  type ExamChooserFilter,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * The first thing a learner sees after signing in: which exams are you for?
 *
 * Every card on this screen comes from the `exams` table — the emoji, the
 * accent colour, the authority line, the order of the grid and which exams the
 * "Important" tab shows. Nothing about the list is written in this file, which
 * is the point: adding a state's TET is an insert, not a deploy.
 *
 * More than one answer is allowed, because more than one answer is the truth.
 * An aspirant sits CTET *and* their own state's TET *and* whatever recruitment
 * opens that year, and a single-choice question makes them pick a favourite and
 * then quietly hides the rest of the app from them.
 *
 * This does not set the goal. `profiles.goal_exam_id` stays the one exam the
 * app is scoped to — the countdown, the syllabus, the cut-off — and it is asked
 * for on the dashboard along with the paper and the elective, which are
 * questions this screen cannot answer. See migration 0019.
 */

const VIOLET = '#6d4aed';
const VIOLET_LIGHT = '#8b5cf6';

const FILTER_LABEL: Record<ExamChooserFilter, { en: string; hi: string; icon: string }> = {
  all: { en: 'All', hi: 'सभी', icon: '▦' },
  centre: { en: 'Centre', hi: 'केंद्र', icon: '🏛' },
  state: { en: 'State', hi: 'राज्य', icon: '📍' },
  important: { en: 'Important', hi: 'प्रमुख', icon: '★' },
};

export default function ChooseExamPage() {
  const { lang, user, ready } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();

  const [exams, setExams] = useState<Exam[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ExamChooserFilter>('all');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const noBackend = !isBackendConfigured();

  /*
   * Loaded together, and the existing choice decides whether this screen should
   * be on screen at all. A learner who has already answered is sent onward
   * rather than being asked again on every sign-in — this is an onboarding
   * step, not a settings page.
   */
  useEffect(() => {
    let live = true;
    void (async () => {
      const [list, already] = await Promise.all([listExams(), fetchLearnerExamIds()]);
      if (!live) return;
      if (already.length > 0) {
        router.replace('/');
        return;
      }
      setExams(list);
    })();
    return () => {
      live = false;
    };
  }, [router]);

  const visible = useMemo(
    () => (exams ? filterExamsForChooser(exams, filter, query) : []),
    [exams, filter, query],
  );

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (chosen.size === 0) return;
    setSaving(true);
    setFailed(false);
    const ok = await saveLearnerExamIds([...chosen]);
    setSaving(false);
    if (!ok) {
      // Staying put is the whole point. Navigating on a failed write would land
      // them on a dashboard that thinks they never answered, and send them back
      // here on the next load with their choice gone.
      setFailed(true);
      return;
    }
    router.push('/');
  };

  if (!ready || exams === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#faf9ff]">
        <p className="text-[13px] text-[#8b869e]">
          {hi ? 'परीक्षाएँ लाई जा रही हैं…' : 'Fetching exams…'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[#faf9ff] pb-44">
      <div className="mx-auto w-full max-w-[760px] px-5 pt-10">
        {/* The art sits in the top corner and the heading is kept clear of it,
            so the two never collide on a narrow phone. */}
        <header className="relative pr-20 sm:pr-40">
          <p className="text-[15px] font-bold" style={{ color: VIOLET }}>
            {hi ? 'स्वागत है! 👋' : 'Welcome! 👋'}
          </p>
          <h1 className="mt-1 text-[26px] leading-tight font-extrabold tracking-tight text-[#1e1b4b] sm:text-[34px]">
            {hi ? 'अपनी परीक्षा चुनें' : 'Choose Your Exam'}
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6b7280] sm:text-[15px]">
            {hi ? 'शुरू करने के लिए अपनी परीक्षा चुनें' : 'Select your exam to get started'}
          </p>
          <BooksArt />
        </header>

        <div className="relative mt-6">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hi ? 'अपनी परीक्षा खोजें' : 'Search your exam'}
            aria-label={hi ? 'परीक्षा खोजें' : 'Search exams'}
            className="w-full rounded-2xl border border-[#e8e4f6] bg-white py-3.5 pr-4 pl-11 text-[15px] text-[#1e1b4b] placeholder:text-[#a8a3bd] focus:border-[#c4b5fd] focus:outline-none"
          />
        </div>

        {/* A rail, not a wrap: four tabs fit on a phone, and wrapping the fourth
            onto its own line reads as a different kind of control. */}
        <div className="rail mt-4 flex gap-3 pb-1">
          {EXAM_CHOOSER_FILTERS.map((f) => {
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={on}
                className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-colors sm:gap-2 sm:px-5 sm:py-3 sm:text-[15px] ${
                  on ? 'text-white' : 'border border-[#e8e4f6] bg-white text-[#4b5563]'
                }`}
                style={
                  on ? { background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})` } : undefined
                }
              >
                {/* The icons are the first thing to go on a narrow phone: four
                    readable labels beat four decorated ones where the fourth
                    is off the edge of the screen. */}
                <span aria-hidden className="hidden text-[15px] sm:inline">
                  {FILTER_LABEL[f].icon}
                </span>
                {hi ? FILTER_LABEL[f].hi : FILTER_LABEL[f].en}
              </button>
            );
          })}
        </div>

        {noBackend ? (
          <p className="mt-5 rounded-2xl border border-[#f3d9a8] bg-[#fef7e8] px-4 py-3 text-[12.5px] leading-relaxed text-[#7a5a1e]">
            ⚠️{' '}
            {hi
              ? 'कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए यह चुनाव सहेजा नहीं जाएगा। सूची बंडल की गई सामग्री से आ रही है।'
              : 'No database is configured, so this choice will not be saved. The list is coming from bundled content.'}
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-[14px] text-[#8b869e]">
            {hi
              ? 'इस खोज से कोई परीक्षा नहीं मिली।'
              : 'No exam matches that search.'}
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                lang={lang}
                selected={chosen.has(exam.id)}
                onToggle={() => toggle(exam.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fixed, because the count and the way forward have to stay reachable
          while scrolling a list this long — a footer at the bottom of 29 cards
          is a footer nobody scrolls back to. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[#eeebf8] bg-[#faf9ff]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[760px] px-5 py-4">
          {failed ? (
            <p
              role="alert"
              className="mb-3 rounded-xl bg-[#fdecec] px-3 py-2 text-[12.5px] text-[#b42318]"
            >
              {hi
                ? 'चुनाव सहेजा नहीं जा सका। कनेक्शन जाँचकर पुनः प्रयास करें।'
                : 'Could not save your choice. Check your connection and try again.'}
            </p>
          ) : null}

          <div className="flex items-center gap-3 rounded-2xl bg-[#f1eefc] px-4 py-3">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
              style={{ background: chosen.size > 0 ? VIOLET : '#cfc8ee' }}
            >
              <TickIcon />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-[#1e1b4b]">
                {hi
                  ? `${chosen.size} परीक्षा चुनी गई`
                  : `${chosen.size} exam${chosen.size === 1 ? '' : 's'} selected`}
              </span>
              <span className="block text-[12.5px] text-[#6b7280]">
                {hi
                  ? 'जारी रखने के लिए एक या अधिक परीक्षाएँ चुनें'
                  : 'Select one or more exams to continue'}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={chosen.size === 0 || saving}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(109,74,237,0.9)] disabled:opacity-45 disabled:shadow-none"
            style={{ background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_LIGHT})` }}
          >
            {saving ? (hi ? 'सहेजा जा रहा है…' : 'Saving…') : hi ? 'आगे बढ़ें' : 'Continue'}
            <ArrowIcon />
          </button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- fragments */

/**
 * One exam.
 *
 * The tile behind the emoji is the exam's own `color` at low opacity, so the
 * grid is coloured by the database rather than by a palette in this file. That
 * is what keeps a newly inserted exam looking like it belongs without anybody
 * touching the client.
 */
function ExamCard({
  exam,
  lang,
  selected,
  onToggle,
}: {
  exam: Exam;
  lang: 'en' | 'hi';
  selected: boolean;
  onToggle: () => void;
}) {
  // The acronym spelled out — see `examSubtitle` for why that is not always in
  // the same column.
  const subtitle = examSubtitle(exam, lang);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={`flex flex-col rounded-2xl border bg-white p-3.5 text-left transition-colors ${
        selected ? 'border-[#6d4aed] bg-[#f8f6ff]' : 'border-[#eceaf6]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[20px]"
          style={{ backgroundColor: `${exam.color}1a` }}
          aria-hidden
        >
          {exam.emoji}
        </span>
        <span
          aria-hidden
          className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
            selected ? 'border-[#6d4aed] bg-[#6d4aed]' : 'border-[#d8d3ee]'
          }`}
        >
          {selected ? <TickIcon small /> : null}
        </span>
      </div>
      <span className="mt-2.5 text-[15px] leading-tight font-bold text-[#1e1b4b]">
        {exam.shortName}
      </span>
      <span className="mt-1 line-clamp-2 text-[12px] leading-snug text-[#6b7280]">{subtitle}</span>
    </button>
  );
}

/** The cap-and-books mark in the header's top corner. Decoration only. */
function BooksArt() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -top-3 right-0 w-[86px] sm:-top-2 sm:w-[170px]"
      viewBox="0 0 180 130"
      fill="none"
    >
      <circle cx="140" cy="30" r="34" fill="#efecfd" />
      <circle cx="96" cy="72" r="16" fill="#f3f0fd" />
      <path d="M60 74c-9-3-14-11-12-19 9-1 17 4 19 12" fill="#34c77b" opacity=".8" />
      <rect x="66" y="86" width="96" height="14" rx="4" fill="#7c5cf7" />
      <rect x="66" y="86" width="96" height="5" rx="2.5" fill="#9b83fa" />
      <rect x="72" y="100" width="88" height="14" rx="4" fill="#fbc02d" />
      <rect x="72" y="100" width="88" height="5" rx="2.5" fill="#fdd460" />
      <rect x="62" y="114" width="102" height="13" rx="4" fill="#eef1fb" />
      <path d="M113 40 158 56l-45 16-45-16 45-16Z" fill="#5b46d6" />
      <path d="M113 58v22" stroke="#4a37bd" strokeWidth="3" strokeLinecap="round" />
      <path d="M88 64v13c0 5 11 9 25 9s25-4 25-9V64l-25 9-25-9Z" fill="#6d4aed" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="#a8a3bd" strokeWidth="1.9" />
      <path d="m13.6 13.6 3.4 3.4" stroke="#a8a3bd" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function TickIcon({ small = false }: { small?: boolean }) {
  const s = small ? 10 : 14;
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7.4 5.4 10.3 11.5 4.2"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
