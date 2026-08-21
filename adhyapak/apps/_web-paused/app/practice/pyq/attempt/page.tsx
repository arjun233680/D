'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  revealsDuringPaper,
  type SolutionMode,
  countQuestions,
  getPaper,
  isBackendConfigured,
  listQuestions,
  pyqModeEmptyReason,
  pyqModeModel,
  type PyqMode,
  pyqSelectionFromParams,
  pyqSelectionToParams,
  pyqTestFromQuestions,
  pyqTestId,
  pyqTruncation,
  PYQ_SCREEN_LIMIT,
  resolvePyqSelection,
  t,
  type PyqSelection,
  type TestAttempt,
  type TestResult,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { TestPlayer } from '@/components/TestPlayer';
import { TestInstructions } from '@/components/TestInstructions';
import { AsyncSection, Skeleton } from '@/components/ui';

/**
 * A previous-year set, sat in the exam window.
 *
 * The same window as a mock — clock, section tabs, palette, Mark for Review,
 * Clear Response, Previous, Save & Next — because a candidate should practise
 * in the interface they will face, and because two implementations of that
 * window would drift.
 *
 * The paper is assembled at runtime from whatever the filters matched, so its
 * questions come from the repository and are handed to the player rather than
 * looked up in the bundled bank.
 *
 * Answers are withheld until submission, which is what the exam window means.
 * The explanations are all on the result below, where they can be read against
 * the score.
 */

export default function PyqAttemptPage() {
  return (
    // useSearchParams needs a Suspense boundary to prerender in a static export.
    <Suspense fallback={<Skeleton className="h-64" />}>
      <PyqAttempt />
    </Suspense>
  );
}

function PyqAttempt() {
  const router = useRouter();
  const { lang, user, attempts, saveAttempt, saveResult, markActiveToday } = useStore();
  const hi = lang === 'hi';
  const params = useSearchParams();

  const selection = useMemo(
    (): PyqSelection => resolvePyqSelection(pyqSelectionFromParams((k) => params.get(k)), user),
    [params, user],
  );
  // The mode the chooser started, not a filter re-derived here. A full paper
  // and a topic set are the same questions asked for differently — one is the
  // whole paper in printed order, the other is one topic across every year —
  // and rebuilding the filter without it would quietly run the wrong one.
  const pyqMode = (params.get('mode') as PyqMode | null) ?? 'full-paper';
  const model = useMemo(
    () => pyqModeModel(pyqMode, selection, user.electiveSubjectId),
    [pyqMode, selection, user.electiveSubjectId],
  );
  const paper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;
  const filterKey = JSON.stringify(model.filter);

  // "Back to questions" from the result comes back here with ?review=1.
  const review = params.get('review') === '1';
  // Null until the candidate has read the instructions and chosen a mode.
  const [mode, setMode] = useState<SolutionMode | null>(null);
  const saved = attempts[pyqTestId(selection)];

  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: PYQ_SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, PYQ_SCREEN_LIMIT);
  const reason = pyqModeEmptyReason(model, selection);
  const byPaper = isBackendConfigured();

  const query = new URLSearchParams(pyqSelectionToParams(selection)).toString();

  const title =
    byPaper && paper
      ? `${t(paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
      : hi
        ? 'विगत वर्ष प्रश्न'
        : 'Previous year questions';

  const test = useMemo(
    () =>
      questions.data?.length
        ? pyqTestFromQuestions(questions.data, {
            // Recoverable from the URL, so the result route finds the same
            // attempt in the store that this one just saved.
            id: pyqTestId(selection),
            title: { en: title, hi: title },
            examId: selection.examId ?? '',
            paperId: selection.paperId,
            year: selection.year,
          })
        : null,
    [questions.data, title, selection],
  );

  const onSubmit = useCallback(
    (result: TestResult, attempt: TestAttempt) => {
      // Saved under the paper's id, the way a mock is, so the result route can
      // read it back from the same URL rather than being handed React state
      // that a refresh would lose.
      saveAttempt(attempt);
      saveResult(result);
      markActiveToday();
      router.replace(query ? `/practice/pyq/result?${query}` : '/practice/pyq/result');
    },
    [saveAttempt, saveResult, markActiveToday, router, query],
  );

  return (
    <div className="space-y-4 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      {truncated ? (
        <p className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-light)] px-4 py-3 text-[13px]">
          ⚠️{' '}
          {hi
            ? `${truncated.total} में से पहले ${truncated.shown} प्रश्न इस पेपर में हैं। पूरा सेट देखने हेतु विषय या वर्ष चुनें।`
            : `This paper holds the first ${truncated.shown} of ${truncated.total}. Choose a subject or a year for a complete set.`}
        </p>
      ) : null}

      <AsyncSection
        state={questions}
        lang={lang}
        empty={{
          icon: '📜',
          title: hi ? 'कोई प्रश्न नहीं' : 'No questions',
          body:
            (hi ? reason?.hi : reason?.en) ??
            (hi
              ? 'इस चयन के लिए बैंक में अभी कोई प्रश्न नहीं है।'
              : 'The bank has no questions for this selection yet.'),
        }}
      >
        {() =>
          test ? (
            // Walking your own submitted paper again is review, not a sitting:
            // the answers are already known, so it skips the instructions and
            // shows everything. A fresh sitting asks how it should be sat.
            !review && !mode ? (
              <TestInstructions test={test} onStart={setMode} />
            ) : (
              <TestPlayer
                test={test}
                questions={questions.data ?? []}
                // Reopened from the result: the window refuses a paper it counts
                // as finished, so the submission stamp is cleared to walk it again.
                resume={
                  review && saved ? { ...saved, submittedAt: undefined } : undefined
                }
                onSubmit={onSubmit}
                instantFeedback={review || revealsDuringPaper(mode ?? 'exam')}
              />
            )
          ) : null
        }
      </AsyncSection>
    </div>
  );
}

