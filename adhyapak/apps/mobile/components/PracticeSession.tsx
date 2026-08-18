import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  matchesSolutionFilter,
  pyqTestFromQuestions,
  revealsDuringPaper,
  solutionFilterOptions,
  solutionOutcome,
  t,
  theme,
  UI,
  type Question,
  type SolutionFilter,
  type SolutionMode,
  type TestAttempt,
  type TestResult,
} from '@adhyapak/core';
import { isCorrectAnswer, OPTION_LABELS, inLang } from '@adhyapak/core';
import type { OptionLabel } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestPlayer } from '@/components/TestPlayer';
import { TestInstructions } from '@/components/TestInstructions';
import { QuestionSolution } from '@/components/QuestionSolution';
import { SolutionFilterChips } from '@/components/SolutionFilterChips';
import { Button, EmptyState, s, Stat } from '@/components/ui';

/**
 * Any set of questions, sat in the exam window and then reviewed.
 *
 * The mobile twin of the website's PracticeSession, and the same argument:
 * subject practice, topic practice and bookmarks used to run an instant-
 * feedback runner while mocks and previous-year papers ran the exam window,
 * which is two different products for the same act.
 *
 * The set is assembled into a `Test` because that is what the window and the
 * grader take. It is never saved to the store — a topic drill is not a mock,
 * and a half-finished one should not reappear as a resumable paper.
 */
export function PracticeSession({
  questions,
  title,
  examId = '',
  empty,
  chooseMode = false,
}: {
  questions: Question[];
  title: string;
  examId?: string;
  /**
   * What to say when the set is empty. The default is written for subject and
   * topic practice, where picking a different one is the fix. Bookmarks are the
   * reason this is a prop: that screen has no subject to pick, and telling
   * somebody with no bookmarks to "pick another subject" is advice they cannot
   * act on.
   */
  empty?: { title: string; body: string };
  /**
   * Ask how the set should be sat before starting it.
   *
   * On for a previous-year paper, which is a paper and deserves the same choice
   * a mock gets. Off for a subject or topic drill, where instant marking is the
   * whole point of the exercise and an instructions page in front of fifteen
   * questions is a toll booth.
   */
  chooseMode?: boolean;
}) {
  const { lang, markActiveToday } = useStore();
  const hi = lang === 'hi';
  const [done, setDone] = useState<{ result: TestResult; attempt: TestAttempt } | null>(null);
  const [filter, setFilter] = useState<SolutionFilter>('all');
  // Null only while the choice is still to be made; a drill never asks.
  const [mode, setMode] = useState<SolutionMode | null>(chooseMode ? null : 'guided');
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
    },
    [markActiveToday],
  );

  if (!questions.length) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState
          icon="✍️"
          title={empty?.title ?? (hi ? 'यहाँ अभी प्रश्न नहीं हैं' : 'No questions here yet')}
          body={
            empty?.body ?? (hi ? 'दूसरा विषय या टॉपिक चुनें।' : 'Pick another subject or topic.')
          }
        />
      </View>
    );
  }

  if (!mode) return <TestInstructions test={test} onStart={setMode} />;

  if (!done) {
    return (
      <TestPlayer
        test={test}
        questions={questions}
        resume={resume}
        onSubmit={onSubmit}
        instantFeedback={revealsDuringPaper(mode)}
      />
    );
  }

  const rows = questions.map((question, i) => {
    const selectedOption = done.attempt.answers[question.id]?.selectedOption ?? null;
    return {
      question,
      number: i + 1,
      selectedOption,
      timeSpentMs: done.attempt.answers[question.id]?.timeSpentMs ?? 0,
      outcome: solutionOutcome(selectedOption, question),
    };
  });
  const options = solutionFilterOptions(rows.map((r) => r.outcome));
  const visible = rows.filter((r) => matchesSolutionFilter(r.outcome, filter));

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg }}>
      <View
        style={{
          backgroundColor: theme.color.ink,
          borderRadius: theme.radius.xl,
          padding: theme.space.xl,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: theme.font.sm }}>{title}</Text>
        <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 6 }}>
          {done.result.score}
          <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>
            /{done.result.maxScore}
          </Text>
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.sm, marginTop: 6 }}>
          {hi
            ? `शुद्धता ${done.result.accuracy}% · ${done.result.attempted} प्रश्न किए`
            : `${done.result.accuracy}% accuracy · ${done.result.attempted} attempted`}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
        <Stat
          label={t(UI.correct, lang)}
          value={String(done.result.correct)}
          color={theme.color.success}
        />
        <Stat
          label={t(UI.incorrect, lang)}
          value={String(done.result.incorrect)}
          color={theme.color.danger}
        />
        <Stat label={t(UI.unattempted, lang)} value={String(done.result.skipped)} />
      </View>

      <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
        <Text style={s.h2}>{hi ? 'हल' : 'Solutions'}</Text>
        <SolutionFilterChips options={options} value={filter} onChange={setFilter} lang={lang} />

        {visible.length ? (
          visible.map((row) => (
            <QuestionSolution
              key={row.question.id}
              question={row.question}
              number={row.number}
              selectedOption={row.selectedOption}
              lang={lang}
              footer={
                <Text style={[s.faint, { marginTop: 8 }]}>
                  {hi ? 'आपका समय' : 'Your time'}: {Math.round(row.timeSpentMs / 1000)}s
                </Text>
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
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
        <Button
          label={hi ? 'वापस' : 'Back'}
          variant="outline"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
        {/* Back into the paper with every answer intact — the marking is on the
            questions too. `submittedAt` is cleared because the window refuses to
            reopen a paper it counts as finished. */}
        <Button
          label={hi ? 'प्रश्नों पर' : 'Questions'}
          variant="outline"
          onPress={() => {
            setResume({ ...done.attempt, submittedAt: undefined });
            setDone(null);
          }}
          style={{ flex: 1 }}
        />
        <Button
          label={t(UI.reattempt, lang)}
          onPress={() => {
            setResume(undefined);
            setDone(null);
          }}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}
