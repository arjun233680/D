'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SUBJECTS, listVideos, t, UI } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { VideoCard } from '@/components/cards';
import { EmptyState, SectionHeader } from '@/components/ui';

export default function VideosPage() {
  const { lang, user, uploadedVideos } = useStore();
  // Scoped to the learner's exam, like every other listing.
  const videos = useAsync(() => listVideos({ examId: user.goalExamId }), [user.goalExamId]);
  const [subjectId, setSubjectId] = useState('all');

  const all = [...uploadedVideos, ...(videos.data ?? [])];
  const filtered = subjectId === 'all' ? all : all.filter((v) => v.subjectId === subjectId);
  const live = filtered.filter((v) => v.isLive);
  const recorded = filtered.filter((v) => !v.isLive);

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t(UI.videos, lang)}</h1>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            {lang === 'hi'
              ? 'लाइव कक्षाएँ, रिकॉर्डिंग एवं चैप्टरवार वीडियो'
              : 'Live classes, recordings and chapter-wise lessons'}
          </p>
        </div>
        <Link
          href="/studio"
          className="shrink-0 rounded-full bg-[var(--color-ink)] px-3.5 py-2 text-[12px] font-bold text-white"
        >
          ⬆ {t(UI.upload, lang)}
        </Link>
      </div>

      <div className="rail flex gap-2">
        <button
          type="button"
          onClick={() => setSubjectId('all')}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            subjectId === 'all'
              ? 'border-transparent bg-[var(--color-ink)] text-white'
              : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
          }`}
        >
          {lang === 'hi' ? 'सभी' : 'All'}
        </button>
        {SUBJECTS.filter((s) => all.some((v) => v.subjectId === s.id)).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubjectId(s.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
              subjectId === s.id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {s.icon} {t(s.name, lang)}
          </button>
        ))}
      </div>

      {live.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'अभी लाइव' : 'Live now'} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((v) => (
              <VideoCard key={v.id} video={v} width="w-full" />
            ))}
          </div>
        </section>
      ) : null}

      {recorded.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'रिकॉर्डेड कक्षाएँ' : 'Recorded lessons'} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recorded.map((v) => (
              <VideoCard key={v.id} video={v} width="w-full" />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon="🎥"
          title={lang === 'hi' ? 'इस विषय में वीडियो नहीं' : 'No videos in this subject'}
          body={
            lang === 'hi'
              ? 'दूसरा विषय चुनें या स्टूडियो से अपना वीडियो अपलोड करें।'
              : 'Pick another subject, or upload your own from the Studio.'
          }
        />
      )}
    </div>
  );
}
