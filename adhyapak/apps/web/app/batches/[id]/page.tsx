'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  NOTES,
  VIDEOS,
  buildPracticeSet,
  formatCount,
  formatDate,
  getBatch,
  getEducator,
  getExam,
  getSubject,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { NoteCard, VideoCard } from '@/components/cards';
import { AccessBadge, Badge, Rail } from '@/components/ui';

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, user, toggleEnrolment } = useStore();
  const [openModule, setOpenModule] = useState<string | null>(null);

  const batch = getBatch(id);
  if (!batch) notFound();

  const exam = getExam(batch.examId);
  const enrolled = user.enrolledBatchIds.includes(batch.id);
  const educators = batch.educatorIds.map(getEducator).filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <div className="space-y-6 pt-4 pb-8 sm:pt-6">
      <div className="px-4 sm:px-0">
        <Link href="/batches" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← {t(UI.batches, lang)}
        </Link>
      </div>

      <header className="px-4 sm:px-0">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-white sm:p-7"
          style={{ background: `linear-gradient(135deg, ${batch.color} 0%, var(--color-ink) 170%)` }}
        >
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <AccessBadge access={batch.access} lang={lang} />
              <Badge tone="neutral" className="!border-white/25 !bg-white/15 !text-white">
                {exam?.emoji} {exam?.shortName}
              </Badge>
              <Badge tone="neutral" className="!border-white/25 !bg-white/15 !text-white">
                {batch.language === 'hi' ? 'हिंदी' : 'English'}
              </Badge>
            </div>
            <h1 className="mt-3 text-2xl leading-tight font-extrabold">{t(batch.title, lang)}</h1>
            <p className="mt-2 text-[13px] text-white/85">{t(batch.schedule, lang)}</p>
            <p className="mt-1 text-[12px] text-white/70">
              {formatDate(batch.startsAt, lang)} → {formatDate(batch.endsAt, lang)} ·{' '}
              {formatCount(batch.enrolled)} {lang === 'hi' ? 'नामांकित' : 'enrolled'}
            </p>

            <button
              type="button"
              onClick={() => toggleEnrolment(batch.id)}
              className={`mt-4 rounded-full px-5 py-2.5 text-[13px] font-bold ${
                enrolled ? 'bg-white/20 text-white' : 'bg-white text-[var(--color-ink)]'
              }`}
            >
              {enrolled ? `✓ ${t(UI.enrolled, lang)}` : t(UI.enroll, lang)}
            </button>
          </div>
          <span className="pointer-events-none absolute -right-5 -bottom-7 text-[140px] leading-none opacity-15 select-none">
            {exam?.emoji}
          </span>
        </div>
      </header>

      <section className="px-4 sm:px-0">
        <div className="grid gap-2 sm:grid-cols-2">
          {batch.includes.map((inc) => (
            <div key={inc.en} className="card flex items-center gap-2 px-3 py-2.5">
              <span className="text-[var(--color-brand)]">✔</span>
              <span className="text-[13px] font-semibold">{t(inc, lang)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-0">
        <h2 className="mb-2 text-[15px] font-bold">{lang === 'hi' ? 'शिक्षक' : 'Educators'}</h2>
        <div className="rail flex gap-2">
          {educators.map((e) => (
            <div key={e.id} className="card flex w-[220px] shrink-0 items-center gap-3 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-surface-alt)] text-lg">
                {e.avatar}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">{e.name}</p>
                <p className="truncate text-[11px] text-[var(--color-muted)]">
                  ★ {e.rating} · {e.experienceYears} {lang === 'hi' ? 'वर्ष' : 'yrs'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-0">
        <h2 className="mb-2 text-[15px] font-bold">
          {lang === 'hi' ? 'सिलेबस' : 'Syllabus'} ({batch.syllabus.length}{' '}
          {lang === 'hi' ? 'मॉड्यूल' : 'modules'})
        </h2>
        <div className="space-y-2">
          {batch.syllabus.map((mod) => {
            const subject = getSubject(mod.subjectId);
            const open = openModule === mod.id;
            const videos = mod.videoIds
              .map((vid) => VIDEOS.find((v) => v.id === vid))
              .filter((v): v is NonNullable<typeof v> => Boolean(v));
            const notes = mod.noteIds
              .map((nid) => NOTES.find((n) => n.id === nid))
              .filter((n): n is NonNullable<typeof n> => Boolean(n));
            const questions = buildPracticeSet({ ids: mod.questionIds });

            return (
              <div key={mod.id} className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenModule(open ? null : mod.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ background: `${subject?.color ?? '#4F46E5'}1a` }}
                  >
                    {subject?.icon ?? '📘'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold">{t(mod.title, lang)}</span>
                    <span className="block text-[11px] text-[var(--color-muted)]">
                      {videos.length} {lang === 'hi' ? 'वीडियो' : 'videos'} · {notes.length}{' '}
                      {lang === 'hi' ? 'नोट्स' : 'notes'} · {questions.length}{' '}
                      {lang === 'hi' ? 'प्रश्न' : 'questions'}
                    </span>
                  </span>
                  <span className="text-[var(--color-faint)]">{open ? '▲' : '▼'}</span>
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-[var(--color-line)] p-4">
                    {videos.length ? (
                      <Rail>
                        {videos.map((v) => (
                          <VideoCard key={v.id} video={v} width="w-[220px]" />
                        ))}
                      </Rail>
                    ) : null}
                    {notes.length ? (
                      <Rail>
                        {notes.map((n) => (
                          <NoteCard key={n.id} note={n} width="w-[220px]" />
                        ))}
                      </Rail>
                    ) : null}
                    {questions.length ? (
                      <Link
                        href={`/practice/subject/${mod.subjectId}`}
                        className="block rounded-xl bg-[var(--color-brand)] px-4 py-2.5 text-center text-[13px] font-bold text-white"
                      >
                        {lang === 'hi'
                          ? `इस मॉड्यूल का अभ्यास करें (${questions.length})`
                          : `Practise this module (${questions.length})`}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
