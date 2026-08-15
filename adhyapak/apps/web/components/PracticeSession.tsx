'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  matchesSolutionFilter,
  pyqTestFromQuestions,
  solutionFilterOptions,
  solutionOutcome,
  t,
  UI,
  type Question,
  type SolutionFilter,
  type TestAttempt,
  type TestResult,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestPlayer } from '@/components/TestPlayer';
import { QuestionSolution } from '@/components/QuestionSolution';
import { SolutionFilterChips } from '@/components/SolutionFilterChips';
import { EmptyState, Stat } from '@/components/ui';

/**
 * Any set of questions, sat in the exam window and then reviewed.
 *
 * Subject practice, topic practice and bookmarks were three screens running an
 * instant-feedback runner while mocks and previous-year papers ran the exam
 * window. That is two different products for the same act. This is the one
 * path: the window, then the score, then every question with its solution and
 * the outcome filters.
 *
 * The set is assembled into a `Test` because that is what the window and the
 * grader take. It is never saved to the store — a topic drill is not a mock,
 * and a half-finished one should not reappear as a resumable paper.
 */
export function PracticeSession({
  questions,
  title,
  backHref,
  examId = '',
}: {
  questions: Question[];
  title: string;
  backHref: string;
  examId?: string;
}) {
  const { lang, markActiveToday } = useStore();
  const hi = lang === 'hi';
  const [done, setDone] = useState<{ result: TestResult; attempt: TestAttempt } | null>(null);
  const [filter, setFilter] = useState<SolutionFilter>('all');
  // Set when the learner steps back into the paper from the result, so the
  // window reopens on their own answers rather than on a blank sheet.
  const [resume, setResume] = useState<TestAttempt | undefined>(undefined);

  const test = useMemo(
    () =>
      pyqTestFromQuestions(questions, {
        id: `set-${title}-${questions.length}`,
        title: { en: title, hi: title },
        examId,
      }),
    [questions, title, examId],
  );

  const onSubmit = useCallback(
    (result: TestResult, attempt: TestAttempt) => {
      markActiveToday();
      setDone({ result, attempt });
      window.scrollTo({ top: 0 });
    },
    [markActiveToday],
  );

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

  if (!done) {
    return (
      <TestPlayer
        test={test}
        questions={questions}
        resume={resume}
        onSubmit={onSubmit}
        instantFeedback
      />
    );
  }

  const rows = questions.map((question, i) => {
    const selectedIndex = done.attempt.answers[question.id]?.selectedIndex ?? null;
    return {
      question,
      number: i + 1,
      selectedIndex,
      timeSpentMs: done.attempt.answers[question.id]?.timeSpentMs ?? 0,
      outcome: solutionOutcome(selectedIndex, question.correctIndex),
    };
  });
  const options = solutionFilterOptions(rows.map((r) => r.outcome));
  const visible = rows.filter((r) => matchesSolutionFilter(r.outcome, filter));

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href={backHref} className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {t(UI.practice, lang)}
      </Link>

      <div className="rounded-2xl bg-[var(--color-ink)] px-5 py-6 text-white">
        <p className="text-[13px] text-white/70">{title}</p>
        <div className="mt-2 text-[40px] leading-none font-black tabular-nums">
          {done.result.score}
          <span className="text-[18px] font-bold text-white/60">/{done.result.maxScore}</span>
        </div>
        <p className="mt-2 text-[13px] text-white/75">
          {hi
            ? `शुद्धता ${done.result.accuracy}% · ${done.result.attempted} प्रश्न किए`
            : `${done.result.accuracy}% accuracy · ${done.result.attempted} attempted`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t(UI.correct, lang)} value={String(done.result.correct)} tone="success" />
        <Stat label={t(UI.incorrect, lang)} value={String(done.result.incorrect)} tone="danger" />
        <Stat label={t(UI.unattempted, lang)} value={String(done.result.skipped)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-bold">{hi ? 'हल' : 'Solutions'}</h2>
        <SolutionFilterChips options={options} value={filter} onChange={setFilter} lang={lang} />

        {visible.length ? (
          visible.map((row) => (
            <QuestionSolution
              key={row.question.id}
              question={row.question}
              number={row.number}
              selectedIndex={row.selectedIndex}
              lang={lang}
              footer={
                <p className="mt-2 text-[11px] text-[var(--color-faint)]">
                  {hi ? 'आपका समय' : 'Your time'}: {Math.round(row.timeSpentMs / 1000)}s
                </p>
              }
            />
          ))
        ) : (
          <EmptyState
            icon="🔎"
            title={hi ? 'इस श्रेणी में कुछ नहीं' : 'Nothing in this group'}
            body={
              hi
                ? 'दूसरा फ़िल्टर चुनें — “सभी” पूरा सेट दिखाता है।'
                : 'Pick another filter — “All” shows the whole set.'
            }
          />
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={backHref}
          className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
        >
          {hi ? 'वापस' : 'Back'}
        </Link>
        {/* Back into the paper with every answer intact — the marking is on the
            questions too, so a learner can walk them rather than scroll a list.
            `submittedAt` is cleared because the window refuses to reopen a paper
            it considers finished. */}
        <button
          type="button"
          onClick={() => {
            setResume({ ...done.attempt, submittedAt: undefined });
            setDone(null);
          }}
          className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
        >
          {hi ? 'प्रश्नों पर लौटें' : 'Back to questions'}
        </button>
        <button
          type="button"
          onClick={() => {
            setResume(undefined);
            setDone(null);
          }}
          className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-center text-[13px] font-bold text-white"
        >
          {t(UI.reattempt, lang)}
        </button>
      </div>
    </div>
  );
}
