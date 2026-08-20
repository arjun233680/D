'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  listPrepSections,
  listTests,
  t,
  testMaxMarks,
  testQuestionCount,
  type PrepSection,
  type Test,
  type TestType,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import {
  EmptyNote,
  INK,
  MUTED,
  PrepHeader,
  PrepNav,
  PrepShell,
  SelectionPicker,
  VIOLET,
} from '../ui';
import { selectionTitle, useSelection } from '../useSelection';

/**
 * Test Series for one selection.
 *
 * Every figure on a card is counted from the paper itself — questions from its
 * sections, marks from questions times marks-per-question, minutes from its own
 * duration. The design shows "150 Questions · 150 Marks · 2:30 Hrs" against
 * every row, which is what a full mock looks like; a fifteen-question sectional
 * says fifteen, because that is what sitting it involves.
 *
 * `attempts` is deliberately absent. `Test` carries a comment explaining why:
 * the bundle used to declare "184.6K attempts" for papers nobody had sat. It
 * comes back when it can be counted.
 */

type Tab = 'all' | 'subject' | 'mine';

const TABS: { id: Tab; icon: string; label: { en: string; hi: string } }[] = [
  { id: 'all', icon: '📄', label: { en: 'All Tests', hi: 'सभी टेस्ट' } },
  { id: 'subject', icon: '📖', label: { en: 'Subject Wise', hi: 'विषय अनुसार' } },
  { id: 'mine', icon: '🔖', label: { en: 'My Tests', hi: 'मेरे टेस्ट' } },
];

const BADGE: Record<TestType, { en: string; hi: string; tint: string; color: string }> = {
  mock: { en: 'Full Syllabus', hi: 'पूर्ण पाठ्यक्रम', tint: '#e8f7ee', color: '#16a34a' },
  pyq: { en: 'PYQ', hi: 'विगत वर्ष', tint: '#f1eefc', color: '#6d4aed' },
  sectional: { en: 'Sectional', hi: 'अनुभागीय', tint: '#fff3e6', color: '#ea580c' },
  'daily-quiz': { en: 'Daily Quiz', hi: 'दैनिक क्विज़', tint: '#e6f0fd', color: '#2563eb' },
};

const hoursLabel = (minutes: number, hi: boolean): string => {
  if (minutes < 60) return hi ? `${minutes} मिनट` : `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const clock = m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`;
  return hi ? `${clock} घंटे` : `${clock} Hrs`;
};

function TestSeries() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { selection, selections, loading } = useSelection();
  const askedFor = useSearchParams().get('level');

  const [tab, setTab] = useState<Tab>('all');
  const [tests, setTests] = useState<Test[] | null>(null);
  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [list, secs] = await Promise.all([
        listTests(examId),
        listPrepSections(examId, level, electiveId),
      ]);
      if (!live) return;
      setTests(list);
      setSections(secs);
      setActive((a) => a ?? secs[0]?.subjectId ?? null);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  /*
   * Subject Wise filters to papers that actually examine the chosen section. A
   * test with no section for that subject is not "not yet attempted" — it is a
   * different paper, and listing it under the wrong heading is what makes a
   * filter untrustworthy.
   */
  const visible = useMemo(() => {
    if (!tests) return [];
    if (tab === 'subject' && active) {
      return tests.filter((x) => x.sections.some((s) => s.subjectId === active));
    }
    return tests;
  }, [tests, tab, active]);

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

  if (!askedFor && selections.length > 1) {
    return (
      <PrepShell lang={lang}>
        {(openMenu) => (
          <div className="min-h-dvh bg-[#faf9ff] pb-24">
            <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
              <PrepHeader
                title={hi ? 'टेस्ट सीरीज़' : 'Test Series'}
                subtitle={hi ? 'अधिक अभ्यास, बेहतर अंक' : 'Practice More, Score Higher'}
                onMenu={openMenu}
                lang={lang}
              />
              <SelectionPicker
                title={hi ? 'टेस्ट देखने हेतु परीक्षा चुनें' : 'Select an Exam to View Tests'}
                subtitle={
                  hi
                    ? 'टेस्ट केवल उन्हीं परीक्षाओं के दिखेंगे जो आपने चुनी हैं।'
                    : 'Tests will be shown only for the exams you selected.'
                }
                items={selections.map((s) => ({
                  key: s.level.id,
                  examShort: s.exam?.shortName ?? '',
                  levelName: s.level.name,
                  subjectName: s.subject ? t(s.subject.name, lang) : undefined,
                  icon: s.subject?.icon ?? s.level.icon,
                  color: s.subject?.color ?? s.level.color,
                }))}
                hrefFor={(key) => `/prep/tests?level=${key}`}
              />
            </div>
            <PrepNav active="/tests" lang={lang} />
          </div>
        )}
      </PrepShell>
    );
  }

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <div className="min-h-dvh bg-[#faf9ff] pb-24">
          <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
            <PrepHeader
              title={hi ? 'टेस्ट सीरीज़' : 'Test Series'}
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
              {tab === 'subject' ? (
                <div className="rail flex gap-4 pb-1">
                  {sections.map((s) => {
                    const on = s.subjectId === active;
                    return (
                      <button
                        key={s.subjectId}
                        type="button"
                        onClick={() => setActive(s.subjectId)}
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
              ) : null}

              {tests === null ? null : tab === 'mine' ? (
                <div className="mt-4">
                  <EmptyNote>
                    {hi
                      ? 'आपने अभी कोई टेस्ट नहीं दिया। जो टेस्ट आप देंगे वे यहाँ आ जाएँगे।'
                      : 'You have not sat a test yet. The ones you take will collect here.'}
                  </EmptyNote>
                </div>
              ) : visible.length === 0 ? (
                <div className="mt-4">
                  <EmptyNote>
                    {hi
                      ? 'इस चयन के लिए अभी कोई टेस्ट नहीं बना है।'
                      : 'No tests have been built for this selection yet.'}
                  </EmptyNote>
                </div>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {visible.map((x) => (
                    <TestCard key={x.id} test={x} lang={lang} hi={hi} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <PrepNav active="/tests" lang={lang} />
        </div>
      )}
    </PrepShell>
  );
}

function TestCard({ test, lang, hi }: { test: Test; lang: 'en' | 'hi'; hi: boolean }) {
  const badge = BADGE[test.type];
  const questions = testQuestionCount(test);
  const marks = testMaxMarks(test);

  return (
    <article className="rounded-2xl bg-white p-3.5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f1eefc] text-[16px]"
        >
          🗓️
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold" style={{ color: INK }}>
              {t(test.title, lang)}
            </p>
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{ backgroundColor: badge.tint, color: badge.color }}
            >
              {hi ? badge.hi : badge.en}
            </span>
          </div>
          {/* Counted from the paper, never declared: an empty section list reads
              as zero rather than as a number nobody measured. */}
          <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
            {hi
              ? `${questions} प्रश्न · ${marks} अंक · ${hoursLabel(test.durationMinutes, true)}`
              : `${questions} Questions · ${marks} Marks · ${hoursLabel(test.durationMinutes, false)}`}
          </p>
        </div>
      </div>

      <Link
        href={`/tests/${test.id}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-bold text-white"
        style={{ background: VIOLET }}
      >
        {hi ? 'टेस्ट शुरू करें' : 'Start Test'}
      </Link>
    </article>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <TestSeries />
    </Suspense>
  );
}
