'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { EXAMS, SUBJECTS, countQuestions, formatCount, listNotes, listTests, listVideos, t, UI } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, SectionHeader } from '@/components/ui';
import { ExamCard, NoteCard, TestCard, VideoCard } from '@/components/cards';

type Scope = 'all' | 'national' | 'state';

export default function ExplorePage() {
  const { lang } = useStore();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');

  const q = query.trim().toLowerCase();

  const exams = useMemo(
    () =>
      EXAMS.filter((e) => (scope === 'all' ? true : e.scope === scope)).filter(
        (e) =>
          !q ||
          e.shortName.toLowerCase().includes(q) ||
          e.name.en.toLowerCase().includes(q) ||
          e.name.hi.includes(query) ||
          (e.state?.en.toLowerCase().includes(q) ?? false),
      ),
    [q, query, scope],
  );

  // Search runs over what the repository serves, so it finds imported content
  // as well as bundled content — and, being published-only, never surfaces a
  // draft through the search box. The three lists load once and are then
  // filtered in memory: search is per-keystroke, and a query per keystroke is
  // how you melt a phone.
  const library = useAsync(
    async () => ({
      videos: await listVideos(),
      notes: await listNotes(),
      tests: await listTests(),
    }),
    [],
  );

  const matches = <T extends { title: { en: string; hi: string } }>(items: T[]): T[] =>
    q ? items.filter((x) => x.title.en.toLowerCase().includes(q) || x.title.hi.includes(query)) : [];

  const videos = matches(library.data?.videos ?? []);
  const notes = matches(library.data?.notes ?? []);
  const tests = matches(library.data?.tests ?? []);

  const scopes: { id: Scope; label: { en: string; hi: string } }[] = [
    { id: 'all', label: { en: 'All exams', hi: 'सभी परीक्षाएँ' } },
    { id: 'national', label: { en: 'National', hi: 'राष्ट्रीय' } },
    { id: 'state', label: { en: 'State TET', hi: 'राज्य TET' } },
  ];

  return (
    <div className="space-y-8 px-4 pt-4 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{lang === 'hi' ? 'खोजें' : 'Explore'}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? `${EXAMS.length} परीक्षाएँ · ${SUBJECTS.length} विषय · हिंदी एवं अंग्रेज़ी`
            : `${EXAMS.length} exams · ${SUBJECTS.length} subjects · Hindi & English`}
        </p>
      </div>

      <div className="sticky top-14 z-20 -mx-4 bg-[var(--color-canvas)] px-4 py-2 sm:mx-0 sm:px-0">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(UI.search, lang)}
          className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5 text-[14px] outline-none focus:border-[var(--color-brand)]"
        />
        <div className="mt-2 flex gap-2">
          {scopes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                scope === s.id
                  ? 'border-transparent bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
              }`}
            >
              {t(s.label, lang)}
            </button>
          ))}
        </div>
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
        <SectionHeader
          title={lang === 'hi' ? 'परीक्षाएँ' : 'Exams'}
          subtitle={`${exams.length} ${lang === 'hi' ? 'परिणाम' : 'results'}`}
        />
        {exams.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {exams.map((e) => (
              <div key={e.id} className="contents">
                <ExamCard exam={e} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🔍"
            title={lang === 'hi' ? 'कोई परिणाम नहीं' : 'No results'}
            body={
              lang === 'hi'
                ? 'दूसरे शब्दों से खोजें, जैसे CTET, REET या हरियाणा।'
                : 'Try another term — CTET, REET or Haryana, for example.'
            }
          />
        )}
      </section>

      <section>
        <SectionHeader title={lang === 'hi' ? 'विषय' : 'Subjects'} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((s) => (
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
                  <Badge tone="neutral">
                    {formatCount(s.topics.reduce((sum, x) => sum + x.questionCount, 0))}{' '}
                    {lang === 'hi' ? 'प्रश्न' : 'questions'}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
