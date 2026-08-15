import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  getSubject,
  getTopic,
  summarisePractice,
  t,
  theme,
  UI,
  type PracticeSessionResult,
  type Question,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, Button, EmptyState, ProgressBar, s, Stat } from '@/components/ui';

/**
 * Instant-feedback practice — the mobile twin of the web PracticeRunner.
 *
 * Every question in the set is reachable from the palette, so the answers live
 * in a map keyed by question id: an append-only list would count a revisited
 * question twice.
 */

/** What the learner did with one question. Absent means not yet reached. */
interface Answer {
  /** null when skipped — a real answer, distinct from "not attempted". */
  selectedIndex: number | null;
  correct: boolean;
  timeSpentMs: number;
}

type PaletteStatus = 'correct' | 'wrong' | 'skipped' | 'unseen';

const statusOf = (answer: Answer | undefined): PaletteStatus =>
  answer === undefined
    ? 'unseen'
    : answer.selectedIndex === null
      ? 'skipped'
      : answer.correct
        ? 'correct'
        : 'wrong';

export function PracticeRunner({
  questions,
  title,
  subtitle,
}: {
  questions: Question[];
  title: string;
  subtitle?: string;
}) {
  const { lang, user, toggleBookmark, markActiveToday } = useStore();
  const hi = lang === 'hi';
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // One result per answered question, in the set's own order — so the summary
  // does not depend on the order the learner jumped around in.
  const results = useMemo<PracticeSessionResult[]>(
    () =>
      questions.flatMap((q) => {
        const answer = answers[q.id];
        return answer ? [{ questionId: q.id, ...answer }] : [];
      }),
    [questions, answers],
  );
  const summary = useMemo(() => summarisePractice(questions, results), [questions, results]);

  if (!questions.length) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <Stack.Screen options={{ title }} />
        <EmptyState
          icon="✍️"
          title={lang === 'hi' ? 'यहाँ अभी प्रश्न नहीं हैं' : 'No questions here yet'}
          body={
            lang === 'hi'
              ? 'दूसरा विषय या टॉपिक चुनें।'
              : 'Pick another subject or topic.'
          }
        />
      </View>
    );
  }

  if (finished) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg }}>
        <Stack.Screen options={{ title }} />
        <View style={{ backgroundColor: theme.color.ink, borderRadius: theme.radius.xl, padding: theme.space.xl }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: theme.font.sm }}>{title}</Text>
          <Text style={{ color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 6 }}>
            {summary.correct}
            <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)' }}>/{summary.attempted}</Text>
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.sm, marginTop: 6 }}>
            {lang === 'hi'
              ? `शुद्धता ${summary.accuracy}% · औसत ${summary.avgTimeSeconds}s`
              : `${summary.accuracy}% accuracy · ${summary.avgTimeSeconds}s average`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
          <Stat label={t(UI.correct, lang)} value={String(summary.correct)} color={theme.color.success} />
          <Stat label={t(UI.incorrect, lang)} value={String(summary.incorrect)} color={theme.color.danger} />
          <Stat label={t(UI.accuracy, lang)} value={`${summary.accuracy}%`} color={theme.color.accent} />
        </View>

        {summary.reviseTopicIds.length ? (
          <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.lg }]}>
            <Text style={s.h2}>{lang === 'hi' ? 'इन्हें दोहराएँ' : 'Revise these'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {summary.reviseTopicIds.map((topicId) => {
                const topic = getTopic(topicId);
                return (
                  <Pressable
                    key={topicId}
                    onPress={() => router.replace(`/practice/topic/${topicId}`)}
                    style={{
                      backgroundColor: theme.color.dangerLight,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: theme.color.danger, fontWeight: '700', fontSize: theme.font.xs }}>
                      {topic ? t(topic.name, lang) : topicId}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
          <Button
            label={lang === 'hi' ? 'वापस' : 'Back'}
            variant="outline"
            onPress={() => router.back()}
            style={{ flex: 1 }}
          />
          <Button
            label={t(UI.reattempt, lang)}
            onPress={() => {
              setIndex(0);
              setAnswers({});
              setFinished(false);
              setStartedAt(Date.now());
            }}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    );
  }

  const question = questions[index]!;
  const current = answers[question.id];
  const revealed = current !== undefined;
  const selected = current?.selectedIndex ?? null;
  const subject = getSubject(question.subjectId);
  const topic = getTopic(question.topicId);
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);
  const answeredCount = results.length;

  const record = (selectedIndex: number | null) =>
    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        selectedIndex,
        correct: selectedIndex === question.correctIndex,
        timeSpentMs: Date.now() - startedAt,
      },
    }));

  const answer = (optionIndex: number) => {
    if (revealed) return;
    record(optionIndex);
    markActiveToday();
  };

  const goTo = (to: number) => {
    setIndex(to);
    setStartedAt(Date.now());
    setPaletteOpen(false);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    goTo(index + 1);
  };

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 24 }}>
        {subtitle ? <Text style={s.faint}>{subtitle}</Text> : null}

        <View style={[s.row, { gap: theme.space.md, marginTop: 10 }]}>
          <Text style={{ fontWeight: '800', fontSize: theme.font.sm }}>
            {index + 1}
            <Text style={{ color: theme.color.textFaint }}>/{questions.length}</Text>
          </Text>
          <View style={{ flex: 1 }}>
            <ProgressBar value={(answeredCount / questions.length) * 100} />
          </View>
          <Text style={{ color: theme.color.success, fontWeight: '800', fontSize: theme.font.sm }}>
            {summary.correct} ✓
          </Text>
          {/* The whole set, one tap away — the same palette the daily quiz has.
              A phone has no room for a permanent sidebar, so it folds. */}
          <Pressable
            onPress={() => setPaletteOpen((open) => !open)}
            accessibilityLabel={hi ? 'सभी प्रश्न' : 'All questions'}
            style={{
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: theme.font.xs, fontWeight: '700' }}>
              {paletteOpen ? '✕' : '☰'} {answeredCount}/{questions.length}
            </Text>
          </Pressable>
        </View>

        {paletteOpen ? (
          <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.md }]}>
            <Palette
              questions={questions}
              answers={answers}
              currentIndex={index}
              onGo={goTo}
              onFinish={() => setFinished(true)}
              lang={lang}
            />
          </View>
        ) : null}

        <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.lg }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {subject ? (
              <Badge tone="neutral">
                {subject.icon} {t(subject.name, lang)}
              </Badge>
            ) : null}
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
              {question.difficulty}
            </Badge>
            {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => toggleBookmark(question.id)}>
              <Text style={{ fontSize: 16 }}>{bookmarked ? '🔖' : '📑'}</Text>
            </Pressable>
          </View>

          <Text style={{ fontSize: theme.font.md, fontWeight: '600', lineHeight: 25, marginTop: 12 }}>
            {t(question.text, lang)}
          </Text>

          <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
            {question.options.map((opt, i) => {
              const isCorrect = i === question.correctIndex;
              const isChosen = i === selected;
              const show = revealed && (isCorrect || isChosen);
              return (
                <Pressable
                  key={i}
                  onPress={() => answer(i)}
                  disabled={revealed}
                  style={{
                    flexDirection: 'row',
                    gap: theme.space.md,
                    borderWidth: 1,
                    borderRadius: theme.radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    borderColor: show
                      ? isCorrect
                        ? theme.color.success
                        : theme.color.danger
                      : theme.color.border,
                    backgroundColor: show
                      ? isCorrect
                        ? theme.color.successLight
                        : theme.color.dangerLight
                      : theme.color.surface,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: show
                        ? isCorrect
                          ? theme.color.success
                          : theme.color.danger
                        : theme.color.borderStrong,
                      backgroundColor: show
                        ? isCorrect
                          ? theme.color.success
                          : theme.color.danger
                        : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.xs,
                        fontWeight: '800',
                        color: show ? '#fff' : theme.color.textMuted,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: theme.font.base, lineHeight: 22 }}>
                    {t(opt, lang)}
                  </Text>
                  {show ? <Text>{isCorrect ? '✅' : '❌'}</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {revealed ? (
            <View
              style={{
                marginTop: theme.space.lg,
                backgroundColor: theme.color.surfaceAlt,
                borderRadius: theme.radius.md,
                padding: 14,
              }}
            >
              <Text style={[s.faint, { fontWeight: '800' }]}>
                {t(UI.explanation, lang).toUpperCase()}
              </Text>
              <Text style={{ fontSize: theme.font.sm, lineHeight: 21, marginTop: 6 }}>
                {t(question.explanation, lang)}
              </Text>
              {/* A cohort line sat here, reading off seed values. No
                  cohort has answered these questions yet. */}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Skip and Next sit bottom right, where the thumb already is after
          tapping an option. Back stays hard left so the two are not adjacent
          targets on a phone. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: theme.space.lg,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          backgroundColor: theme.color.surface,
        }}
      >
        {index > 0 ? (
          <Button label="←" variant="outline" onPress={() => goTo(index - 1)} style={{ width: 60 }} />
        ) : null}
        <View style={{ flex: 1 }} />
        {!revealed ? (
          <Button
            label={hi ? 'छोड़ें' : 'Skip'}
            variant="outline"
            onPress={() => {
              record(null);
              next();
            }}
            style={{ paddingHorizontal: 22 }}
          />
        ) : null}
        <Button
          label={
            index + 1 >= questions.length
              ? hi
                ? 'परिणाम देखें'
                : 'See result'
              : hi
                ? 'अगला प्रश्न'
                : 'Next question'
          }
          disabled={!revealed}
          onPress={next}
          style={{ paddingHorizontal: 26 }}
        />
      </View>
    </View>
  );
}

/**
 * Every question in the set, as a grid of numbers.
 *
 * Colour is the outcome, not just "visited": a learner scanning for what to
 * revise wants the wrong ones, and the test player's answered/not-answered
 * split cannot express that because a test hides its marking until submission.
 */
function Palette({
  questions,
  answers,
  currentIndex,
  onGo,
  onFinish,
  lang,
}: {
  questions: Question[];
  answers: Record<string, Answer>;
  currentIndex: number;
  onGo: (index: number) => void;
  onFinish: () => void;
  lang: 'en' | 'hi';
}) {
  const hi = lang === 'hi';
  const colour: Record<PaletteStatus, string> = {
    correct: theme.color.success,
    wrong: theme.color.danger,
    skipped: theme.color.warning,
    unseen: theme.color.borderStrong,
  };

  const tally: Record<PaletteStatus, number> = { correct: 0, wrong: 0, skipped: 0, unseen: 0 };
  for (const q of questions) tally[statusOf(answers[q.id])] += 1;

  const legend: { status: PaletteStatus; label: string }[] = [
    { status: 'correct', label: hi ? 'सही' : 'Correct' },
    { status: 'wrong', label: hi ? 'ग़लत' : 'Wrong' },
    { status: 'skipped', label: hi ? 'छोड़े' : 'Skipped' },
    { status: 'unseen', label: hi ? 'बाकी' : 'Left' },
  ];

  return (
    <View>
      <Text style={s.title}>{hi ? 'सभी प्रश्न' : 'All questions'}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {legend.map((item) => (
          <View key={item.status} style={[s.row, { gap: 6 }]}>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                backgroundColor: colour[item.status],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '800',
                  color: item.status === 'unseen' ? theme.color.text : '#fff',
                }}
              >
                {tally[item.status]}
              </Text>
            </View>
            <Text style={s.faint}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        {questions.map((q, i) => {
          const status = statusOf(answers[q.id]);
          return (
            <Pressable
              key={q.id}
              onPress={() => onGo(i)}
              style={{
                width: 36,
                height: 32,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colour[status],
                borderWidth: i === currentIndex ? 2 : 0,
                borderColor: theme.color.ink,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '800',
                  color: status === 'unseen' ? theme.color.text : '#fff',
                }}
              >
                {i + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label={hi ? 'परिणाम देखें' : 'See result'}
        variant="dark"
        onPress={onFinish}
        style={{ marginTop: 14 }}
      />
    </View>
  );
}
