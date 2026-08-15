'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getSubject,
  getTopic,
  summarisePractice,
  t,
  UI,
  type PracticeSessionResult,
  type Question,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, ProgressBar, Stat } from '@/components/ui';

/**
 * Instant-feedback practice: answer, see the explanation immediately, move on.
 * This is deliberately different from the test player, where feedback is withheld
 * until submission.
 *
 * Every question in the set is listed in the palette beside it, and any of them
 * can be opened directly — the same way the daily quiz works. That is why the
 * answers live in a map keyed by question id rather than an append-only list:
 * with a palette a learner can revisit question 3 after question 40, and a list
 * that only ever grew would record that as a second attempt and count it twice.
 */

/** What the learner did with one question. Absent means not yet reached. */
interface Answer {
  /** null when skipped — a real answer, distinct from "not attempted". */
  selectedIndex: number | null;
  correct: boolean;
  timeSpentMs: number;
}

type PaletteStatus = 'correct' | 'wrong' | 'skipped' | 'unseen';

const STATUS_COLOR: Record<PaletteStatus, string> = {
  correct: 'var(--color-success)',
  wrong: 'var(--color-danger)',
  skipped: 'var(--color-warning)',
  unseen: 'var(--color-line-strong)',
};

const statusOf = (answer: Answer | undefined): PaletteStatus =>
  answer === undefined ? 'unseen' : answer.selectedIndex === null ? 'skipped' : answer.correct ? 'correct' : 'wrong';

export function PracticeRunner({
  questions,
  title,
  subtitle,
  backHref = '/practice',
  embedded = false,
}: {
  questions: Question[];
  title: string;
  subtitle?: string;
  backHref?: string;
  /**
   * The host page already shows the heading and its own way back — the PYQ
   * browser, whose filters sit directly above this. Without it the learner sees
   * "Previous year questions" twice, one under the other.
   */
  embedded?: boolean;
}) {
  const { lang, user, toggleBookmark, markActiveToday } = useStore();
  const hi = lang === 'hi';
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // One result per answered question, in the set's own order — so the summary
  // does not depend on the order the learner happened to jump around in.
  const results = useMemo<PracticeSessionResult[]>(
    () =>
      questions.flatMap((q) => {
        const answer = answers[q.id];
        return answer ? [{ questionId: q.id, ...answer }] : [];
      }),
    [questions, answers],
  );
  const summary = useMemo(() => summarisePractice(questions, results), [questions, results]);

  if (!questions.length) {
    return (
      <div className="px-4 pt-6 sm:px-0">
        <EmptyState
          icon="✍️"
          title={hi ? 'यहाँ अभी प्रश्न नहीं हैं' : 'No questions here yet'}
          body={
            hi
              ? 'दूसरा विषय या टॉपिक चुनें — बैंक लगातार बढ़ रहा है।'
              : 'Pick another subject or topic — the bank keeps growing.'
          }
        />
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
        <div className="rounded-2xl bg-[var(--color-ink)] px-5 py-6 text-white">
          <p className="text-[13px] text-white/70">{title}</p>
          <div className="mt-2 text-[40px] leading-none font-black tabular-nums">
            {summary.correct}
            <span className="text-[18px] font-bold text-white/60">/{summary.attempted}</span>
          </div>
          <p className="mt-2 text-[13px] text-white/75">
            {hi
              ? `शुद्धता ${summary.accuracy}% · औसत ${summary.avgTimeSeconds}s प्रति प्रश्न`
              : `${summary.accuracy}% accuracy · ${summary.avgTimeSeconds}s average per question`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label={t(UI.correct, lang)} value={String(summary.correct)} tone="success" />
          <Stat label={t(UI.incorrect, lang)} value={String(summary.incorrect)} tone="danger" />
          <Stat label={t(UI.accuracy, lang)} value={`${summary.accuracy}%`} tone="accent" />
        </div>

        {summary.reviseTopicIds.length ? (
          <div className="card p-4">
            <h2 className="text-[15px] font-bold">{hi ? 'इन्हें दोहराएँ' : 'Revise these'}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.reviseTopicIds.map((topicId) => {
                const topic = getTopic(topicId);
                return (
                  <Link
                    key={topicId}
                    href={`/practice/topic/${topicId}`}
                    className="rounded-full bg-[var(--color-danger-light)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-danger)]"
                  >
                    {topic ? t(topic.name, lang) : topicId}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Link
            href={backHref}
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
          >
            {hi ? 'वापस' : 'Back'}
          </Link>
          {/* Back into the set with every answer intact, so a learner who
              finished early can keep going rather than start over. */}
          <button
            type="button"
            onClick={() => setFinished(false)}
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
          >
            {hi ? 'प्रश्नों पर लौटें' : 'Back to questions'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setAnswers({});
              setFinished(false);
              setStartedAt(Date.now());
            }}
            className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-center text-[13px] font-bold text-white"
          >
            {t(UI.reattempt, lang)}
          </button>
        </div>
      </div>
    );
  }

  const question = questions[index]!;
  const current = answers[question.id];
  const revealed = current !== undefined;
  const selected = current?.selectedIndex ?? null;
  const subject = getSubject(question.subjectId);
  const topic = getTopic(question.topicId);
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);
  const answeredCount = results.length;

  const record = (selectedIndex: number | null) =>
    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        selectedIndex,
        correct: selectedIndex === question.correctIndex,
        timeSpentMs: Date.now() - startedAt,
      },
    }));

  const answer = (optionIndex: number) => {
    if (revealed) return;
    record(optionIndex);
    markActiveToday();
  };

  const goTo = (next: number) => {
    setIndex(next);
    setStartedAt(Date.now());
    setPaletteOpen(false);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    goTo(index + 1);
  };

  const skip = () => {
    record(null);
    next();
  };

  const palette = (
    <Palette
      questions={questions}
      answers={answers}
      currentIndex={index}
      onGo={goTo}
      onFinish={() => setFinished(true)}
      lang={lang}
    />
  );

  return (
    <div className={embedded ? '' : 'px-4 pt-4 pb-8 sm:px-0 sm:pt-6'}>
      {embedded ? null : (
        <Link href={backHref} className="text-[13px] font-semibold text-[var(--color-muted)]">
          ← {t(UI.practice, lang)}
        </Link>
      )}

      <div className={`flex items-start gap-3 ${embedded ? '' : 'mt-3'}`}>
        <div className="min-w-0 flex-1">
          {embedded ? null : <h1 className="text-[17px] font-extrabold">{title}</h1>}
          {subtitle && !embedded ? (
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {/* On a phone the palette is a panel that opens under the header;
            from lg upwards it is always visible down the right-hand side. */}
        <button
          type="button"
          onClick={() => setPaletteOpen((open) => !open)}
          className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] font-bold lg:hidden"
          aria-expanded={paletteOpen}
        >
          {paletteOpen ? '✕' : '☰'} {answeredCount}/{questions.length}
        </button>
      </div>

      {paletteOpen ? <div className="card mt-3 p-4 lg:hidden">{palette}</div> : null}

      <div className="mt-3 flex gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold tabular-nums">
              {index + 1}
              <span className="text-[var(--color-faint)]">/{questions.length}</span>
            </span>
            <div className="flex-1">
              <ProgressBar value={(answeredCount / questions.length) * 100} />
            </div>
            <span className="text-[12px] font-bold text-[var(--color-success)] tabular-nums">
              {summary.correct} ✓
            </span>
          </div>

          <article className="card mt-4 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="neutral">
                {subject?.icon} {subject ? t(subject.name, lang) : ''}
              </Badge>
              {topic ? <Badge tone="accent">{t(topic.name, lang)}</Badge> : null}
              <Badge
                tone={
                  question.difficulty === 'easy'
                    ? 'success'
                    : question.difficulty === 'medium'
                      ? 'warning'
                      : 'danger'
                }
              >
                {question.difficulty === 'easy'
                  ? hi
                    ? 'सरल'
                    : 'Easy'
                  : question.difficulty === 'medium'
                    ? hi
                      ? 'मध्यम'
                      : 'Medium'
                    : hi
                      ? 'कठिन'
                      : 'Hard'}
              </Badge>
              {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => toggleBookmark(question.id)}
                className="text-[16px]"
              >
                {bookmarked ? '🔖' : '📑'}
              </button>
            </div>

            <p className="mt-3 text-[16px] leading-relaxed font-semibold">
              {t(question.text, lang)}
            </p>

            <div className="mt-4 space-y-2.5">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.correctIndex;
                const isChosen = i === selected;
                const showState = revealed && (isCorrect || isChosen);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answer(i)}
                    disabled={revealed}
                    className={`option-row flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left ${
                      showState
                        ? isCorrect
                          ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
                          : 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
                        : 'border-[var(--color-line)] hover:border-[var(--color-line-strong)]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${
                        showState
                          ? isCorrect
                            ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                            : 'border-[var(--color-danger)] bg-[var(--color-danger)] text-white'
                          : 'border-[var(--color-line-strong)] text-[var(--color-muted)]'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 text-[14px] leading-relaxed">{t(opt, lang)}</span>
                    {showState ? <span>{isCorrect ? '✅' : '❌'}</span> : null}
                  </button>
                );
              })}
            </div>

            {revealed ? (
              <div className="mt-4 rounded-xl bg-[var(--color-surface-alt)] p-3.5">
                <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
                  {t(UI.explanation, lang)}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed">
                  {t(question.explanation, lang)}
                </p>
                {/* A cohort line sat here — "68% of learners got this right · avg
                    time 47s" — reading off seed values. No cohort has answered
                    these questions, so there is nothing to report until
                    attempt_answers has enough rows to aggregate. */}
              </div>
            ) : null}
          </article>

          {/* Bottom right, where a learner's hand already is after clicking the
              last option — and where the next control sits in every paper-based
              test they have taken. Back stays on the left, away from Next, so
              the two are not adjacent targets. */}
          <div className="mt-4 flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[13px] font-bold text-[var(--color-muted)]"
                aria-label={hi ? 'पिछला प्रश्न' : 'Previous question'}
              >
                ←
              </button>
            ) : null}
            <div className="flex-1" />
            {!revealed ? (
              <button
                type="button"
                onClick={skip}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3 text-[13px] font-bold text-[var(--color-muted)]"
              >
                {hi ? 'छोड़ें' : 'Skip'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={next}
              disabled={!revealed}
              className="rounded-xl bg-[var(--color-brand)] px-8 py-3 text-[13px] font-bold text-white disabled:opacity-40"
            >
              {index + 1 >= questions.length
                ? hi
                  ? 'परिणाम देखें'
                  : 'See result'
                : hi
                  ? 'अगला प्रश्न'
                  : 'Next question'}
            </button>
          </div>
        </div>

        <aside className="hidden w-[248px] shrink-0 lg:block">
          <div className="card sticky top-20 p-4">{palette}</div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Every question in the set, as a grid of numbers.
 *
 * Colour is the outcome, not just "visited": a learner scanning for what to
 * revise wants the wrong ones, and the test player's answered/not-answered
 * split cannot express that because a test hides its marking until submission.
 */
function Palette({
  questions,
  answers,
  currentIndex,
  onGo,
  onFinish,
  lang,
}: {
  questions: Question[];
  answers: Record<string, Answer>;
  currentIndex: number;
  onGo: (index: number) => void;
  onFinish: () => void;
  lang: 'en' | 'hi';
}) {
  const hi = lang === 'hi';
  const tally = { correct: 0, wrong: 0, skipped: 0, unseen: 0 };
  for (const q of questions) tally[statusOf(answers[q.id])] += 1;

  const legend: { status: PaletteStatus; label: string }[] = [
    { status: 'correct', label: hi ? 'सही' : 'Correct' },
    { status: 'wrong', label: hi ? 'ग़लत' : 'Wrong' },
    { status: 'skipped', label: hi ? 'छोड़े' : 'Skipped' },
    { status: 'unseen', label: hi ? 'बाकी' : 'Left' },
  ];

  return (
    <div>
      <p className="text-[12px] font-bold">{hi ? 'सभी प्रश्न' : 'All questions'}</p>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
        {legend.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5">
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-[10px] font-bold"
              style={{
                background: STATUS_COLOR[item.status],
                color: item.status === 'unseen' ? 'var(--color-body)' : '#fff',
              }}
            >
              {tally[item.status]}
            </span>
            <span className="truncate text-[var(--color-muted)]">{item.label}</span>
          </span>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-6 gap-1.5">
        {questions.map((q, i) => {
          const status = statusOf(answers[q.id]);
          const subject = getSubject(q.subjectId);
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onGo(i)}
              title={subject ? t(subject.name, lang) : undefined}
              aria-current={i === currentIndex ? 'true' : undefined}
              className={`h-8 rounded text-[11px] font-bold ${
                i === currentIndex ? 'ring-2 ring-[var(--color-ink)] ring-offset-1' : ''
              }`}
              style={{
                background: STATUS_COLOR[status],
                color: status === 'unseen' ? 'var(--color-body)' : '#fff',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="mt-3.5 w-full rounded-xl bg-[var(--color-ink)] py-2.5 text-[13px] font-bold text-white"
      >
        {hi ? 'परिणाम देखें' : 'See result'}
      </button>
    </div>
  );
}
