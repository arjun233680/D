'use client';

import { t, UI, type Lang, type Question } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui';
import type { ReactNode } from 'react';

/**
 * One question, reviewed: what was asked, what the learner picked, what was
 * right, and why.
 *
 * Shared by the mock result and by practice, because they are the same thing
 * seen after two different kinds of sitting, and a learner who has read one
 * should not have to re-learn the other's layout. The two screens differ only
 * in what they append underneath, which is what `footer` is for.
 *
 * The explanation still appears inline during practice as well. That is not a
 * duplicate: inline is for the moment you still remember why you chose B, and
 * this is for revision afterwards, when the question worth re-reading is the
 * one you got wrong.
 */
export function QuestionSolution({
  question,
  number,
  selectedIndex,
  lang,
  footer,
}: {
  question: Question;
  /** Position in the set the learner just sat, not an id. */
  number: number;
  /** null when skipped — a real outcome, distinct from a wrong answer. */
  selectedIndex: number | null;
  lang: Lang;
  footer?: ReactNode;
}) {
  const { user, toggleBookmark } = useStore();
  const correct = selectedIndex === question.correctIndex;
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);

  return (
    <article className="card p-4">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-extrabold">Q{number}</span>
        <Badge tone={correct ? 'success' : selectedIndex === null ? 'neutral' : 'danger'}>
          {correct
            ? t(UI.correct, lang)
            : selectedIndex === null
              ? t(UI.skipped, lang)
              : t(UI.incorrect, lang)}
        </Badge>
        {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => toggleBookmark(question.id)}
          aria-label={lang === 'hi' ? 'बुकमार्क' : 'Bookmark'}
        >
          {bookmarked ? '🔖' : '📑'}
        </button>
      </div>

      <p className="mt-2 text-[14px] leading-relaxed font-semibold">{t(question.text, lang)}</p>

      <ul className="mt-3 space-y-1.5">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === selectedIndex;
          return (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] ${
                isCorrect
                  ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
                  : isChosen
                    ? 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
                    : 'border-[var(--color-line)]'
              }`}
            >
              <span className="font-bold">{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1">{t(opt, lang)}</span>
              {isCorrect ? <span>✅</span> : isChosen ? <span>❌</span> : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 rounded-xl bg-[var(--color-surface-alt)] p-3">
        <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
          {t(UI.explanation, lang)}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">{t(question.explanation, lang)}</p>
      </div>

      {footer}
    </article>
  );
}
