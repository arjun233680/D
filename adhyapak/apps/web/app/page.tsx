'use client';

import Link from 'next/link';
import {
  BATCHES,
  TESTS,
  currentStreak,
  getExam,
  getPaper,
  getSubject,
  getTopic,
  liveVideos,
  recommendedTopics,
  subjectsForPaperOrEmpty,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';

/**
 * Dashboard.
 *
 * Answers one question: what should I do right now. Batches, tests, notes,
 * videos and current affairs each own a page of their own, so the dashboard
 * links to them rather than repeating their contents — what it shows instead is
 * what no browse page can: the countdown, the streak, the next thing to
 * practise, and what changed in this exam's cycle.
 */

/** Icon shortcuts. No rails: a rail here would be a second copy of a page. */
const LIBRARY = [
  { href: '/notes', icon: '📚', label: { en: 'Notes', hi: 'नोट्स' }, color: '#F97316' },
  { href: '/videos', icon: '🎥', label: { en: 'Videos', hi: 'वीडियो' }, color: '#DB2777' },
  { href: '/practice/pyq', icon: '📜', label: { en: 'Previous year', hi: 'विगत वर्ष' }, color: '#0891B2' },
  { href: '/doubts', icon: '💬', label: { en: 'Doubts', hi: 'शंका' }, color: '#7C3AED' },
  { href: '/current-affairs', icon: '📰', label: { en: 'Affairs', hi: 'समसामयिकी' }, color: '#DC2626' },
  { href: '/studio', icon: '⬆️', label: { en: 'Upload', hi: 'अपलोड' }, color: '#0D9488' },
];

const daysUntil = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : null;
};

export default function HomePage() {
  const { lang, user, results } = useStore();
  const hi = lang === 'hi';

  const exam = getExam(user.goalExamId);
  const examName = exam ? t(exam.name, lang) : '';
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const accent = exam?.color ?? '#4F46E5';
  const streak = currentStreak(user.activeDates);
  const attempts = Object.values(results);
  const countdown = daysUntil(exam?.nextExamDate);
  const avgAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, x) => sum + x.accuracy, 0) / attempts.length)
    : 0;

  // What to do next, in priority order.
  const dailyQuiz = TESTS.find((x) => x.type === 'daily-quiz');
  const nextMock = TESTS.find(
    (x) => x.examId === user.goalExamId && x.type === 'mock' && !results[x.id],
  );
  const weakTopicId = attempts.flatMap((x) => x.weakTopics)[0]?.topicId;
  // Empty when the paper has an unresolved elective: the home feed then
  // recommends nothing rather than recommending somebody else's subject.
  const subjectIds = subjectsForPaperOrEmpty(paper?.id, user.electiveSubjectId);
  const suggested = weakTopicId ? getTopic(weakTopicId) : recommendedTopics(subjectIds, 1)[0];
  const live = liveVideos().filter((v) => v.examIds.includes(user.goalExamId));
  // The home screen is this exam's dashboard, so an enrolment from a previous
  // goal does not belong on it. It is still on the batches page, which is where
  // your own enrolments live.
  const myBatch = BATCHES.find(
    (b) => b.examId === user.goalExamId && user.enrolledBatchIds.includes(b.id),
  );

  const upcoming = (exam?.updates ?? []).filter(
    (u) => new Date(u.date).getTime() >= Date.now() - 86_400_000,
  );
  const timeline = (upcoming.length ? upcoming : (exam?.updates ?? []).slice(-2)).slice(0, 3);

  return (
    <div className="space-y-8 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      {/* Goal + progress */}
      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Link
          href={`/goal/${exam?.slug ?? 'ctet'}`}
          className="relative overflow-hidden rounded-2xl px-5 py-6 text-white sm:px-7"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` }}
        >
          <p className="text-[13px] text-white/75">
            {hi ? `नमस्ते, ${user.name}` : `Hello, ${user.name}`}
          </p>
          <h1 className="mt-1 text-[22px] leading-tight font-extrabold sm:text-3xl">
            {t(exam?.name ?? UI.tagline, lang)}
          </h1>
          {paper ? <p className="mt-1 text-[13px] text-white/85">{t(paper.name, lang)}</p> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {countdown !== null ? (
              <span className="rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[var(--color-ink)]">
                ⏳ {countdown} {hi ? 'दिन शेष' : 'days left'}
              </span>
            ) : null}
            {paper ? (
              <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[12px] font-bold backdrop-blur">
                🎯 {hi ? 'कट-ऑफ' : 'Cut-off'} {paper.cutoffGeneral}%
              </span>
            ) : null}
            {exam?.vacancies ? (
              <span className="rounded-full bg-white/20 px-3.5 py-1.5 text-[12px] font-bold backdrop-blur">
                📋 {exam.vacancies.toLocaleString('en-IN')} {hi ? 'पद' : 'posts'}
              </span>
            ) : null}
          </div>
          <span className="pointer-events-none absolute -right-4 -bottom-6 text-[130px] leading-none opacity-15 select-none">
            {exam?.emoji}
          </span>
        </Link>

        <div className="grid grid-cols-3 gap-3">
          <Metric label={hi ? 'श्रृंखला' : 'Streak'} value={`${streak}`} unit={hi ? 'दिन' : 'days'} color={accent} />
          <Metric label={hi ? 'टेस्ट दिए' : 'Tests'} value={`${attempts.length}`} unit={hi ? 'पूर्ण' : 'done'} color="var(--color-accent)" />
          <Metric label={hi ? 'शुद्धता' : 'Accuracy'} value={`${avgAccuracy}%`} unit={hi ? 'औसत' : 'avg'} color="var(--color-success)" />
        </div>
      </section>

      {/* Today's plan, with this exam's cycle updates beside it on a wide screen */}
      <section className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3 text-[17px] font-extrabold">
            {hi ? 'आज क्या करें' : 'What to do today'}
          </h2>
          <div className="space-y-3">
            {dailyQuiz ? (
              <Action
                href={`/tests/${dailyQuiz.id}`}
                icon="⚡"
                tint="var(--color-brand-light)"
                title={hi ? 'आज की प्रश्नोत्तरी' : "Today's quiz"}
                sub={`10 ${hi ? 'प्रश्न' : 'questions'} · 10 min`}
                cta={hi ? 'शुरू करें' : 'Start'}
                accent={accent}
              />
            ) : null}

            {suggested ? (
              <Action
                href={`/practice/topic/${suggested.id}`}
                icon="🎯"
                tint="var(--color-warning-light)"
                title={
                  weakTopicId
                    ? hi ? 'कमजोर टॉपिक सुधारें' : 'Fix your weak topic'
                    : hi ? 'सर्वाधिक भार वाला टॉपिक' : 'Highest-weightage topic'
                }
                sub={`${getSubject(suggested.subjectId)?.icon ?? ''} ${t(suggested.name, lang)}`}
                cta={hi ? 'अभ्यास' : 'Practise'}
                accent={accent}
              />
            ) : null}

            {nextMock ? (
              <Action
                href={`/tests/${nextMock.id}`}
                icon="📝"
                tint="var(--color-accent-light)"
                title={hi ? 'अगला मॉक टेस्ट' : 'Next mock test'}
                sub={t(nextMock.title, lang)}
                cta={hi ? 'दें' : 'Attempt'}
                accent={accent}
              />
            ) : null}

            {live.length ? (
              <Action
                href={`/videos/${live[0]!.id}`}
                icon="🔴"
                tint="var(--color-danger-light)"
                title={hi ? 'अभी लाइव क्लास' : 'Live class now'}
                sub={t(live[0]!.title, lang)}
                cta={hi ? 'जुड़ें' : 'Join'}
                accent="var(--color-danger)"
              />
            ) : null}

            {myBatch ? (
              <Action
                href={`/batches/${myBatch.id}`}
                icon="🎓"
                tint="var(--color-info-light)"
                title={hi ? 'आपका बैच' : 'Your batch'}
                sub={t(myBatch.title, lang)}
                cta={hi ? 'खोलें' : 'Open'}
                accent={accent}
              />
            ) : null}
          </div>
        </div>

        {timeline.length ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-extrabold">
                {hi ? `${exam?.shortName} अपडेट` : `${exam?.shortName} updates`}
              </h2>
              <Link
                href={`/goal/${exam?.slug ?? 'ctet'}`}
                className="text-[13px] font-bold"
                style={{ color: accent }}
              >
                {hi ? 'सभी' : 'All'}
              </Link>
            </div>
            <div className="space-y-3">
              {timeline.map((u) => (
                <article key={`${u.date}-${u.title.en}`} className="card p-4">
                  <p className="text-[11px] font-bold" style={{ color: accent }}>
                    {new Date(u.date).toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <h3 className="mt-1 text-[14px] leading-snug font-bold">{t(u.title, lang)}</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted)]">
                    {t(u.detail, lang)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* Library — one tap each, no content repeated from the pages themselves */}
      <section>
        <h2 className="mb-3 text-[17px] font-extrabold">{hi ? 'सामग्री' : 'Library'}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {LIBRARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex flex-col items-center gap-2 px-1 py-4 transition-shadow hover:shadow-md"
            >
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
                style={{ background: `${item.color}1a` }}
              >
                {item.icon}
              </span>
              <span className="text-center text-[12px] leading-tight font-semibold">
                {t(item.label, lang)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* SEO / value footer — the website half of the product */}
      <footer className="mt-4 border-t border-[var(--color-line)] pt-8">
        <h2 className="text-[15px] font-bold">
          {hi
            ? 'अध्यापक — शिक्षक भर्ती परीक्षाओं की संपूर्ण तैयारी'
            : 'Adhyapak — complete preparation for teaching exams'}
        </h2>
        {/* Named every exam in the catalogue, which put eleven other exams in
            front of a candidate preparing for one. The platform's reach is
            still described; the roll-call belongs on a marketing page, not on
            the home screen of someone revising. */}
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--color-muted)]">
          {hi
            ? `${examName ? examName + ' ' : ''}हेतु लाइव कक्षाएँ, नोट्स, वीडियो, MCQ अभ्यास तथा पूर्ण मॉक टेस्ट — हिंदी एवं अंग्रेज़ी दोनों में।`
            : `Live classes, notes, video lessons, MCQ practice and full-length mock tests${examName ? ` for ${examName}` : ''} — in both Hindi and English.`}
        </p>
      </footer>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-extrabold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--color-muted)]">{label}</p>
      <p className="truncate text-[11px] text-[var(--color-faint)]">{unit}</p>
    </div>
  );
}

/** A single next-step row: what it is, why, and one button. */
function Action({
  href,
  icon,
  tint,
  title,
  sub,
  cta,
  accent,
}: {
  href: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
  accent: string;
}) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
        style={{ background: tint }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold">{title}</span>
        <span className="block truncate text-[12px] text-[var(--color-muted)]">{sub}</span>
      </span>
      <span
        className="shrink-0 rounded-full px-4 py-2 text-[12px] font-bold text-white"
        style={{ background: accent }}
      >
        {cta}
      </span>
    </Link>
  );
}
