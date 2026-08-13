'use client';

import { use, useState } from 'react';
import { notFound } from 'next/navigation';
import {
  BATCHES,
  NOTES,
  TESTS,
  VIDEOS,
  formatCount,
  getExamBySlug,
  getSubject,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { BatchCard, NoteCard, TestCard, VideoCard } from '@/components/cards';
import { Badge, Rail, SectionHeader } from '@/components/ui';

export default function GoalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { lang, user, setGoal } = useStore();
  const exam = getExamBySlug(slug);
  const [paperIndex, setPaperIndex] = useState(0);

  if (!exam) notFound();

  const paper = exam.papers[paperIndex] ?? exam.papers[0];
  const isGoal = user.goalExamId === exam.id;

  const batches = BATCHES.filter((b) => b.examId === exam.id);
  const tests = TESTS.filter((x) => x.examId === exam.id);
  const videos = VIDEOS.filter((v) => v.examIds.includes(exam.id));
  const notes = NOTES.filter((n) => n.examIds.includes(exam.id));

  return (
    <div className="space-y-8 pt-4 sm:pt-6">
      {/* Header */}
      <section className="px-4 sm:px-0">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white sm:p-7"
          style={{ background: `linear-gradient(135deg, ${exam.color} 0%, var(--color-ink) 165%)` }}
        >
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" className="!border-white/25 !bg-white/15 !text-white">
                {exam.scope === 'national'
                  ? lang === 'hi'
                    ? 'राष्ट्रीय'
                    : 'National'
                  : t(exam.state ?? { en: 'State', hi: 'राज्य' }, lang)}
              </Badge>
              <Badge tone="neutral" className="!border-white/25 !bg-white/15 !text-white">
                {formatCount(exam.learners)} {lang === 'hi' ? 'शिक्षार्थी' : 'learners'}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl leading-tight font-extrabold sm:text-3xl">
              {t(exam.name, lang)}
            </h1>
            <p className="mt-1.5 text-[13px] text-white/80">{t(exam.authority, lang)}</p>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-white/90">
              {t(exam.about, lang)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGoal(exam.id, paper?.id)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold ${
                  isGoal ? 'bg-white/20 text-white' : 'bg-white text-[var(--color-ink)]'
                }`}
              >
                {isGoal
                  ? lang === 'hi'
                    ? '✓ आपका लक्ष्य'
                    : '✓ Your goal'
                  : lang === 'hi'
                    ? 'इसे अपना लक्ष्य बनाएँ'
                    : 'Set as my goal'}
              </button>
            </div>
          </div>
          <span className="pointer-events-none absolute -right-6 -bottom-8 text-[150px] leading-none opacity-15 select-none">
            {exam.emoji}
          </span>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 sm:px-0">
        <div className="grid gap-2 sm:grid-cols-3">
          {exam.highlights.map((h) => (
            <div key={h.en} className="card flex items-center gap-2 px-3 py-3">
              <span className="text-[var(--color-brand)]">✔</span>
              <span className="text-[13px] font-semibold">{t(h, lang)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Exam pattern */}
      <section className="px-4 sm:px-0">
        <SectionHeader
          title={lang === 'hi' ? 'परीक्षा पैटर्न' : 'Exam pattern'}
          subtitle={t(exam.frequency, lang)}
        />
        <div className="rail mb-3 flex gap-2">
          {exam.papers.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaperIndex(i)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                i === paperIndex
                  ? 'border-transparent bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
              }`}
            >
              {t(p.name, lang)}
            </button>
          ))}
        </div>

        {paper ? (
          <div className="card overflow-hidden">
            <div className="grid grid-cols-2 gap-px bg-[var(--color-line)] sm:grid-cols-4">
              {[
                { label: lang === 'hi' ? 'कुल प्रश्न' : 'Questions', value: String(paper.totalQuestions) },
                { label: lang === 'hi' ? 'अवधि' : 'Duration', value: `${paper.durationMinutes} min` },
                {
                  label: lang === 'hi' ? 'ऋणात्मक अंकन' : 'Negative marking',
                  value: paper.negativeMarking ? `−${paper.negativeMarking}` : lang === 'hi' ? 'नहीं' : 'None',
                },
                {
                  label: lang === 'hi' ? 'कट-ऑफ (सा./आ.)' : 'Cut-off (Gen/Res)',
                  value: `${paper.cutoffGeneral}% / ${paper.cutoffReserved}%`,
                },
              ].map((cell) => (
                <div key={cell.label} className="bg-[var(--color-surface)] px-3 py-3 text-center">
                  <div className="text-[15px] font-extrabold">{cell.value}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">{cell.label}</div>
                </div>
              ))}
            </div>

            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-t border-[var(--color-line)] bg-[var(--color-surface-alt)] text-[11px] tracking-wide text-[var(--color-muted)] uppercase">
                  <th className="px-4 py-2 font-semibold">{lang === 'hi' ? 'खंड' : 'Section'}</th>
                  <th className="px-4 py-2 text-right font-semibold">
                    {lang === 'hi' ? 'प्रश्न' : 'Questions'}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    {lang === 'hi' ? 'अंक' : 'Marks'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paper.sections.map((s) => {
                  const subject = getSubject(s.subjectId);
                  return (
                    <tr key={s.subjectId} className="border-t border-[var(--color-line)]">
                      <td className="px-4 py-2.5 font-semibold">
                        <span className="mr-2">{subject?.icon}</span>
                        {subject ? t(subject.name, lang) : s.subjectId}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{s.questions}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{s.marks}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {/* Eligibility */}
      <section className="px-4 sm:px-0">
        <SectionHeader title={lang === 'hi' ? 'पात्रता' : 'Eligibility'} />
        <ul className="card divide-y divide-[var(--color-line)]">
          {exam.eligibility.map((e) => (
            <li key={e.en} className="flex gap-2 px-4 py-3 text-[13px]">
              <span className="text-[var(--color-brand)]">•</span>
              <span>{t(e, lang)}</span>
            </li>
          ))}
        </ul>
      </section>

      {batches.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'बैच' : 'Batches'} href="/batches" />
          <Rail>
            {batches.map((b) => (
              <BatchCard key={b.id} batch={b} />
            ))}
          </Rail>
        </section>
      ) : null}

      {tests.length ? (
        <section>
          <SectionHeader title={t(UI.tests, lang)} href="/tests" />
          <Rail>
            {tests.map((x) => (
              <TestCard key={x.id} test={x} />
            ))}
          </Rail>
        </section>
      ) : null}

      {videos.length ? (
        <section>
          <SectionHeader title={t(UI.videos, lang)} href="/videos" />
          <Rail>
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </Rail>
        </section>
      ) : null}

      {notes.length ? (
        <section>
          <SectionHeader title={t(UI.notes, lang)} href="/notes" />
          <Rail>
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </Rail>
        </section>
      ) : null}
    </div>
  );
}
