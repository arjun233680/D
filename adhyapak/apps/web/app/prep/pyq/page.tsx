'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  listPrepSections,
  listPyqSessions,
  listSubjectParts,
  listTopicsForSubject,
  listTopicsForSubjectTree,
  t,
  type Bilingual,
  type PrepSection,
  type PyqSession,
  type SubjectPart,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { EmptyNote, INK, MUTED, PrepHeader, PrepNav, PrepShell, VIOLET } from '../ui';
import { selectionTitle, useSelection } from '../useSelection';

/**
 * Previous year questions, three ways.
 *
 * Full Test    — a whole paper as it was sat, one card per year.
 * Section Wise — one block of the paper across every year: all the CDP ever
 *                asked, by year, with an "all years at once" set on top.
 * Topic Wise   — narrower still, down to "Venn Diagrams" or "मुहावरे".
 *
 * The sections are the paper's own blueprint from `paper_sections`, with the
 * 60-mark elective resolved to the learner's chosen subject — so an HTET TGT
 * Science candidate sees seven named sections and a Maths candidate sees the
 * same six plus Maths, without either list being written down here.
 *
 * WHY EVERY YEAR IS LISTED EVEN AT ZERO
 *
 * The years come from `pyq_years` — when the board actually held the exam —
 * and the counts from the bank. Those are different facts and the screen used
 * to conflate them: it built its year list out of `questions`, so an empty bank
 * showed an empty screen, and an aspirant saw nothing where seven papers exist.
 * Now 2018 to 2024 always appear, and a year we hold none of says zero.
 */

type Tab = 'full' | 'section' | 'topic';

const TABS: { id: Tab; icon: string; label: Bilingual }[] = [
  { id: 'full', icon: '📄', label: { en: 'Full Test', hi: 'पूर्ण टेस्ट' } },
  { id: 'section', icon: '🥧', label: { en: 'Section Wise', hi: 'अनुभाग अनुसार' } },
  { id: 'topic', icon: '☰', label: { en: 'Topic Wise', hi: 'टॉपिक अनुसार' } },
];

/** Card tints, cycled so a column of years does not read as one grey block. */
const TINTS = ['#f1eefc', '#e8f7ee', '#fff3e6', '#fdeaf3', '#e6f0fd', '#f6efff', '#e9f7f3'];

function PyqBrowser() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { selection, loading } = useSelection();

  const [tab, setTab] = useState<Tab>('full');
  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [paperYears, setPaperYears] = useState<PyqSession[]>([]);
  const [sectionYears, setSectionYears] = useState<PyqSession[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: Bilingual }[]>([]);
  const [parts, setParts] = useState<SubjectPart[]>([]);
  /** Which part of a composite section is open — null means "All". */
  const [part, setPart] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [list, sessions] = await Promise.all([
        listPrepSections(examId, level, electiveId),
        listPyqSessions(examId),
      ]);
      if (!live) return;
      setSections(list);
      setActive((a) => a ?? list[0]?.subjectId ?? null);
      setPaperYears(sessions);
      setBusy(false);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  // The section and topic tabs both hang off the selected chip, so they load
  // together rather than each keeping its own idea of which section is open.
  useEffect(() => {
    let live = true;
    if (!examId || !active) return;
    void (async () => {
      const [sessions, children] = await Promise.all([
        listPyqSessions(examId, active),
        listSubjectParts(active),
      ]);
      if (!live) return;
      setSectionYears(sessions);
      setParts(children);
      setPart(null);
      // "All" spans the section and its parts; a part tab is just that subject.
      const list = children.length > 0 ? await listTopicsForSubjectTree(active) : await listTopicsForSubject(active);
      if (!live) return;
      setTopics(list);
    })();
    return () => {
      live = false;
    };
  }, [examId, active]);

  // A part tab narrows the topic list to that subject; "All" spans the tree.
  useEffect(() => {
    let live = true;
    if (!active || parts.length === 0) return;
    void (async () => {
      const list = part ? await listTopicsForSubject(part) : await listTopicsForSubjectTree(active);
      if (live) setTopics(list);
    })();
    return () => {
      live = false;
    };
  }, [part, active, parts.length]);

  const chosen = useMemo(() => sections.find((s) => s.subjectId === active), [sections, active]);

  if (loading || !selection) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white">
        <p className="text-[13px]" style={{ color: MUTED }}>
          {hi ? 'लाया जा रहा है…' : 'Loading…'}
        </p>
      </div>
    );
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <div className="min-h-dvh bg-[#faf9ff] pb-24">
          <div className="mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
            <PrepHeader
              title="PYQ"
              subtitle={selectionTitle(selection, subjectName)}
              onMenu={openMenu}
              back="/prep"
              lang={lang}
            />

            <div className="mt-4 grid grid-cols-3 border-b border-[#eeebf8]">
              {TABS.map((item) => {
                const on = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-pressed={on}
                    className="flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold"
                    style={{
                      color: on ? VIOLET : MUTED,
                      borderBottom: on ? `2px solid ${VIOLET}` : '2px solid transparent',
                    }}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {t(item.label, lang)}
                  </button>
                );
              })}
            </div>

            <div className="px-5 pt-5">
              {tab === 'full' ? (
                <FullTest years={paperYears} busy={busy} hi={hi} />
              ) : (
                <>
                  <SectionChips sections={sections} active={active} onPick={setActive} lang={lang} />
                  {chosen ? (
                    <section className="mt-4 rounded-2xl bg-[#f4f1fd] p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[17px]"
                          style={{ backgroundColor: `${chosen.color}1a` }}
                          aria-hidden
                        >
                          {chosen.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[18px] font-extrabold" style={{ color: chosen.color }}>
                            {chosen.shortName}
                          </p>
                          {/* The syllabus wording under the chip's short one —
                              "CDP" over "(Child Development & Pedagogy)". */}
                          <p className="text-[13px]" style={{ color: MUTED }}>
                            ({t(chosen.name, lang)})
                          </p>
                          <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
                            {tab === 'topic'
                              ? parts.length > 0
                                ? hi
                                  ? `कुल टॉपिक्स: ${parts.length} विषय, ${topics.length} टॉपिक्स`
                                  : `${parts.length} subjects, ${topics.length} topics`
                                : hi
                                  ? `कुल टॉपिक्स: ${topics.length}`
                                  : `${topics.length} topics`
                              : hi
                                ? 'विगत वर्ष प्रश्न — वर्ष अनुसार'
                                : 'Practice PYQs Year Wise'}
                          </p>
                        </div>
                      </div>

                      {/* A section that is several subjects offers them as tabs.
                          One that is not shows nothing here — a lone "All" tab
                          is a control with no choice in it. */}
                      {parts.length > 0 ? (
                        <div className="rail mt-3 flex gap-2">
                          <PartTab
                            label={hi ? 'सभी' : 'All'}
                            on={part === null}
                            color={chosen.color}
                            onClick={() => setPart(null)}
                          />
                          {parts.map((p) => (
                            <PartTab
                              key={p.subjectId}
                              label={p.shortName}
                              on={part === p.subjectId}
                              color={chosen.color}
                              onClick={() => setPart(p.subjectId)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {tab === 'section' ? (
                    <SectionWise years={sectionYears} hi={hi} />
                  ) : (
                    <TopicWise topics={topics} lang={lang} hi={hi} />
                  )}
                </>
              )}
            </div>
          </div>

          <PrepNav active="/" lang={lang} />
        </div>
      )}
    </PrepShell>
  );
}

/* ------------------------------------------------------------------ tabs */

function FullTest({ years, busy, hi }: { years: PyqSession[]; busy: boolean; hi: boolean }) {
  return (
    <>
      <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
        <span aria-hidden className="text-[20px]">
          📄
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-extrabold" style={{ color: INK }}>
            {hi ? 'पूर्ण टेस्ट (वर्ष अनुसार)' : 'Full Test (Year Wise)'}
          </p>
          <p className="text-[13px] leading-snug" style={{ color: MUTED }}>
            {hi
              ? 'पूरे विगत वर्ष पेपर असली परीक्षा की तरह हल करें'
              : 'Solve complete previous year papers as a real exam'}
          </p>
        </div>
        <span
          className="shrink-0 rounded-xl border border-[#ded9f3] px-3 py-2 text-[12px] font-bold"
          style={{ color: VIOLET }}
        >
          {hi ? 'पैटर्न' : 'Exam Pattern'}
        </span>
      </div>

      <div className="mt-4">
        {busy ? null : years.length === 0 ? (
          <EmptyNote>
            {hi
              ? 'इस परीक्षा के लिए अभी कोई वर्ष दर्ज नहीं है।'
              : 'No years recorded for this exam yet.'}
          </EmptyNote>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {years.map((y, i) => (
              <article
                key={y.year}
                className="rounded-2xl p-2.5"
                style={{ backgroundColor: TINTS[i % TINTS.length] }}
              >
                <span aria-hidden className="text-[20px]">
                  🗓️
                </span>
                <p className="mt-1 text-[20px] leading-none font-extrabold" style={{ color: INK }}>
                  {y.year}
                </p>
                <p className="mt-3 text-[12px]" style={{ color: MUTED }}>
                  {hi ? 'प्रश्नों की संख्या' : 'No. of Questions'}
                </p>
                <p className="text-[18px] font-bold" style={{ color: INK }}>
                  {y.collected}
                  {/* A year we hold part of says so, rather than implying the
                      whole paper is here. */}
                  {y.paperQuestions && y.collected < y.paperQuestions ? (
                    <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
                      {' '}
                      / {y.paperQuestions}
                    </span>
                  ) : null}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SectionWise({ years, hi }: { years: PyqSession[]; hi: boolean }) {
  const total = years.reduce((sum, y) => sum + y.collected, 0);
  if (years.length === 0) {
    return (
      <div className="mt-4">
        <EmptyNote>
          {hi ? 'इस अनुभाग के लिए अभी कोई वर्ष नहीं है।' : 'No years for this section yet.'}
        </EmptyNote>
      </div>
    );
  }
  const first = years[years.length - 1]!.year;
  const last = years[0]!.year;
  return (
    <div className="mt-4 space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
      <Row
        title={
          hi
            ? `सभी वर्ष (${first}-${last}) एक साथ`
            : `All Years (${first}-${last}) at a Time`
        }
        note={hi ? `कुल प्रश्न: ${total}` : `Total questions: ${total}`}
        sub={hi ? 'संयुक्त PYQ' : 'Combined PYQs'}
      />
      {years.map((y) => (
        <Row
          key={y.year}
          title={String(y.year)}
          note={hi ? `कुल प्रश्न: ${y.collected}` : `Total questions: ${y.collected}`}
        />
      ))}
    </div>
  );
}

function TopicWise({
  topics,
  lang,
  hi,
}: {
  topics: { id: string; name: Bilingual }[];
  lang: 'en' | 'hi';
  hi: boolean;
}) {
  const [all, setAll] = useState(false);
  if (topics.length === 0) {
    return (
      <div className="mt-4">
        <EmptyNote>
          {hi ? 'इस अनुभाग के टॉपिक अभी नहीं जोड़े गए।' : 'Topics for this section are not added yet.'}
        </EmptyNote>
      </div>
    );
  }
  const shown = all ? topics : topics.slice(0, 20);
  return (
    <div className="mt-4">
      <div className="divide-y divide-[#f4f1fd] rounded-2xl bg-white lg:grid lg:grid-cols-2 lg:gap-x-6 lg:divide-y-0 lg:p-2">
        {shown.map((topic, i) => (
          <div key={topic.id} className="flex items-center gap-2.5 border-b border-[#f4f1fd] px-3 py-2.5 lg:border-b-0">
            <span aria-hidden className="text-[16px]">
              📖
            </span>
            <span className="w-6 text-[13px] font-semibold" style={{ color: MUTED }}>
              {i + 1}.
            </span>
            <span className="min-w-0 flex-1 text-[14px]" style={{ color: INK }}>
              {t(topic.name, lang)}
            </span>
            <span aria-hidden style={{ color: '#c4bfda' }}>
              ›
            </span>
          </div>
        ))}
      </div>
      {topics.length > 16 ? (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-3 w-full text-center text-[13px] font-semibold"
          style={{ color: VIOLET }}
        >
          {all
            ? hi
              ? 'कम दिखाएँ'
              : 'Show fewer'
            : hi
              ? `और देखें (कुल ${topics.length} टॉपिक्स)`
              : `Show all ${topics.length} topics`}
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- fragments */

function SectionChips({
  sections,
  active,
  onPick,
  lang,
}: {
  sections: PrepSection[];
  active: string | null;
  onPick: (id: string) => void;
  lang: 'en' | 'hi';
}) {
  // A scroll rail only while the row cannot fit. Given the width it lays out
  // properly instead, because a rail on a desktop hides half its contents
  // behind a scrollbar nobody thinks to look for.
  return (
    <div className="rail flex gap-4 pb-1 sm:flex-wrap sm:justify-start sm:overflow-visible">
      {sections.map((s) => {
        const on = s.subjectId === active;
        return (
          <button
            key={s.subjectId}
            type="button"
            onClick={() => onPick(s.subjectId)}
            aria-pressed={on}
            className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 sm:w-[88px]"
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-[17px]"
              style={{ backgroundColor: `${s.color}1a` }}
              aria-hidden
            >
              {s.icon}
            </span>
            <span
              className="text-center text-[12px] leading-tight font-semibold"
              style={{ color: on ? s.color : MUTED }}
            >
              {s.shortName}
            </span>
            <span
              aria-hidden
              className="h-[2px] w-8 rounded-full"
              style={{ background: on ? s.color : 'transparent' }}
            />
          </button>
        );
      })}
    </div>
  );
}

function PartTab({
  label,
  on,
  color,
  onClick,
}: {
  label: string;
  on: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold"
      style={
        on
          ? { background: color, color: '#fff' }
          : { border: '1px solid #e8e4f6', background: '#fff', color: MUTED }
      }
    >
      {label}
    </button>
  );
}

function Row({ title, note, sub }: { title: string; note: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1eefc] text-[15px]"
      >
        🗓️
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold" style={{ color: INK }}>
          {title}
        </span>
        {sub ? (
          <span className="block text-[12px]" style={{ color: MUTED }}>
            {sub}
          </span>
        ) : null}
        <span className="block text-[12px]" style={{ color: MUTED }}>
          {note}
        </span>
      </span>
      <span aria-hidden style={{ color: '#c4bfda' }}>
        ›
      </span>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <PyqBrowser />
    </Suspense>
  );
}
