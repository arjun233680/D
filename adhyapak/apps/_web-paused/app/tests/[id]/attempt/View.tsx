'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import {
  createAttemptSync,
  getQuestion,
  getTest,
  revealsDuringPaper,
  testQuestionIds,
  type SolutionMode,
  type Question,
  type TestAttempt,
  type TestResult,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestPlayer } from '@/components/TestPlayer';
import { TestInstructions } from '@/components/TestInstructions';

/**
 * A seeded mock, sat.
 *
 * The window itself is `TestPlayer`, shared with previous-year papers. This
 * page only supplies the things that are specific to a mock: which test, where
 * its questions come from (the bundled bank), where submitting leads — and, now,
 * mirroring the sitting to the server.
 *
 * That last part is what makes the result mean anything beside other people's.
 * `submit_attempt` computes the rank, the percentile and whether the cut-off was
 * cleared against everyone else who has sat the paper, and it had no rows to do
 * it from because nothing ever wrote an attempt. When there is no backend, no
 * account, or no such test in the database, the sync quietly does nothing and
 * the local grade stands.
 */
export default function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { attempts, lang, saveAttempt, saveResult, markActiveToday } = useStore();

  const test = getTest(id);
  /**
   * Null until the candidate has read the instructions and chosen how to sit
   * the paper. The clock does not start before that — a timer running behind an
   * instructions page is time taken from somebody who was still reading.
   */
  const [mode, setMode] = useState<SolutionMode | null>(null);

  // Built in an effect rather than during render: a ref must not be written
  // while rendering, and this one is read from callbacks only.
  //
  // Recreating it — which switching language mid-paper does — is safe on
  // purpose. `startAttempt` resumes the unsubmitted attempt rather than opening
  // a second one, so the worst case is that every answer so far is sent again.
  const sync = useRef<ReturnType<typeof createAttemptSync> | null>(null);

  useEffect(() => {
    if (!test) return;
    const live = createAttemptSync(test, lang);
    sync.current = live;
    void live.open();
    return () => {
      if (sync.current === live) sync.current = null;
    };
  }, [test, lang]);

  const questions = useMemo(
    (): Question[] =>
      test
        ? testQuestionIds(test)
            .map((qid) => getQuestion(qid))
            .filter((q): q is Question => Boolean(q))
        : [],
    [test],
  );

  const onAttemptChange = useCallback(
    (attempt: TestAttempt) => {
      saveAttempt(attempt);
      sync.current?.record(attempt);
    },
    [saveAttempt],
  );

  const onSubmit = useCallback(
    (result: TestResult, attempt: TestAttempt) => {
      saveAttempt(attempt);
      // The local grade is saved first and the screen moves on it. Waiting for
      // the server before showing a score would put a network round trip
      // between pressing Submit and finding out how you did, and the two agree
      // on everything except the rank — which is the part that cannot be
      // computed on a device at all.
      saveResult(result);
      markActiveToday();
      router.replace(`/tests/${id}/result`);

      void sync.current?.submit().then((graded) => {
        if (graded) saveResult(graded);
      });
    },
    [id, saveAttempt, saveResult, markActiveToday, router],
  );

  if (!test) notFound();

  if (!mode) return <TestInstructions test={test} onStart={setMode} />;

  return (
    <TestPlayer
      test={test}
      questions={questions}
      resume={attempts[test.id]}
      onAttemptChange={onAttemptChange}
      onSubmit={onSubmit}
      // The candidate's own choice, made before the clock started. `exam`
      // withholds the answer and the explanation until the paper is submitted.
      instantFeedback={revealsDuringPaper(mode)}
    />
  );
}
