'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  examSubtitle,
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  listExams,
  listLevels,
  listPaperLevelsForExams,
  saveLearnerLevelIds,
  t,
  type Exam,
  type Level,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import {
  BackButton,
  BooksArt,
  ChosenExams,
  ContinueBar,
  ErrorNote,
  INK,
  StepRail,
  Tick,
  Tip,
  VIOLET,
} from '../ui';

/**
 * Step 2: which level do you teach at?
 *
 * More than one, like step 1, and for the same reason: an aspirant who has a
 * B.Ed and a master's sits TGT and PGT in the same season, and making them pick
 * one hides half the syllabus they are actually revising.
 *
 * The levels come from the `levels` table, not from `exam_papers.post` — see
 * the comment at the head of migration 0020 for why those are different
 * questions.
 */
function ChooseLevelPage() {
  const { lang, ready } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();
  /** Carried through every step so "Change Selection" edits rather than onboards. */
  const changing = useSearchParams().get('change') === '1';

  const [levels, setLevels] = useState<Level[] | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [levelList, examList, examIds, levelIds] = await Promise.all([
        listLevels(),
        listExams(),
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
      ]);
      if (!live) return;
      // Arriving here without having answered step 1 means a bookmark or a
      // reload out of order. Send them back rather than asking step 2 of
      // somebody whose exams are unknown.
      if (examIds.length === 0) {
        router.replace('/onboarding/exams');
        return;
      }
      /*
       * Only levels the chosen exams actually examine.
       *
       * CTET has no PGT paper; offering PGT to a CTET candidate lets them pick
       * a level their exam does not run and then land on a PYQ screen with
       * nothing behind it. A level with no `teachingLevels` — the catch-all —
       * is always offered, and if the papers tell us nothing the whole list
       * stands, because an unanswerable question beats an empty screen.
       */
      const offered = await listPaperLevelsForExams(examIds);
      if (!live) return;
      const usable =
        offered.length === 0
          ? levelList
          : levelList.filter(
              (l) => l.teachingLevels.length === 0 || l.teachingLevels.some((tl) => offered.includes(tl)),
            );

      setLevels(usable);
      setExams(examList.filter((e) => examIds.includes(e.id)));
      setChosen(new Set(levelIds.filter((id) => usable.some((l) => l.id === id))));
    })();
    return () => {
      live = false;
    };
  }, [router]);

  const strip = useMemo(
    () =>
      exams.map((e) => ({
        id: e.id,
        shortName: e.shortName,
        subtitle: examSubtitle(e, lang),
        emoji: e.emoji,
        color: e.color,
      })),
    [exams, lang],
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
    const ok = await saveLearnerLevelIds([...chosen]);
    setSaving(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    /*
     * Straight to the dashboard when nothing left asks a subject question —
     * PRT on its own is the case. Routing to the subject step and letting it
     * bounce would work, but it shows a loading screen on the way to somewhere
     * it was never going to stop.
     */
    const anyAsks = (levels ?? []).some((l) => chosen.has(l.id) && l.requiresSubject);
    router.push(anyAsks ? (changing ? '/onboarding/subject?change=1' : '/onboarding/subject') : '/');
  };

  if (!ready || levels === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#faf9ff]">
        <p className="text-[13px] text-[#8b869e]">{hi ? 'लाया जा रहा है…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[#faf9ff] pb-40">
      <div className="mx-auto w-full max-w-[760px] lg:max-w-[1040px] px-5 pt-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/onboarding/exams" />
          <StepRail step={2} />
        </div>

        <header className="relative mt-5 pr-20 sm:pr-40">
          <p className="text-[16px] font-bold" style={{ color: VIOLET }}>
            {hi
              ? `बढ़िया! ${exams.length} परीक्षाएँ चुनी गईं 🎉`
              : `Great! ${exams.length} exam${exams.length === 1 ? '' : 's'} selected 🎉`}
          </p>
          <h1 className="mt-1 text-[22px] leading-tight font-extrabold tracking-tight sm:text-[26px]" style={{ color: INK }}>
            {hi ? 'अपना स्तर चुनें' : 'Select Your Level / Target'}
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-[#6b7280] sm:text-[16px]">
            {hi
              ? 'चुनी गई परीक्षाओं में आप जिस स्तर की तैयारी कर रहे हैं, वह चुनें।'
              : 'Choose the level or target you are preparing for in the selected exams.'}
          </p>
          <BooksArt className="absolute -top-2 right-0 w-[86px] sm:w-[160px]" />
        </header>

        <ChosenExams items={strip} />

        <h2 className="mt-6 text-[16px] font-bold" style={{ color: VIOLET }}>
          {hi ? 'स्तर चुनें' : 'Select Level / Target'}
        </h2>

        <div className="mt-3 space-y-2">
          {levels.map((level) => {
            const on = chosen.has(level.id);
            return (
              <button
                key={level.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(level.id)}
                className={`flex w-full items-center gap-3.5 rounded-2xl border bg-white p-4 text-left transition-colors ${
                  on ? 'border-[#6d4aed] bg-[#f8f6ff]' : 'border-[#eceaf6]'
                }`}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[17px]"
                  style={{ backgroundColor: `${level.color}1a` }}
                  aria-hidden
                >
                  {level.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold" style={{ color: INK }}>
                    {level.name}
                  </span>
                  <span className="block text-[13px] leading-snug text-[#6b7280]">
                    {t(level.fullName, lang)}
                    {level.classes ? ` (${t(level.classes, lang)})` : ''}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 ${
                    on ? 'border-[#6d4aed] bg-[#6d4aed]' : 'border-[#d8d3ee]'
                  }`}
                >
                  {on ? <Tick small /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <Tip>
          {hi
            ? 'आप बाद में प्रोफ़ाइल सेटिंग्स से किसी भी परीक्षा के लिए स्तर बदल या जोड़ सकते हैं।'
            : 'You can change or add more levels for any exam later from your profile settings.'}
        </Tip>
      </div>

      <ContinueBar
        onClick={submit}
        disabled={chosen.size === 0}
        busy={saving}
        label={saving ? (hi ? 'सहेजा जा रहा है…' : 'Saving…') : hi ? 'आगे बढ़ें' : 'Continue'}
      >
        {failed ? (
          <ErrorNote>
            {hi
              ? 'चुनाव सहेजा नहीं जा सका। कनेक्शन जाँचकर पुनः प्रयास करें।'
              : 'Could not save your choice. Check your connection and try again.'}
          </ErrorNote>
        ) : null}
      </ContinueBar>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <ChooseLevelPage />
    </Suspense>
  );
}
