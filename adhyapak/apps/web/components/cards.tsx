'use client';

import Link from 'next/link';
import {
  buildNoteDocument,
  formatCount,
  formatDuration,
  getEducator,
  getExam,
  getSubject,
  t,
  testQuestionCount,
  UI,
  type Batch,
  type Exam,
  type Note,
  type Test,
  type Video,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, LiveBadge, Thumb } from './ui';

export function ExamCard({ exam, compact = false }: { exam: Exam; compact?: boolean }) {
  const { lang } = useStore();
  return (
    <Link
      href={`/goal/${exam.slug}`}
      className={`card group block shrink-0 overflow-hidden transition-shadow hover:shadow-md ${
        compact ? 'w-[168px]' : 'w-[230px]'
      }`}
    >
      <div
        className="flex h-20 items-center gap-2 px-4"
        style={{ background: `linear-gradient(120deg, ${exam.color} 0%, ${exam.color}bb 100%)` }}
      >
        <span className="text-3xl">{exam.emoji}</span>
        <span className="text-lg font-extrabold text-white">{exam.shortName}</span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[36px] text-[13px] leading-snug font-semibold">
          {t(exam.name, lang)}
        </p>
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {formatCount(exam.learners)} {lang === 'hi' ? 'शिक्षार्थी' : 'learners'} ·{' '}
          {exam.papers.length} {lang === 'hi' ? 'पेपर' : 'papers'}
        </p>
      </div>
    </Link>
  );
}

export function BatchCard({ batch }: { batch: Batch }) {
  const { lang, user } = useStore();
  const exam = getExam(batch.examId);
  const enrolled = user.enrolledBatchIds.includes(batch.id);
  const educators = batch.educatorIds.map(getEducator).filter(Boolean);

  return (
    <Link
      href={`/batches/${batch.id}`}
      className="card block w-[280px] shrink-0 overflow-hidden transition-shadow hover:shadow-md sm:w-[320px]"
    >
      <Thumb color={batch.color} emoji={exam?.emoji ?? '📘'}>
        <div className="absolute top-3 left-3 flex gap-2">
          <AccessBadge access={batch.access} lang={lang} />
          {enrolled ? <Badge tone="success">{t(UI.enrolled, lang)}</Badge> : null}
        </div>
        <div className="absolute bottom-3 left-3 max-w-[80%]">
          <p className="text-[15px] leading-snug font-extrabold text-white drop-shadow">
            {t(batch.title, lang)}
          </p>
        </div>
      </Thumb>
      <div className="p-3">
        <p className="text-[12px] font-semibold text-[var(--color-muted)]">
          {t(batch.schedule, lang)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex -space-x-2">
            {educators.slice(0, 4).map((e) => (
              <span
                key={e!.id}
                className="grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[var(--color-surface-alt)] text-[11px]"
              >
                {e!.avatar}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-[var(--color-muted)]">
            {educators.length} {lang === 'hi' ? 'शिक्षक' : 'educators'} ·{' '}
            {formatCount(batch.enrolled)} {lang === 'hi' ? 'नामांकित' : 'enrolled'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function VideoCard({ video, width = 'w-[250px]' }: { video: Video; width?: string }) {
  const { lang } = useStore();
  const educator = getEducator(video.educatorId);
  const subject = getSubject(video.subjectId);

  return (
    <Link
      href={`/videos/${video.id}`}
      className={`card block ${width} shrink-0 overflow-hidden transition-shadow hover:shadow-md`}
    >
      <Thumb color={video.thumbnail} emoji={subject?.icon ?? '🎬'}>
        <div className="absolute top-2 left-2 flex gap-1.5">
          {video.isLive ? <LiveBadge label={t(UI.live, lang)} /> : null}
          <AccessBadge access={video.access} lang={lang} />
        </div>
        <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
          {formatDuration(video.durationSeconds)}
        </span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-[15px] text-[var(--color-ink)] shadow-lg">
            ▶
          </span>
        </span>
      </Thumb>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[36px] text-[13px] leading-snug font-bold">
          {t(video.title, lang)}
        </p>
        <p className="mt-1.5 truncate text-[11px] text-[var(--color-muted)]">
          {educator?.avatar} {educator?.name} · {formatCount(video.views)}{' '}
          {lang === 'hi' ? 'बार देखा' : 'views'}
        </p>
      </div>
    </Link>
  );
}

export function NoteCard({ note, width = 'w-[240px]' }: { note: Note; width?: string }) {
  const { lang } = useStore();
  const subject = getSubject(note.subjectId);
  // The card promises the same page count the PDF actually opens with.
  const pages = buildNoteDocument(note, lang).totalPages;
  return (
    <Link
      href={`/notes/${note.id}`}
      className={`card block ${width} shrink-0 p-3 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
          style={{ background: `${subject?.color ?? '#4F46E5'}1a` }}
        >
          {subject?.icon ?? '📄'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-snug font-bold">{t(note.title, lang)}</p>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">
            {pages} {lang === 'hi' ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}{' '}
            {lang === 'hi' ? 'डाउनलोड' : 'downloads'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <AccessBadge access={note.access} lang={lang} />
        {/* Says up front what opens on click. */}
        <Badge tone="danger">PDF</Badge>
        {note.tags.slice(0, 1).map((tag) => (
          <Badge key={tag.en} tone="info">
            {t(tag, lang)}
          </Badge>
        ))}
      </div>
    </Link>
  );
}

export function TestCard({ test, width = 'w-[260px]' }: { test: Test; width?: string }) {
  const { lang, results } = useStore();
  const exam = getExam(test.examId);
  const result = results[test.id];
  const count = testQuestionCount(test);

  const typeLabel: Record<Test['type'], { en: string; hi: string }> = {
    mock: { en: 'Full Mock', hi: 'पूर्ण मॉक' },
    pyq: { en: 'Previous Year', hi: 'विगत वर्ष' },
    sectional: { en: 'Sectional', hi: 'सेक्शनल' },
    'daily-quiz': { en: 'Daily Quiz', hi: 'दैनिक क्विज़' },
  };

  return (
    <Link
      href={`/tests/${test.id}`}
      className={`card block ${width} shrink-0 p-4 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center gap-2">
        <Badge tone="accent">{t(typeLabel[test.type], lang)}</Badge>
        <AccessBadge access={test.access} lang={lang} />
      </div>
      <p className="mt-2 line-clamp-2 min-h-[38px] text-[14px] leading-snug font-bold">
        {t(test.title, lang)}
      </p>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
        <span>
          {count} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
        </span>
        <span>·</span>
        <span>{test.durationMinutes} min</span>
        <span>·</span>
        <span>{exam?.shortName}</span>
      </div>
      {result ? (
        <div className="mt-3 rounded-lg bg-[var(--color-surface-alt)] px-3 py-2 text-[12px] font-semibold">
          <span className="text-[var(--color-muted)]">{t(UI.score, lang)}: </span>
          <span className={result.qualified ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
            {result.score}/{result.maxScore}
          </span>
          <span className="ml-2 text-[var(--color-muted)]">
            {t(UI.rank, lang)} #{formatCount(result.rank)}
          </span>
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-[var(--color-faint)]">
          {formatCount(test.attempts)} {lang === 'hi' ? 'बार दिया गया' : 'attempts'}
        </div>
      )}
    </Link>
  );
}

export function SubjectPill({ subjectId }: { subjectId: string }) {
  const { lang } = useStore();
  const subject = getSubject(subjectId);
  if (!subject) return null;
  return (
    <Link
      href={`/practice/subject/${subject.id}`}
      className="card flex w-[130px] shrink-0 flex-col items-center gap-2 px-3 py-4 text-center transition-shadow hover:shadow-md"
    >
      <span
        className="grid h-11 w-11 place-items-center rounded-full text-xl"
        style={{ background: `${subject.color}1a` }}
      >
        {subject.icon}
      </span>
      <span className="line-clamp-2 text-[12px] leading-tight font-bold">
        {t(subject.name, lang)}
      </span>
    </Link>
  );
}
