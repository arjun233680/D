'use client';

import Link from 'next/link';
import {
  BATCHES,
  CURRENT_AFFAIRS,
  EDUCATORS,
  EXAMS,
  FEATURED_EXAM_IDS,
  NOTES,
  TESTS,
  VIDEOS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  liveVideos,
  t,
  timeAgo,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { BatchCard, ExamCard, NoteCard, SubjectPill, TestCard, VideoCard } from '@/components/cards';
import { Badge, Rail, SectionHeader } from '@/components/ui';

const QUICK_ACTIONS = [
  { href: '/tests', icon: '🎯', label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' }, color: '#4F46E5' },
  { href: '/practice', icon: '✍️', label: { en: 'MCQ Practice', hi: 'MCQ अभ्यास' }, color: '#0F9D58' },
  { href: '/notes', icon: '📚', label: { en: 'Notes & PDFs', hi: 'नोट्स एवं PDF' }, color: '#F97316' },
  { href: '/videos', icon: '🎥', label: { en: 'Video Lessons', hi: 'वीडियो कक्षाएँ' }, color: '#DB2777' },
  { href: '/practice/pyq', icon: '📜', label: { en: 'Previous Year', hi: 'विगत वर्ष' }, color: '#0891B2' },
  { href: '/doubts', icon: '💬', label: { en: 'Doubts', hi: 'शंका समाधान' }, color: '#7C3AED' },
  { href: '/current-affairs', icon: '📰', label: { en: 'Current Affairs', hi: 'समसामयिकी' }, color: '#DC2626' },
  { href: '/studio', icon: '⬆️', label: { en: 'Upload', hi: 'अपलोड' }, color: '#0D9488' },
];

export default function HomePage() {
  const { lang, user } = useStore();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const streak = currentStreak(user.activeDates);

  const goalBatches = BATCHES.filter((b) => b.examId === user.goalExamId);
  const otherBatches = BATCHES.filter((b) => b.examId !== user.goalExamId);
  const goalTests = TESTS.filter((t2) => t2.examId === user.goalExamId);
  const goalVideos = VIDEOS.filter((v) => v.examIds.includes(user.goalExamId));
  const goalNotes = NOTES.filter((n) => n.examIds.includes(user.goalExamId));
  const live = liveVideos();
  const enrolledBatch = BATCHES.find((b) => user.enrolledBatchIds.includes(b.id));
  const subjectIds = paper ? paper.sections.map((s) => s.subjectId) : ['cdp', 'math', 'evs'];

  return (
    <div className="space-y-8 pt-4 sm:pt-6">
      {/* Hero */}
      <section className="px-4 sm:px-0">
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-5 text-white sm:px-7 sm:py-7"
          style={{
            background: `linear-gradient(135deg, var(--color-ink) 0%, ${exam?.color ?? '#4F46E5'} 190%)`,
          }}
        >
          <div className="relative z-10">
            <p className="text-[13px] font-medium text-white/70">
              {lang === 'hi' ? `नमस्ते, ${user.name} 👋` : `Hello, ${user.name} 👋`}
            </p>
            <h1 className="mt-1 text-[22px] leading-tight font-extrabold sm:text-3xl">
              {t(exam?.name ?? UI.tagline, lang)}
            </h1>
            {paper ? (
              <p className="mt-1 text-[13px] text-white/80">{t(paper.name, lang)}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur">
                🔥 {streak} {t(UI.streak, lang)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur">
                🎓 {formatCount(exam?.learners ?? 0)} {lang === 'hi' ? 'शिक्षार्थी' : 'learners'}
              </span>
              {paper ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur">
                  🎯 {lang === 'hi' ? 'कट-ऑफ' : 'Cut-off'} {paper.cutoffGeneral}%
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/goal/${exam?.slug ?? 'ctet'}`}
                className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[var(--color-ink)]"
              >
                {lang === 'hi' ? 'पूरा सिलेबस देखें' : 'View full syllabus'}
              </Link>
              <Link
                href="/tests"
                className="rounded-full border border-white/40 px-4 py-2 text-[13px] font-bold text-white"
              >
                {lang === 'hi' ? 'निःशुल्क मॉक दें' : 'Take a free mock'}
              </Link>
            </div>
          </div>
          <span className="pointer-events-none absolute -right-4 -bottom-6 text-[130px] leading-none opacity-15 select-none">
            {exam?.emoji}
          </span>
        </div>
      </section>

      {/* Quick actions */}
      <section className="px-4 sm:px-0">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card flex flex-col items-center gap-1.5 px-1 py-3 transition-shadow hover:shadow-md"
            >
              <span
                className="grid h-10 w-10 place-items-center rounded-xl text-lg"
                style={{ background: `${a.color}1a` }}
              >
                {a.icon}
              </span>
              <span className="text-center text-[10px] leading-tight font-semibold sm:text-[11px]">
                {t(a.label, lang)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Continue where you left */}
      {enrolledBatch ? (
        <section>
          <SectionHeader
            title={lang === 'hi' ? 'जहाँ छोड़ा था वहीं से' : 'Continue learning'}
            subtitle={t(enrolledBatch.title, lang)}
            href={`/batches/${enrolledBatch.id}`}
            action={lang === 'hi' ? 'बैच खोलें' : 'Open batch'}
          />
          <Rail>
            {enrolledBatch.syllabus.flatMap((m) =>
              m.videoIds.map((id) => VIDEOS.find((v) => v.id === id)).filter(Boolean),
            ).slice(0, 6).map((v) => (
              <VideoCard key={v!.id} video={v!} />
            ))}
          </Rail>
        </section>
      ) : null}

      {/* Live now */}
      {live.length ? (
        <section>
          <SectionHeader
            title={lang === 'hi' ? 'अभी लाइव' : 'Live right now'}
            subtitle={lang === 'hi' ? 'निःशुल्क लाइव कक्षा में शामिल हों' : 'Join a free live class'}
            href="/videos"
          />
          <Rail>
            {live.map((v) => (
              <VideoCard key={v.id} video={v} width="w-[300px]" />
            ))}
          </Rail>
        </section>
      ) : null}

      {/* Batches for the goal */}
      <section>
        <SectionHeader
          title={
            lang === 'hi'
              ? `${exam?.shortName} के लिए बैच`
              : `Batches for ${exam?.shortName}`
          }
          subtitle={lang === 'hi' ? 'लाइव कक्षाएँ, नोट्स एवं टेस्ट सहित' : 'Live classes with notes and tests'}
          href="/batches"
        />
        <Rail>
          {(goalBatches.length ? goalBatches : otherBatches).map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </Rail>
      </section>

      {/* Subjects */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'विषयवार अभ्यास' : 'Practice by subject'}
          subtitle={
            paper
              ? `${t(paper.name, lang)} — ${paper.sections.length} ${lang === 'hi' ? 'खंड' : 'sections'}`
              : undefined
          }
          href="/practice"
        />
        <Rail>
          {subjectIds.map((id) => (
            <SubjectPill key={id} subjectId={id} />
          ))}
        </Rail>
      </section>

      {/* Test series */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'टेस्ट सीरीज़' : 'Test series'}
          subtitle={lang === 'hi' ? 'वास्तविक परीक्षा जैसा इंटरफ़ेस, रैंक एवं विश्लेषण सहित' : 'Real exam interface with rank and analysis'}
          href="/tests"
        />
        <Rail>
          {(goalTests.length ? goalTests : TESTS).map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </Rail>
      </section>

      {/* Free classes */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'निःशुल्क वीडियो कक्षाएँ' : 'Free video lessons'}
          href="/videos"
        />
        <Rail>
          {(goalVideos.length ? goalVideos : VIDEOS).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </Rail>
      </section>

      {/* Notes */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'नोट्स एवं PDF' : 'Notes & PDFs'}
          subtitle={lang === 'hi' ? 'ऐप में पढ़ें या डाउनलोड करें' : 'Read in-app or download'}
          href="/notes"
        />
        <Rail>
          {(goalNotes.length ? goalNotes : NOTES).map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </Rail>
      </section>

      {/* All exams */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'सभी शिक्षक भर्ती परीक्षाएँ' : 'All teaching exams'}
          subtitle={`${EXAMS.length} ${lang === 'hi' ? 'परीक्षाएँ कवर' : 'exams covered'}`}
          href="/explore"
        />
        <Rail>
          {EXAMS.slice()
            .sort(
              (a, b) =>
                FEATURED_EXAM_IDS.indexOf(a.id) - FEATURED_EXAM_IDS.indexOf(b.id) ||
                b.learners - a.learners,
            )
            .map((e) => (
              <ExamCard key={e.id} exam={e} />
            ))}
        </Rail>
      </section>

      {/* Educators */}
      <section>
        <SectionHeader
          title={lang === 'hi' ? 'हमारे शिक्षक' : 'Top educators'}
          subtitle={lang === 'hi' ? 'औसतन 10 वर्ष का शिक्षण अनुभव' : 'Averaging 10 years of teaching'}
        />
        <Rail>
          {EDUCATORS.map((e) => (
            <div key={e.id} className="card w-[210px] shrink-0 p-4 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-surface-alt)] text-2xl">
                {e.avatar}
              </span>
              <p className="mt-2 text-[14px] font-bold">{e.name}</p>
              <p className="mt-0.5 line-clamp-2 min-h-[32px] text-[11px] text-[var(--color-muted)]">
                {t(e.headline, lang)}
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold">
                <span className="text-[var(--color-warning)]">★ {e.rating}</span>
                <span className="text-[var(--color-muted)]">{formatCount(e.learners)}</span>
              </div>
            </div>
          ))}
        </Rail>
      </section>

      {/* Current affairs */}
      <section className="px-4 sm:px-0">
        <SectionHeader
          title={lang === 'hi' ? 'शिक्षा समसामयिकी' : 'Education current affairs'}
          href="/current-affairs"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {CURRENT_AFFAIRS.slice(0, 4).map((ca) => (
            <article key={ca.id} className="card p-4">
              <div className="flex flex-wrap gap-1.5">
                {ca.tags.map((tag) => (
                  <Badge key={tag.en} tone="info">
                    {t(tag, lang)}
                  </Badge>
                ))}
                <span className="text-[11px] text-[var(--color-faint)]">
                  {timeAgo(ca.date, lang)}
                </span>
              </div>
              <h3 className="mt-2 text-[14px] leading-snug font-bold">{t(ca.title, lang)}</h3>
              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-[var(--color-muted)]">
                {t(ca.summary, lang)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* SEO / value footer — the website half of the product */}
      <footer className="mt-4 border-t border-[var(--color-line)] px-4 pt-8 pb-4 sm:px-0">
        <h2 className="text-[15px] font-bold">
          {lang === 'hi'
            ? 'अध्यापक — शिक्षक भर्ती परीक्षाओं की संपूर्ण तैयारी'
            : 'Adhyapak — complete preparation for teaching exams'}
        </h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'CTET, HTET, UPTET, बिहार TET, DSSSB, KVS, NVS, REET, HSSC TGT/PGT/PRT, सुपर TET, MPTET सहित सभी शिक्षक भर्ती परीक्षाओं हेतु लाइव कक्षाएँ, नोट्स, वीडियो, MCQ अभ्यास तथा पूर्ण मॉक टेस्ट — हिंदी एवं अंग्रेज़ी दोनों में।'
            : 'Live classes, notes, video lessons, MCQ practice and full-length mock tests for CTET, HTET, UPTET, Bihar TET, DSSSB, KVS, NVS, REET, HSSC TGT/PGT/PRT, Super TET, MPTET and every other teaching exam — in both Hindi and English.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMS.map((e) => (
            <Link
              key={e.id}
              href={`/goal/${e.slug}`}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-[12px] font-medium text-[var(--color-muted)] hover:border-[var(--color-line-strong)]"
            >
              {e.shortName}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
