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
 */
export function PracticeRunner({
  questions,
  title,
  subtitle,
  backHref = '/practice',
}: {
  questions: Question[];
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  const { lang, user, toggleBookmark, markActiveToday } = useStore();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<PracticeSessionResult[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const summary = useMemo(() => summarisePractice(questions, results), [questions, results]);

  if (!questions.length) {
    return (
      <div className="px-4 pt-6 sm:px-0">
        <EmptyState
          icon="✍️"
          title={lang === 'hi' ? 'यहाँ अभी प्रश्न नहीं हैं' : 'No questions here yet'}
          body={
            lang === 'hi'
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
            {lang === 'hi'
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
            <h2 className="text-[15px] font-bold">
              {lang === 'hi' ? 'इन्हें दोहराएँ' : 'Revise these'}
            </h2>
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
            {lang === 'hi' ? 'वापस' : 'Back'}
          </Link>
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setSelected(null);
              setRevealed(false);
              setResults([]);
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
  const subject = getSubject(question.subjectId);
  const topic = getTopic(question.topicId);
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);

  const answer = (optionIndex: number) => {
    if (revealed) return;
    setSelected(optionIndex);
    setRevealed(true);
    setResults((prev) => [
      ...prev,
      {
        questionId: question.id,
        selectedIndex: optionIndex,
        correct: optionIndex === question.correctIndex,
        timeSpentMs: Date.now() - startedAt,
      },
    ]);
    markActiveToday();
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
    setStartedAt(Date.now());
  };

  const skip = () => {
    setResults((prev) => [
      ...prev,
      {
        questionId: question.id,
        selectedIndex: null,
        correct: false,
        timeSpentMs: Date.now() - startedAt,
      },
    ]);
    next();
  };

  return (
    <div className="px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href={backHref} className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {t(UI.practice, lang)}
      </Link>

      <div className="mt-3">
        <h1 className="text-[17px] font-extrabold">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">{subtitle}</p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-[12px] font-bold tabular-nums">
          {index + 1}
          <span className="text-[var(--color-faint)]">/{questions.length}</span>
        </span>
        <div className="flex-1">
          <ProgressBar value={((index + (revealed ? 1 : 0)) / questions.length) * 100} />
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
              ? lang === 'hi'
                ? 'सरल'
                : 'Easy'
              : question.difficulty === 'medium'
                ? lang === 'hi'
                  ? 'मध्यम'
                  : 'Medium'
                : lang === 'hi'
                  ? 'कठिन'
                  : 'Hard'}
          </Badge>
          {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
          <div className="flex-1" />
          <button type="button" onClick={() => toggleBookmark(question.id)} className="text-[16px]">
            {bookmarked ? '🔖' : '📑'}
          </button>
        </div>

        <p className="mt-3 text-[16px] leading-relaxed font-semibold">{t(question.text, lang)}</p>

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
            <p className="mt-1.5 text-[13px] leading-relaxed">{t(question.explanation, lang)}</p>
            <p className="mt-2 text-[11px] text-[var(--color-faint)]">
              {Math.round(question.accuracy * 100)}%{' '}
              {lang === 'hi' ? 'शिक्षार्थियों ने सही किया' : 'of learners got this right'} ·{' '}
              {lang === 'hi' ? 'औसत समय' : 'avg time'} {question.avgTimeSeconds}s
            </p>
          </div>
        ) : null}
      </article>

      <div className="mt-4 flex gap-2">
        {!revealed ? (
          <button
            type="button"
            onClick={skip}
            className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-[13px] font-bold text-[var(--color-muted)]"
          >
            {lang === 'hi' ? 'छोड़ें' : 'Skip'}
          </button>
        ) : null}
        <button
          type="button"
          onClick={next}
          disabled={!revealed}
          className="flex-[2] rounded-xl bg-[var(--color-brand)] py-3 text-[13px] font-bold text-white disabled:opacity-40"
        >
          {index + 1 >= questions.length
            ? lang === 'hi'
              ? 'परिणाम देखें'
              : 'See result'
            : lang === 'hi'
              ? 'अगला प्रश्न'
              : 'Next question'}
        </button>
      </div>
    </div>
  );
}
