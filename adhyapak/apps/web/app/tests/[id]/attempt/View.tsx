'use client';

import { use, useCallback, useMemo } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { getQuestion, getTest, testQuestionIds, type Question } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestPlayer } from '@/components/TestPlayer';

/**
 * A seeded mock, sat.
 *
 * The window itself is `TestPlayer`, shared with previous-year papers. This
 * page only supplies the three things that are specific to a mock: which test,
 * where its questions come from (the bundled bank), and where submitting leads.
 */
export default function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { attempts, saveAttempt, saveResult, markActiveToday } = useStore();

  const test = getTest(id);

  const questions = useMemo(
    (): Question[] =>
      test
        ? testQuestionIds(test)
            .map((qid) => getQuestion(qid))
            .filter((q): q is Question => Boolean(q))
        : [],
    [test],
  );

  const onSubmit = useCallback(
    (result: Parameters<typeof saveResult>[0], attempt: Parameters<typeof saveAttempt>[0]) => {
      saveAttempt(attempt);
      saveResult(result);
      markActiveToday();
      router.replace(`/tests/${id}/result`);
    },
    [id, saveAttempt, saveResult, markActiveToday, router],
  );

  if (!test) notFound();

  return (
    <TestPlayer
      test={test}
      questions={questions}
      resume={attempts[test.id]}
      onAttemptChange={saveAttempt}
      onSubmit={onSubmit}
    />
  );
}
