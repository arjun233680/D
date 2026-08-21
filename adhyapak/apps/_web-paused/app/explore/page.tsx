'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  SUBJECT_BY_ID,
  examBrowsableSubjects,
  getExam,
  listNotes,
  listTests,
  listVideos,
  t,
  UI,
} from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { Badge, SectionHeader } from '@/components/ui';
import { NoteCard, TestCard, VideoCard } from '@/components/cards';

export default function ExplorePage() {
  const { lang, user } = useStore();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const exam = getExam(user.goalExamId);

  // The subjects this exam actually tests, across all of its papers. A grid of
  // every subject in the catalogue offered a Haryana candidate the syllabus of
  // exams they are not sitting.
  const subjects = useMemo(
    () =>
      examBrowsableSubjects(user.goalExamId)
        .map((id) => SUBJECT_BY_ID.get(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [user.goalExamId],
  );

  // Search runs over what the repository serves, so it finds imported content
  // as well as bundled content — and, being published-only, never surfaces a
  // draft through the search box. The three lists load once and are then
  // filtered in memory: search is per-keystroke, and a query per keystroke is
  // how you melt a phone.
  const library = useAsync(
    async () => ({
      videos: await listVideos({ examId: user.goalExamId }),
      notes: await listNotes({ examId: user.goalExamId }),
      tests: await listTests(user.goalExamId),
    }),
    [user.goalExamId],
  );

  const matches = <T extends { title: { en: string; hi: string } }>(items: T[]): T[] =>
    q ? items.filter((x) => x.title.en.toLowerCase().includes(q) || x.title.hi.includes(query)) : [];

  const videos = matches(library.data?.videos ?? []);
  const notes = matches(library.data?.notes ?? []);
  const tests = matches(library.data?.tests ?? []);

  return (
    <div className="space-y-8 px-4 pt-4 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{lang === 'hi' ? 'खोजें' : 'Explore'}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? `${exam ? t(exam.name, lang) : ''} · ${subjects.length} विषय · हिंदी एवं अंग्रेज़ी`
            : `${exam ? t(exam.name, lang) : ''} · ${subjects.length} subjects · Hindi & English`}
        </p>
      </div>

      <div className="sticky top-14 z-20 -mx-4 bg-[var(--color-canvas)] px-4 py-2 sm:mx-0 sm:px-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(UI.search, lang)}
          className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-brand)]"
        />
      </div>

      {q && videos.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'वीडियो' : 'Videos'} />
          <div className="grid gap-3 sm:grid-cols-3">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} width="w-full" />
            ))}
          </div>
        </section>
      ) : null}

      {q && notes.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'नोट्स' : 'Notes'} />
          <div className="grid gap-3 sm:grid-cols-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} width="w-full" />
            ))}
          </div>
        </section>
      ) : null}

      {q && tests.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'टेस्ट' : 'Tests'} />
          <div className="grid gap-3 sm:grid-cols-3">
            {tests.map((x) => (
              <TestCard key={x.id} test={x} width="w-full" />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader title={lang === 'hi' ? 'विषय' : 'Subjects'} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/practice/subject/${s.id}`}
              className="card flex gap-3 p-4 transition-shadow hover:shadow-md"
            >
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{ background: `${s.color}1a` }}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-bold">{t(s.name, lang)}</p>
                <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-muted)]">
                  {t(s.description, lang)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="neutral">
                    {s.topics.length} {lang === 'hi' ? 'टॉपिक' : 'topics'}
                  </Badge>
                  {/* A question-count badge used to sit here, summing a
                      hardcoded per-topic figure. It reported tens of thousands
                      against a bank of 67. Topic count is a fact about the
                      syllabus, so it stays; the other was not. */}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
