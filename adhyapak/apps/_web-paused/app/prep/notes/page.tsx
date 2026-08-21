'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  listPrepSections,
  listTopicFrequency,
  listTopicsForSubject,
  listTopicsForSubjectTree,
  listSubjectParts,
  t,
  type Bilingual,
  type PrepSection,
  type SubjectPart,
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
 * Notes, by section and then by chapter.
 *
 * WHAT A "CHAPTER" IS HERE
 *
 * The design shows a chapter list — "बाल विकास की अवधारणा", "6 Topics · ~32
 * Pages" — under each section. `units`, the table that would hold chapters, is
 * empty and no topic carries a `unit_id`, so there is no chapter layer in the
 * data to render. What exists is the syllabus topic list, which at this level
 * of the syllabus *is* the chapter list: the design's own chapter titles are
 * word for word the CDP topics.
 *
 * So topics are listed as chapters. When `units` is populated they group under
 * it and this screen reads the group instead.
 *
 * The page count is deliberately absent. "~32 Pages" is a claim about notes
 * that have not been written; there is no column for it and no way to count it.
 * What can be counted is how many questions the bank holds for that topic, and
 * that is a more useful number to a candidate deciding where to start — so
 * that is what the second line says, and it says zero honestly.
 */

function NotesScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const { selection, selections, loading } = useSelection();
  const askedFor = useSearchParams().get('level');

  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ id: string; name: Bilingual }[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [parts, setParts] = useState<SubjectPart[]>([]);
  const [all, setAll] = useState(false);

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [secs, freq] = await Promise.all([
        listPrepSections(examId, level, electiveId),
        listTopicFrequency(examId),
      ]);
      if (!live) return;
      setSections(secs);
      setActive((a) => a ?? secs[0]?.subjectId ?? null);
      const map: Record<string, number> = {};
      for (const row of freq) map[row.topicId] = row.questionCount;
      setCounts(map);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  useEffect(() => {
    let live = true;
    if (!active) return;
    void (async () => {
      const children = await listSubjectParts(active);
      if (!live) return;
      setParts(children);
      // A composite section — Science — lists every part's chapters together.
      const list =
        children.length > 0
          ? await listTopicsForSubjectTree(active)
          : await listTopicsForSubject(active);
      if (!live) return;
      setTopics(list);
      setAll(false);
    })();
    return () => {
      live = false;
    };
  }, [active]);

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

  if (!askedFor && selections.length > 1) {
    return (
      <PrepShell lang={lang}>
        {(openMenu) => (
          <div className="min-h-dvh bg-[#faf9ff] pb-24">
            <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
              <PrepHeader
                title={hi ? 'नोट्स' : 'Notes'}
                subtitle={hi ? 'बेहतर पढ़ाई, बेहतर अंक' : 'Study Smart, Score Better'}
                onMenu={openMenu}
                lang={lang}
              />
              <SelectionPicker
                title={hi ? 'नोट्स देखने हेतु परीक्षा चुनें' : 'Select an Exam to View Notes'}
                subtitle={
                  hi
                    ? 'नोट्स केवल उन्हीं परीक्षाओं के दिखेंगे जो आपने चुनी हैं।'
                    : 'Notes will be shown only for the exams you selected.'
                }
                items={selections.map((s) => ({
                  key: s.level.id,
                  examShort: s.exam?.shortName ?? '',
                  levelName: s.level.name,
                  subjectName: s.subject ? t(s.subject.name, lang) : undefined,
                  icon: s.subject?.icon ?? s.level.icon,
                  color: s.subject?.color ?? s.level.color,
                }))}
                hrefFor={(key) => `/prep/notes?level=${key}`}
              />
            </div>
            <PrepNav active="/notes" lang={lang} />
          </div>
        )}
      </PrepShell>
    );
  }

  const shown = all ? topics : topics.slice(0, 12);

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <div className="min-h-dvh bg-[#faf9ff] pb-24">
          <div className="fluid mx-auto w-full max-w-[760px] lg:max-w-[1040px]">
            <PrepHeader
              title={hi ? 'नोट्स' : 'Notes'}
              subtitle={selectionTitle(selection, subjectName)}
              onMenu={openMenu}
              back="/prep"
              lang={lang}
            />

            <div className="border-b border-[#eeebf8] px-5 pb-3">
              <div className="rail mt-3 flex gap-4 pb-1">
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
            </div>

            <div className="px-5 pt-4">
              <h2 className="flex items-center gap-2 text-[16px] font-extrabold" style={{ color: INK }}>
                <span aria-hidden>📖</span>
                {chosen ? `${chosen.shortName} — ` : ''}
                {hi ? 'अध्याय' : 'Chapters'}
                {parts.length > 0 ? (
                  <span className="text-[12px] font-semibold" style={{ color: MUTED }}>
                    ({parts.length} {hi ? 'विषय' : 'subjects'})
                  </span>
                ) : null}
              </h2>

              {topics.length === 0 ? (
                <div className="mt-3">
                  <EmptyNote>
                    {hi
                      ? 'इस अनुभाग के अध्याय अभी नहीं जोड़े गए।'
                      : 'Chapters for this section have not been added yet.'}
                  </EmptyNote>
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2.5">
                    {shown.map((topic, i) => {
                      const n = counts[topic.id] ?? 0;
                      return (
                        <Link
                          key={topic.id}
                          href={`/practice/topic/${topic.id}`}
                          className="flex items-center gap-3 rounded-2xl bg-white p-3.5"
                        >
                          <span
                            aria-hidden
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[15px] font-bold"
                            style={{
                              backgroundColor: `${chosen?.color ?? VIOLET}1a`,
                              color: chosen?.color ?? VIOLET,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className="block text-[14.5px] leading-snug font-bold"
                              style={{ color: INK }}
                            >
                              {t(topic.name, lang)}
                            </span>
                            {/* Questions in the bank, not a page count — see the
                                note at the head of this file. */}
                            <span className="mt-0.5 block text-[12px]" style={{ color: MUTED }}>
                              {hi ? `${n} प्रश्न` : `${n} question${n === 1 ? '' : 's'}`}
                            </span>
                          </span>
                          <span aria-hidden style={{ color: '#c4bfda' }}>
                            ›
                          </span>
                        </Link>
                      );
                    })}
                  </div>

                  {topics.length > 12 ? (
                    <button
                      type="button"
                      onClick={() => setAll((v) => !v)}
                      className="mt-3 w-full rounded-2xl bg-[#f1eefc] py-3 text-center text-[13px] font-bold"
                      style={{ color: VIOLET }}
                    >
                      {all
                        ? hi
                          ? 'कम दिखाएँ'
                          : 'Show fewer'
                        : hi
                          ? `सभी अध्याय देखें (${topics.length})`
                          : `View All Chapters (${topics.length})`}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <PrepNav active="/notes" lang={lang} />
        </div>
      )}
    </PrepShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#faf9ff]" />}>
      <NotesScreen />
    </Suspense>
  );
}
