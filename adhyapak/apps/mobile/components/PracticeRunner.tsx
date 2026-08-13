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

/** Instant-feedback practice — the mobile twin of the web PracticeRunner. */
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
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<PracticeSessionResult[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

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
              setSelected(null);
              setRevealed(false);
              setResults([]);
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
  const subject = getSubject(question.subjectId);
  const topic = getTopic(question.topicId);
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);

  const answer = (optionIndex: number) => {
    if (revealed) return;
    setSelected(optionIndex);
    setRevealed(true);
    setResults((prev) => [
      ...prev,
      {
        questionId: question.id,
        selectedIndex: optionIndex,
        correct: optionIndex === question.correctIndex,
        timeSpentMs: Date.now() - startedAt,
      },
    ]);
    markActiveToday();
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
    setStartedAt(Date.now());
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
            <ProgressBar value={((index + (revealed ? 1 : 0)) / questions.length) * 100} />
          </View>
          <Text style={{ color: theme.color.success, fontWeight: '800', fontSize: theme.font.sm }}>
            {summary.correct} ✓
          </Text>
        </View>

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
              <Text style={[s.faint, { marginTop: 8 }]}>
                {Math.round(question.accuracy * 100)}%{' '}
                {lang === 'hi' ? 'ने सही किया' : 'got this right'} ·{' '}
                {question.avgTimeSeconds}s {lang === 'hi' ? 'औसत' : 'avg'}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: theme.space.lg,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          backgroundColor: theme.color.surface,
        }}
      >
        {!revealed ? (
          <Button
            label={lang === 'hi' ? 'छोड़ें' : 'Skip'}
            variant="outline"
            onPress={() => {
              setResults((prev) => [
                ...prev,
                {
                  questionId: question.id,
                  selectedIndex: null,
                  correct: false,
                  timeSpentMs: Date.now() - startedAt,
                },
              ]);
              next();
            }}
            style={{ flex: 1 }}
          />
        ) : null}
        <Button
          label={
            index + 1 >= questions.length
              ? lang === 'hi'
                ? 'परिणाम देखें'
                : 'See result'
              : lang === 'hi'
                ? 'अगला प्रश्न'
                : 'Next question'
          }
          disabled={!revealed}
          onPress={next}
          style={{ flex: 2 }}
        />
      </View>
    </View>
  );
}
