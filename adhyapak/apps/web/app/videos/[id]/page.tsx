'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  NOTES,
  VIDEOS,
  formatCount,
  formatDate,
  formatDuration,
  getEducator,
  getSubject,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { NoteCard, VideoCard } from '@/components/cards';
import { AccessBadge, Badge, LiveBadge, Rail, SectionHeader } from '@/components/ui';

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, uploadedVideos } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  const video = [...uploadedVideos, ...VIDEOS].find((v) => v.id === id);
  if (!video) notFound();

  const educator = getEducator(video.educatorId);
  const subject = getSubject(video.subjectId);
  const related = VIDEOS.filter((v) => v.id !== video.id && v.subjectId === video.subjectId);
  const resources = video.resources
    .map((r) => NOTES.find((n) => n.id === r.id))
    .filter((n): n is NonNullable<typeof n> => Boolean(n));

  const seek = (seconds: number, index: number) => {
    setActiveChapter(index);
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      void videoRef.current.play();
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-8 sm:pt-6">
      <div className="px-4 sm:px-0">
        <Link href="/videos" className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← {t(UI.videos, lang)}
        </Link>
      </div>

      <div className="bg-black sm:rounded-2xl sm:overflow-hidden">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          ref={videoRef}
          src={video.src}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
        />
      </div>

      <div className="space-y-5 px-4 sm:px-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {video.isLive ? <LiveBadge label={t(UI.live, lang)} /> : null}
            <AccessBadge access={video.access} lang={lang} />
            {subject ? (
              <Badge tone="neutral">
                {subject.icon} {t(subject.name, lang)}
              </Badge>
            ) : null}
            <Badge tone="neutral">{video.language === 'hi' ? 'हिंदी' : 'English'}</Badge>
          </div>
          <h1 className="mt-2 text-xl leading-snug font-extrabold sm:text-2xl">
            {t(video.title, lang)}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            {formatCount(video.views)} {lang === 'hi' ? 'बार देखा गया' : 'views'} ·{' '}
            {formatDate(video.publishedAt, lang)} · {formatDuration(video.durationSeconds)}
          </p>
        </div>

        {educator ? (
          <div className="card flex items-center gap-3 p-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-surface-alt)] text-xl">
              {educator.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{educator.name}</p>
              <p className="truncate text-[11px] text-[var(--color-muted)]">
                {t(educator.headline, lang)}
              </p>
            </div>
            <span className="text-[12px] font-bold text-[var(--color-warning)]">
              ★ {educator.rating}
            </span>
          </div>
        ) : null}

        <p className="text-[13px] leading-relaxed text-[var(--color-muted)]">
          {t(video.description, lang)}
        </p>

        {video.chapters.length ? (
          <section className="card p-4">
            <h2 className="text-[15px] font-bold">
              {lang === 'hi' ? 'चैप्टर' : 'Chapters'} ({video.chapters.length})
            </h2>
            <ul className="mt-2 divide-y divide-[var(--color-line)]">
              {video.chapters.map((c, i) => (
                <li key={c.at}>
                  <button
                    type="button"
                    onClick={() => seek(c.at, i)}
                    className={`flex w-full items-center gap-3 py-2.5 text-left ${
                      i === activeChapter ? 'text-[var(--color-brand)]' : ''
                    }`}
                  >
                    <span className="rounded bg-[var(--color-surface-alt)] px-2 py-0.5 text-[11px] font-bold tabular-nums">
                      {formatDuration(c.at)}
                    </span>
                    <span className="flex-1 text-[13px] font-semibold">{t(c.title, lang)}</span>
                    <span className="text-[12px]">▶</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {resources.length ? (
          <section>
            <SectionHeader title={lang === 'hi' ? 'इस कक्षा के नोट्स' : 'Notes for this class'} />
            <Rail>
              {resources.map((n) => (
                <NoteCard key={n.id} note={n} />
              ))}
            </Rail>
          </section>
        ) : null}
      </div>

      {related.length ? (
        <section>
          <SectionHeader title={lang === 'hi' ? 'इसी विषय से' : 'More from this subject'} />
          <Rail>
            {related.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </Rail>
        </section>
      ) : null}
    </div>
  );
}
