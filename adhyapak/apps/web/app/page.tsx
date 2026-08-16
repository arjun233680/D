'use client';

import Link from 'next/link';
import {
  BATCHES,
  EXAMS,
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

  // Nobody has a goal until they choose one, and the whole dashboard is scoped
  // by it — the countdown, the cut-off, the next mock, the recommended topic.
  // It used to open on CTET's because the bundled learner was seeded with it,
  // which meant a first-time visitor was shown a countdown to an exam they had
  // never said they were sitting.
  if (!exam) return <GoalPicker />;

  // Ordered by what a candidate opens the app for. The first one becomes the
  // primary card; the rest are secondary rows. Nothing is padded out to a fixed
  // count — an empty slot would push the real work further down the page.
  const actions = [
    dailyQuiz && {
      href: `/tests/${dailyQuiz.id}`,
      icon: '⚡',
      tint: 'var(--color-brand-light)',
      title: hi ? 'आज की प्रश्नोत्तरी' : "Today's quiz",
      sub: `10 ${hi ? 'प्रश्न' : 'questions'} · 10 ${hi ? 'मिनट' : 'min'}`,
      cta: hi ? 'शुरू करें' : 'Start',
    },
    suggested && {
      href: `/practice/topic/${suggested.id}`,
      icon: '🎯',
      tint: 'var(--color-warning-light)',
      title: weakTopicId
        ? hi ? 'कमज़ोर टॉपिक सुधारें' : 'Fix your weak topic'
        : hi ? 'सर्वाधिक भार वाला टॉपिक' : 'Highest-weightage topic',
      sub: `${getSubject(suggested.subjectId)?.icon ?? ''} ${t(suggested.name, lang)}`,
      cta: hi ? 'अभ्यास करें' : 'Practise',
    },
    nextMock && {
      href: `/tests/${nextMock.id}`,
      icon: '📝',
      tint: 'var(--color-accent-light)',
      title: hi ? 'अगला मॉक टेस्ट' : 'Next mock test',
      sub: t(nextMock.title, lang),
      cta: hi ? 'टेस्ट दें' : 'Attempt',
    },
    myBatch && {
      href: `/batches/${myBatch.id}`,
      icon: '🎓',
      tint: 'var(--color-info-light)',
      title: hi ? 'आपका बैच' : 'Your batch',
      sub: t(myBatch.title, lang),
      cta: hi ? 'खोलें' : 'Open',
    },
  ].filter(Boolean) as ActionItem[];

  // A live class outranks everything else on the list while it is on air, and
  // only while it is on air — so it is not part of the ordered list above.
  const liveNow = live[0];

  return (
    <div className="space-y-10 px-4 pt-4 pb-10 sm:px-0 sm:pt-6">
      {/* ---------------------------------------------------------- 1. the goal
          The exam, the paper, and the one genuinely urgent fact: how long is
          left. The countdown is set as a display numeral rather than another
          pill, because it is the only number on this page that changes on its
          own and the only one a candidate checks daily. */}
      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Link
          href={`/goal/${exam.slug}`}
          className="group relative isolate overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[0_18px_40px_-24px_rgba(11,17,32,0.55)] sm:px-8 sm:py-8"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}d9 55%, ${accent}b3 100%)` }}
        >
          {/* A soft highlight in the top-left keeps a flat gradient from reading
              like a plain colour block. Purely decorative, hence aria-hidden. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/15 blur-2xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-10 text-[150px] leading-none opacity-[0.14] select-none"
          >
            {exam.emoji}
          </span>

          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">
              {hi ? 'आपका लक्ष्य' : 'Your goal'}
            </p>
            <h1 className="mt-2 text-[24px] leading-[1.15] font-extrabold tracking-tight sm:text-[32px]">
              {t(exam.name, lang)}
            </h1>
            {paper ? (
              <p className="mt-1.5 text-[13px] font-medium text-white/85">{t(paper.name, lang)}</p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-end gap-x-7 gap-y-4">
              {countdown !== null ? (
                <div>
                  <p className="text-[34px] leading-none font-extrabold tabular-nums sm:text-[40px]">
                    {countdown}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-white/75 uppercase">
                    {hi ? 'दिन शेष' : 'days left'}
                  </p>
                </div>
              ) : null}
              {paper ? (
                <div>
                  <p className="text-[34px] leading-none font-extrabold tabular-nums sm:text-[40px]">
                    {paper.cutoffGeneral}%
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-white/75 uppercase">
                    {hi ? 'कट-ऑफ' : 'cut-off'}
                  </p>
                </div>
              ) : null}
              {exam.vacancies ? (
                <div>
                  <p className="text-[34px] leading-none font-extrabold tabular-nums sm:text-[40px]">
                    {exam.vacancies.toLocaleString('en-IN')}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-white/75 uppercase">
                    {hi ? 'पद' : 'posts'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </Link>

        {/* Progress, or the reason there is none yet.
            Three metrics reading 0, 0 and 0% used to sit here at the same
            visual weight as the goal itself — the loudest thing on a new
            learner's first screen was three zeros. Until there is something to
            report, the space says what to do instead. */}
        {attempts.length ? (
          <div className="card flex flex-col justify-center gap-4 p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-faint)] uppercase">
              {hi ? 'आपकी प्रगति' : 'Your progress'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Metric label={hi ? 'श्रृंखला' : 'Streak'} value={`${streak}`} unit={hi ? 'दिन' : 'days'} color={accent} />
              <Metric label={hi ? 'टेस्ट' : 'Tests'} value={`${attempts.length}`} unit={hi ? 'पूर्ण' : 'done'} color="var(--color-accent)" />
              <Metric label={hi ? 'शुद्धता' : 'Accuracy'} value={`${avgAccuracy}%`} unit={hi ? 'औसत' : 'avg'} color="var(--color-success)" />
            </div>
            <Link href="/profile" className="text-[12px] font-bold" style={{ color: accent }}>
              {hi ? 'पूरी प्रगति देखें →' : 'See full progress →'}
            </Link>
          </div>
        ) : (
          <div className="card flex flex-col justify-center gap-2.5 p-5">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-faint)] uppercase">
              {hi ? 'शुरुआत करें' : 'Get started'}
            </p>
            <p className="text-[15px] leading-snug font-bold">
              {hi
                ? 'पहला टेस्ट दीजिए — उसके बाद यहाँ आपकी श्रृंखला, शुद्धता और कमज़ोर टॉपिक दिखेंगे।'
                : 'Sit your first test — your streak, accuracy and weak topics appear here afterwards.'}
            </p>
            <Link
              href="/tests"
              className="mt-1 w-fit rounded-full px-4 py-2 text-[12px] font-bold text-white"
              style={{ background: accent }}
            >
              {hi ? 'टेस्ट सीरीज़ खोलें' : 'Open test series'}
            </Link>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- 2. the shelf
          Shortcuts to the sections that carry the actual material. They sit
          directly under the goal as a slim quick-access bar rather than a band
          of large tiles further down — one row costs almost no height, so
          promoting it does not push the day's work below the fold. */}
      <section>
        <SectionHeading title={hi ? 'सामग्री' : 'Library'} />
        <div className="rail flex gap-2.5 pb-1 sm:flex-wrap">
          {LIBRARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card flex shrink-0 items-center gap-2.5 py-2.5 pr-4 pl-2.5 transition-colors hover:border-[var(--color-line-strong)]"
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]"
                style={{ background: `${item.color}1a` }}
              >
                {item.icon}
              </span>
              <span className="text-[13px] font-semibold whitespace-nowrap">
                {t(item.label, lang)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ 3. the work, and only
          then the news. A live class jumps the queue while it is on air. */}
      <section className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <SectionHeading title={hi ? 'आज क्या करें' : 'What to do today'} />

          <div className="space-y-2.5">
            {liveNow ? (
              <Action
                href={`/videos/${liveNow.id}`}
                icon="🔴"
                tint="var(--color-danger-light)"
                title={hi ? 'अभी लाइव क्लास' : 'Live class now'}
                sub={t(liveNow.title, lang)}
                cta={hi ? 'जुड़ें' : 'Join'}
                accent="var(--color-danger)"
                primary
              />
            ) : null}

            {actions.map((a, i) => (
              <Action
                key={a.href}
                href={a.href}
                icon={a.icon}
                tint={a.tint}
                title={a.title}
                sub={a.sub}
                cta={a.cta}
                accent={accent}
                // Exactly one filled button on the page. Five identical green
                // pills gave a candidate no idea which one to press first,
                // which is the whole job of this section.
                primary={!liveNow && i === 0}
              />
            ))}

            {!liveNow && actions.length === 0 ? (
              <p className="card p-4 text-[13px] text-[var(--color-muted)]">
                {hi
                  ? 'इस लक्ष्य के लिए अभी कोई सुझाव नहीं। अभ्यास से शुरू कीजिए।'
                  : 'Nothing to suggest for this goal yet. Start with practice.'}
              </p>
            ) : null}
          </div>
        </div>

        {timeline.length ? (
          <div>
            <SectionHeading
              title={hi ? `${exam.shortName} अपडेट` : `${exam.shortName} updates`}
              action={{ href: `/goal/${exam.slug}`, label: hi ? 'सभी' : 'All', color: accent }}
            />
            <ol className="space-y-2.5">
              {timeline.map((u) => (
                <li key={`${u.date}-${u.title.en}`} className="card p-4">
                  <p className="text-[11px] font-bold tracking-wide" style={{ color: accent }}>
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
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      {/* ----------------------------------------------------------- 4. the pitch */}
      <footer className="border-t border-[var(--color-line)] pt-7">
        <h2 className="text-[14px] font-bold">
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

interface ActionItem {
  href: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
}

/**
 * A section label.
 *
 * A small tracked-out uppercase eyebrow rather than another 17px extrabold
 * heading: with four of them down the page, headings at that weight competed
 * with the content they were labelling.
 */
function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string; color: string };
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[12px] font-bold tracking-[0.12em] text-[var(--color-faint)] uppercase">
        {title}
      </h2>
      {action ? (
        <Link href={action.href} className="text-[12px] font-bold" style={{ color: action.color }}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * One progress figure.
 *
 * No card of its own any more — three bordered boxes inside a bordered panel
 * was a frame around a frame. The panel groups them; these just have to be
 * readable and aligned, which is what the tabular numerals are for.
 */
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
    <div>
      <p className="text-[22px] leading-none font-extrabold tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--color-muted)]">{label}</p>
      <p className="truncate text-[11px] text-[var(--color-faint)]">{unit}</p>
    </div>
  );
}

/**
 * A single next-step row: what it is, why, and one button.
 *
 * `primary` is given to exactly one row on the page. Every row used to carry
 * the same filled accent pill, so the section that exists to answer "what
 * should I do first" answered it four times at once. The primary row is a
 * little taller, tinted, and keeps the filled button; the rest get a quiet
 * outline and lean on the chevron.
 */
function Action({
  href,
  icon,
  tint,
  title,
  sub,
  cta,
  accent,
  primary = false,
}: {
  href: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
  accent: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card flex items-center gap-4 transition-all hover:-translate-y-px hover:shadow-[0_10px_24px_-16px_rgba(11,17,32,0.4)] ${
        primary ? 'p-4 sm:p-5' : 'p-3.5'
      }`}
      style={primary ? { borderColor: `${accent}59`, background: `${accent}0a` } : undefined}
    >
      <span
        className={`grid shrink-0 place-items-center rounded-xl ${
          primary ? 'h-12 w-12 text-[22px]' : 'h-10 w-10 text-[18px]'
        }`}
        style={{ background: tint }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-bold ${primary ? 'text-[15px]' : 'text-[14px]'}`}>
          {title}
        </span>
        <span className="block truncate text-[12px] text-[var(--color-muted)]">{sub}</span>
      </span>
      {primary ? (
        <span
          className="shrink-0 rounded-full px-4 py-2 text-[12px] font-bold text-white"
          style={{ background: accent }}
        >
          {cta}
        </span>
      ) : (
        <span
          className="shrink-0 rounded-full border border-[var(--color-line)] px-3.5 py-1.5 text-[12px] font-bold"
          style={{ color: accent }}
        >
          {cta}
        </span>
      )}
    </Link>
  );
}

/**
 * The first screen of a brand-new visit: choose what you are preparing for.
 *
 * Deliberately the whole page rather than a banner above an empty dashboard.
 * Every panel below the fold — countdown, cut-off, next mock, weak topic — is
 * scoped to the goal, so with none chosen there is nothing truthful to render
 * underneath. Choosing writes `set_goal` for a signed-in learner and stays
 * local for everybody else, which is the same contract as the goal switcher in
 * the header.
 */
function GoalPicker() {
  const { lang, setGoal } = useStore();
  const hi = lang === 'hi';

  return (
    <div className="space-y-6 px-4 pt-8 pb-12 sm:px-0">
      <header>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          {hi ? 'आप कौन-सी परीक्षा दे रहे हैं?' : 'Which exam are you preparing for?'}
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'यही तय करता है कि कौन-से विषय, टेस्ट, बैच और कट-ऑफ दिखें। इसे ऊपर दाईं ओर से कभी भी बदला जा सकता है।'
            : 'This decides which subjects, tests, batches and cut-offs you see. You can change it any time from the top right.'}
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {EXAMS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setGoal(e.id, e.papers[0]?.id)}
            className="card flex items-center gap-3 p-4 text-left transition-colors hover:border-[var(--color-brand)]"
          >
            <span className="text-2xl">{e.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{e.shortName}</span>
              <span className="block truncate text-[12px] text-[var(--color-muted)]">
                {t(e.name, lang)}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="text-[12px] text-[var(--color-muted)]">
        {hi
          ? 'साइन इन करने पर यह चुनाव आपके खाते में सहेजा जाता है और हर डिवाइस पर साथ चलता है।'
          : 'Signed in, this choice is saved to your account and follows you to every device.'}{' '}
        <Link href="/sign-in" className="font-bold text-[var(--color-brand)] underline">
          {hi ? 'साइन इन' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
}
