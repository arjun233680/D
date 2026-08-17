import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { s } from '@/components/ui';

/**
 * A seeded mock, sat.
 *
 * The window itself is `TestPlayer`, shared with previous-year papers. This
 * screen only supplies what is specific to a mock: which test, where its
 * questions come from (the bundled bank), where submitting leads — and
 * mirroring the sitting to the server.
 *
 * The rank and percentile on the result come from `submit_attempt`, which
 * compares this sitting against every other one of the same paper. Nothing ever
 * wrote an attempt, so it had nothing to compare against. Offline, signed out,
 * or on a bundled test the database has never heard of, the sync does nothing
 * and the local grade stands.
 */
export default function AttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, attempts, saveAttempt, saveResult, markActiveToday } = useStore();

  const test = getTest(String(id));

  // Built in an effect rather than during render: a ref must not be written
  // while rendering, and this one is read from callbacks only.
  //
  // Recreating it — which switching language mid-paper does — is safe on
  // purpose. `startAttempt` resumes the unsubmitted attempt rather than opening
  // a second one, so the worst case is that every answer so far is sent again.
  /**
   * Null until the candidate has read the instructions and chosen how to sit
   * the paper. The clock does not start before that — a timer running behind an
   * instructions page takes time from somebody who was still reading.
   */
  const [mode, setMode] = useState<SolutionMode | null>(null);

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
      // The local grade lands first and the screen moves on it: putting a
      // network round trip between Submit and a score would be the worst place
      // in the app to wait. The two agree on everything but the rank, which no
      // device can compute.
      saveResult(result);
      markActiveToday();
      router.replace(`/test/${String(id)}/result`);

      void sync.current?.submit().then((graded) => {
        if (graded) saveResult(graded);
      });
    },
    [id, saveAttempt, saveResult, markActiveToday],
  );

  if (!test) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.muted}>{lang === 'hi' ? 'यह टेस्ट नहीं मिला।' : 'That test was not found.'}</Text>
      </View>
    );
  }

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
