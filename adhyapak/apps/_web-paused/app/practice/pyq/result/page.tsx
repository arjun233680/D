'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  isBackendConfigured,
  listQuestions,
  matchesSolutionFilter,
  pyqFilterModel,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  pyqTestId,
  PYQ_SCREEN_LIMIT,
  resolvePyqSelection,
  solutionFilterOptions,
  solutionOutcome,
  t,
  UI,
  type PyqSelection,
  type SolutionFilter,
} from '@adhyapak/core';
import { isCorrectAnswer, OPTION_LABELS, inLang } from '@adhyapak/core';
import type { OptionLabel } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { QuestionSolution } from '@/components/QuestionSolution';
import { SolutionFilterChips } from '@/components/SolutionFilterChips';
import { AsyncSection, EmptyState, Skeleton, Stat } from '@/components/ui';

/**
 * The score for a previous-year paper, then every question with its solution.
 *
 * Its own route rather than a screen state on the attempt, exactly as a mock
 * has one: the attempt window is immersive and this is not, a refresh here
 * should show the same result rather than an empty paper, and the score of a
 * specific paper is a thing worth having a URL.
 *
 * Both the attempt and the result are keyed by `pyqTestId`, which is derived
 * from the selection — so this page rebuilds the same id from the same query
 * string and finds what the attempt saved.
 */

export default function PyqResultPage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender in a static export.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <PyqResult />
    </Suspense>
  );
}

function PyqResult() {
  const { lang, user, attempts, results } = useStore();
  const hi = lang === 'hi';
  const params = useSearchParams();
  const [filter, setFilter] = useState<SolutionFilter>('all');

  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );
  const model = useMemo(() => pyqFilterModel(selection), [selection]);

  const testId = pyqTestId(selection);
  const attempt = attempts[testId];
  const result = results[testId];

  // The same questions the attempt was built from, fetched the same way — the
  // paper is a filter, so it is re-resolved rather than stored.
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: PYQ_SCREEN_LIMIT }),
    [JSON.stringify(model.filter)],
  );

  const backQuery = new URLSearchParams(pyqSelectionToParams(selection)).toString();
  const backHref = backQuery ? `/practice/pyq?${backQuery}` : '/practice/pyq';
  const retryHref = backQuery
    ? `/practice/pyq/attempt?${backQuery}`
    : '/practice/pyq/attempt';

  const byPaper = isBackendConfigured();
  const title =
    byPaper && model.paper
      ? `${t(model.paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
      : hi
        ? 'विगत वर्ष प्रश्न'
        : 'Previous year questions';

  if (!result || !attempt) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
        <EmptyState
          icon="📊"
          title={hi ? 'अभी कोई परिणाम नहीं' : 'No result yet'}
          body={
            hi
              ? 'यह पेपर पूरा कीजिए, फिर आपका स्कोर और हल यहाँ दिखेंगे।'
              : 'Finish this paper and your score and solutions will appear here.'
          }
        />
        <Link
          href={retryHref}
          className="block rounded-xl bg-[var(--color-brand)] py-3 text-center text-[13px] font-bold text-white"
        >
          {hi ? 'टेस्ट शुरू करें' : 'Start test'} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href={backHref} className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {hi ? 'चयन बदलें' : 'Change selection'}
      </Link>

      <div className="rounded-2xl bg-[var(--color-ink)] px-5 py-6 text-white">
        <p className="text-[13px] text-white/70">{title}</p>
        <div className="mt-2 text-[40px] leading-none font-black tabular-nums">
          {result.score}
          <span className="text-[18px] font-bold text-white/60">/{result.maxScore}</span>
        </div>
        <p className="mt-2 text-[13px] text-white/75">
          {hi
            ? `शुद्धता ${result.accuracy}% · ${result.attempted} प्रश्न किए`
            : `${result.accuracy}% accuracy · ${result.attempted} attempted`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t(UI.correct, lang)} value={String(result.correct)} tone="success" />
        <Stat label={t(UI.incorrect, lang)} value={String(result.incorrect)} tone="danger" />
        <Stat label={t(UI.unattempted, lang)} value={String(result.skipped)} />
      </div>

      <AsyncSection
        state={questions}
        lang={lang}
        empty={{
          icon: '📜',
          title: hi ? 'हल उपलब्ध नहीं' : 'Solutions unavailable',
          body: hi
            ? 'इस पेपर के प्रश्न दोबारा नहीं मिल सके।'
            : 'This paper’s questions could not be loaded again.',
        }}
      >
        {(list) => {
          const rows = list.map((question, i) => {
            const selectedOption = attempt.answers[question.id]?.selectedOption ?? null;
            return {
              question,
              number: i + 1,
              selectedOption,
              timeSpentMs: attempt.answers[question.id]?.timeSpentMs ?? 0,
              outcome: solutionOutcome(selectedOption, question),
            };
          });
          const options = solutionFilterOptions(rows.map((r) => r.outcome));
          const visible = rows.filter((r) => matchesSolutionFilter(r.outcome, filter));

          return (
            <section className="space-y-3">
              <h2 className="text-[15px] font-bold">{hi ? 'हल' : 'Solutions'}</h2>
              <SolutionFilterChips
                options={options}
                value={filter}
                onChange={setFilter}
                lang={lang}
              />

              {visible.length ? (
                visible.map((row) => (
                  <QuestionSolution
                    key={row.question.id}
                    question={row.question}
                    number={row.number}
                    selectedOption={row.selectedOption}
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
                      ? 'दूसरा फ़िल्टर चुनें — “सभी” पूरा पेपर दिखाता है।'
                      : 'Pick another filter — “All” shows the whole paper.'
                  }
                />
              )}
            </section>
          );
        }}
      </AsyncSection>

      <div className="flex flex-wrap gap-2">
        <Link
          href={backHref}
          className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
        >
          {hi ? 'वापस' : 'Back'}
        </Link>
        {/* Back into the paper with every answer intact, marking and all. */}
        <Link
          href={backQuery ? `${retryHref}&review=1` : `${retryHref}?review=1`}
          className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
        >
          {hi ? 'प्रश्नों पर लौटें' : 'Back to questions'}
        </Link>
        <Link
          href={retryHref}
          className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-center text-[13px] font-bold text-white"
        >
          {t(UI.reattempt, lang)}
        </Link>
      </div>
    </div>
  );
}
