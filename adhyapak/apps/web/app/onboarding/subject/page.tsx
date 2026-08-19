'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  examSubtitle,
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
  listExams,
  listLevelSubjects,
  listLevels,
  saveLearnerSubject,
  t,
  type Exam,
  type Level,
  type LevelSubject,
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
 * Step 3: which subject, for each level?
 *
 * One screen per level rather than one screen with two grids. The question is
 * genuinely separate each time — a TGT Science teacher is often a PGT Chemistry
 * candidate, and the PGT list does not even contain "Science" — and stacking
 * both grids on one screen makes a page nobody can see the bottom of.
 *
 * Which level is being asked about is derived rather than routed. The learner's
 * levels and their answers so far both live in the database, so "the first
 * level with no subject yet" is a fact this screen can work out on load. That
 * means a reload, a back button or a re-entry days later all resume in the same
 * place, and there is no step counter in a URL to get out of sync with what was
 * actually saved.
 */
export default function ChooseSubjectPage() {
  const { lang, ready } = useStore();
  const hi = lang === 'hi';
  const router = useRouter();

  const [levels, setLevels] = useState<Level[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<LevelSubject[] | null>(null);
  const [current, setCurrent] = useState<Level | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * Moves to the next level that still needs a subject, or leaves onboarding.
   *
   * Levels with `requiresSubject: false` are stepped over entirely — primary is
   * one whole paper with nothing to choose between. A learner who picked only
   * such levels never sees this screen at all: they arrive, nothing is
   * outstanding, and they go straight to the dashboard.
   */
  const advance = useCallback(
    (all: Level[], done: Record<string, string>) => {
      const next = all.find((l) => l.requiresSubject && !done[l.id]);
      if (!next) {
        router.replace('/');
        return;
      }
      setCurrent(next);
      setPicked(null);
      setOffers(null);
      void listLevelSubjects(next.id).then(setOffers);
    },
    [router],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      const [levelList, examList, examIds, levelIds, subjects] = await Promise.all([
        listLevels(),
        listExams(),
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
      ]);
      if (!live) return;
      if (examIds.length === 0) {
        router.replace('/onboarding/exams');
        return;
      }
      if (levelIds.length === 0) {
        router.replace('/onboarding/level');
        return;
      }
      const mine = levelList.filter((l) => levelIds.includes(l.id));
      const done = Object.fromEntries(subjects.map((s) => [s.levelId, s.subjectId]));
      setLevels(mine);
      setExams(examList.filter((e) => examIds.includes(e.id)));
      setAnswered(done);
      advance(mine, done);
    })();
    return () => {
      live = false;
    };
  }, [router, advance]);

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

  const submit = async () => {
    if (!current || !picked) return;
    setSaving(true);
    setFailed(false);
    const ok = await saveLearnerSubject(current.id, picked);
    setSaving(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    const done = { ...answered, [current.id]: picked };
    setAnswered(done);
    advance(levels, done);
  };

  if (!ready || !current || offers === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#faf9ff]">
        <p className="text-[13px] text-[#8b869e]">{hi ? 'लाया जा रहा है…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[#faf9ff] pb-40">
      <div className="mx-auto w-full max-w-[760px] px-5 pt-6">
        <div className="flex items-center gap-4">
          <BackButton fallback="/onboarding/level" />
          <StepRail step={3} />
        </div>

        <header className="relative mt-5 pr-20 sm:pr-40">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-[32px]" style={{ color: INK }}>
            {hi ? `अपना ${current.name} विषय चुनें` : `Choose Your ${current.name} Subject`}
          </h1>
          <p className="mt-1.5 text-[14px] leading-snug text-[#6b7280] sm:text-[15px]">
            {hi
              ? `${current.name} स्तर के लिए वह विषय चुनें जिसकी आप तैयारी करना चाहते हैं।`
              : `Select the subject you want to prepare for in ${current.name} level.`}
          </p>
          <BooksArt className="absolute -top-3 right-0 w-[86px] sm:w-[160px]" />
        </header>

        <ChosenExams items={strip} title={hi ? 'आपकी चुनी परीक्षाएँ' : 'Your Selected Exams'} />

        <h2 className="mt-6 text-[15px] font-bold" style={{ color: VIOLET }}>
          {hi ? `${current.name} विषय चुनें` : `Select ${current.name} Subject`}
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {offers.map((offer) => {
            const on = picked === offer.subjectId;
            return (
              <button
                key={offer.subjectId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicked(offer.subjectId)}
                className={`flex flex-col rounded-2xl border bg-white p-3.5 text-left transition-colors ${
                  on ? 'border-[#6d4aed] bg-[#f8f6ff]' : 'border-[#eceaf6]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[20px]"
                    style={{ backgroundColor: `${offer.color}1a` }}
                    aria-hidden
                  >
                    {offer.icon}
                  </span>
                  <span
                    aria-hidden
                    className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
                      on ? 'border-[#6d4aed] bg-[#6d4aed]' : 'border-[#d8d3ee]'
                    }`}
                  >
                    {on ? <Tick small /> : null}
                  </span>
                </div>
                <span className="mt-2.5 text-[14.5px] leading-tight font-bold" style={{ color: INK }}>
                  {t(offer.name, lang)}
                </span>
                {offer.hint ? (
                  <span className="mt-1 line-clamp-3 text-[11.5px] leading-snug text-[#6b7280]">
                    {t(offer.hint, lang)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <Tip>
          {hi
            ? 'आप बाद में प्रोफ़ाइल सेटिंग्स से विषय जोड़ या बदल सकते हैं।'
            : 'You can add or change subject later from your profile settings.'}
        </Tip>
      </div>

      <ContinueBar
        onClick={submit}
        disabled={!picked}
        busy={saving}
        label={saving ? (hi ? 'सहेजा जा रहा है…' : 'Saving…') : hi ? 'आगे बढ़ें' : 'Continue'}
      >
        {failed ? (
          <ErrorNote>
            {hi
              ? 'विषय सहेजा नहीं जा सका। कनेक्शन जाँचकर पुनः प्रयास करें।'
              : 'Could not save your subject. Check your connection and try again.'}
          </ErrorNote>
        ) : null}
      </ContinueBar>
    </div>
  );
}
