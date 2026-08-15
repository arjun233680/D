import { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getQuestion, getTest, testQuestionIds, type Question } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestPlayer } from '@/components/TestPlayer';
import { s } from '@/components/ui';

/**
 * A seeded mock, sat.
 *
 * The window itself is `TestPlayer`, shared with previous-year papers. This
 * screen only supplies what is specific to a mock: which test, where its
 * questions come from (the bundled bank), and where submitting leads.
 */
export default function AttemptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, attempts, saveAttempt, saveResult, markActiveToday } = useStore();

  const test = getTest(String(id));

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
      router.replace(`/test/${String(id)}/result`);
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
