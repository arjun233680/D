'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  listPrepSections,
  listPyqYearCounts,
  listTopicsForSubject,
  t,
  type Bilingual,
  type PrepSection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { EmptyNote, INK, MUTED, PrepHeader, PrepNav, PrepShell, VIOLET } from '../ui';
import { selectionTitle, useSelection } from '../useSelection';

/**
 * Previous year questions, three ways.
 *
 * Full Test    — a whole paper as it was sat, one card per year.
 * Section Wise — one block of the paper across every year: all the CDP that
 *                has ever been asked, by year.
 * Topic Wise   — narrower still, down to "Venn Diagrams" or "मुहावरे".
 *
 * The sections are the paper's own blueprint from `paper_sections`, with the
 * 60-mark elective resolved to the learner's chosen subject — so an HTET TGT
 * Science candidate sees seven named sections and a Maths candidate sees the
 * same six plus Maths, without either list being written down anywhere.
 *
 * WHAT THE COUNTS MEAN
 *
 * Every number here is questions actually in the bank, not the blueprint's.
 * The design shows "150" against each year and "1260" against all years, which
 * is what a complete import would look like; with nothing imported the honest
 * figure is zero, and a year with forty of its hundred and fifty collected
 * must say forty. So years with nothing are not listed at all — a card that
 * opens onto an empty paper is worse than an explanation — and each tab says
 * so plainly instead.
 */

type Tab = 'full' | 'section' | 'topic';

const TABS: { id: Tab; icon: string; label: Bilingual }[] = [
  { id: 'full', icon: '📄', label: { en: 'Full Test', hi: 'पूर्ण टेस्ट' } },
  { id: 'section', icon: '🥧', label: { en: 'Section Wise', hi: 'अनुभाग अनुसार' } },
  { id: 'topic', icon: '☰', label: { en: 'Topic Wise', hi: 'टॉपिक अनुसार' } },
];

/** Card tints, cycled so a list of years does not read as one grey block. */
const TINTS = ['#f1eefc', '#e8f7ee', '#fff3e6', '#fdeaf3', '#e6f0fd', '#f6efff', '#e9f7f3'];

function PyqBrowser() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { selection, loading } = useSelection();

  const [tab, setTab] = useState<Tab>('full');
  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [years, setYears] = useState<{ year: number; questions: number }[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: Bilingual }[]>([]);
  const [busy, setBusy] = useState(true);

  const examId = selection?.exam?.id;
  const post = selection?.level.name;

  useEffect(() => {
    let live = true;
    if (!examId || !post) return;
    void (async () => {
      const [list, counts] = await Promise.all([
        listPrepSections(examId, post, selection?.subject?.subjectId),
        listPyqYearCounts({ examId }),
      ]);
      if (!live) return;
      setSections(list);
      setActive((a) => a ?? list[0]?.subjectId ?? null);
      setYears(aggregate(counts));
      setBusy(false);
    })();
    return () => {
      live = false;
    };
  }, [examId, post, selection?.subject?.subjectId]);

  // Section and topic tabs both hang off the chip that is selected, so they
  // reload together rather than each keeping its own idea of "which section".
  useEffect(() => {
    let live = true;
    if (!examId || !active) return;
    void (async () => {
      const [counts, list] = await Promise.all([
        listPyqYearCounts({ examId, subjectId: active }),
        listTopicsForSubject(active),
      ]);
      if (!live) return;
      setYears(tab === 'full' ? years : aggregate(counts));
      setTopics(list);
    })();
    return () => {
      live = false;
    };
    // `years` is written here and must not re-trigger the effect that writes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, active, tab]);

  const chosen = useMemo(
    () => sections.find((s) => s.subjectId === active),
    [sections, active],
  );

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
          <div className="mx-auto w-full max-w-[760px]">
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
                    className="flex items-center justify-center gap-1.5 py-3 text-[13.5px] font-semibold"
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
                <FullTest years={years} busy={busy} hi={hi} />
              ) : (
                <>
                  <SectionChips
                    sections={sections}
                    active={active}
                    onPick={setActive}
                    lang={lang}
                  />
                  {chosen ? (
                    <section className="mt-4 rounded-2xl bg-[#f4f1fd] p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[20px]"
                          style={{ backgroundColor: `${chosen.color}1a` }}
                          aria-hidden
                        >
                          {chosen.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[17px] font-extrabold" style={{ color: chosen.color }}>
                            {t(chosen.name, lang)}
                          </p>
                          <p className="text-[12px]" style={{ color: MUTED }}>
                            {hi
                              ? `कुल टॉपिक्स: ${topics.length} · पेपर में ${chosen.questions} प्रश्न`
                              : `${topics.length} topics · ${chosen.questions} questions in the paper`}
                          </p>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {tab === 'section' ? (
                    <SectionWise years={years} hi={hi} />
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

/* ----------------------------------------------------------------- tabs */

function FullTest({
  years,
  busy,
  hi,
}: {
  years: { year: number; questions: number }[];
  busy: boolean;
  hi: boolean;
}) {
  return (
    <>
      <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
        <span aria-hidden className="text-[22px]">
          📄
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold" style={{ color: INK }}>
            {hi ? 'पूर्ण टेस्ट (वर्ष अनुसार)' : 'Full Test (Year Wise)'}
          </p>
          <p className="text-[12.5px] leading-snug" style={{ color: MUTED }}>
            {hi
              ? 'पूरे विगत वर्ष पेपर असली परीक्षा की तरह हल करें'
              : 'Solve complete previous year papers as a real exam'}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {busy ? null : years.length === 0 ? (
          <EmptyNote>
            {hi
              ? 'अभी कोई विगत वर्ष पेपर लोड नहीं हुआ है। जैसे ही पेपर आयात होंगे, हर वर्ष यहाँ अपने प्रश्नों की संख्या के साथ दिखेगा।'
              : 'No past papers loaded yet. As papers are imported, each year appears here with the number of questions behind it.'}
          </EmptyNote>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {years.map((y, i) => (
              <article
                key={y.year}
                className="rounded-2xl p-4"
                style={{ backgroundColor: TINTS[i % TINTS.length] }}
              >
                <span aria-hidden className="text-[22px]">
                  🗓️
                </span>
                <p className="mt-1 text-[22px] font-extrabold" style={{ color: INK }}>
                  {y.year}
                </p>
                <p className="mt-2 text-[11.5px]" style={{ color: MUTED }}>
                  {hi ? 'प्रश्नों की संख्या' : 'No. of Questions'}
                </p>
                <p className="text-[16px] font-bold" style={{ color: INK }}>
                  {y.questions}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function SectionWise({ years, hi }: { years: { year: number; questions: number }[]; hi: boolean }) {
  const total = years.reduce((sum, y) => sum + y.questions, 0);
  if (years.length === 0) {
    return (
      <div className="mt-4">
        <EmptyNote>
          {hi
            ? 'इस अनुभाग के लिए अभी कोई प्रश्न बैंक में नहीं है।'
            : 'No questions in the bank for this section yet.'}
        </EmptyNote>
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2.5">
      <Row
        title={hi ? `सभी वर्ष एक साथ` : 'All Years at a Time'}
        note={hi ? `कुल प्रश्न: ${total}` : `Total questions: ${total}`}
        icon="🗓️"
      />
      {years.map((y) => (
        <Row
          key={y.year}
          title={String(y.year)}
          note={hi ? `कुल प्रश्न: ${y.questions}` : `Total questions: ${y.questions}`}
          icon="🗓️"
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
  const shown = all ? topics : topics.slice(0, 16);
  return (
    <div className="mt-4">
      <div className="divide-y divide-[#f1eefa] rounded-2xl bg-white">
        {shown.map((topic, i) => (
          <div key={topic.id} className="flex items-center gap-3 px-4 py-3.5">
            <span aria-hidden className="text-[15px]">
              📖
            </span>
            <span className="text-[13px] font-semibold" style={{ color: MUTED }}>
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

/* ------------------------------------------------------------ fragments */

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
  return (
    <div className="rail flex gap-4 pb-1">
      {sections.map((s) => {
        const on = s.subjectId === active;
        return (
          <button
            key={s.subjectId}
            type="button"
            onClick={() => onPick(s.subjectId)}
            aria-pressed={on}
            className="flex w-[74px] shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-full text-[20px]"
              style={{ backgroundColor: `${s.color}1a` }}
              aria-hidden
            >
              {s.icon}
            </span>
            <span
              className="text-center text-[11px] leading-tight font-semibold"
              style={{ color: on ? s.color : MUTED }}
            >
              {t(s.name, lang)}
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

function Row({ title, note, icon }: { title: string; note: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
      <span
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1eefc] text-[16px]"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold" style={{ color: INK }}>
          {title}
        </span>
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

/** `pyq_year_counts` is per topic per year; a screen wants it per year. */
const aggregate = (
  rows: { year: number; questionCount: number }[],
): { year: number; questions: number }[] => {
  const byYear = new Map<number, number>();
  for (const r of rows) byYear.set(r.year, (byYear.get(r.year) ?? 0) + r.questionCount);
  return [...byYear.entries()]
    .map(([year, questions]) => ({ year, questions }))
    .sort((a, b) => b.year - a.year);
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <PyqBrowser />
    </Suspense>
  );
}
