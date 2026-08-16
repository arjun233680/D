import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  formatCount,
  getExam,
  getSubject,
  getTest,
  t,
  testQuestionCount,
  theme,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, Button, EmptyState, s, Stat } from '@/components/ui';

export default function TestIntroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, attempts, results } = useStore();
  const test = getTest(String(id));

  if (!test) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState
          icon="🎯"
          title={lang === 'hi' ? 'नहीं मिला' : 'Not found'}
          body={lang === 'hi' ? 'यह टेस्ट अब मौजूद नहीं है।' : 'This test no longer exists.'}
        />
      </View>
    );
  }

  const exam = getExam(test.examId);
  const saved = attempts[test.id];
  const inProgress = saved && !saved.submittedAt && saved.remainingMs > 0;
  const result = results[test.id];
  const count = testQuestionCount(test);

  return (
    <View style={s.screen}>
    <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 120 }}>
      <Stack.Screen options={{ title: exam?.shortName ?? 'Test' }} />

      <View style={[s.card, { padding: theme.space.xl }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Badge tone="accent">{exam?.shortName}</Badge>
          <AccessBadge access={test.access} lang={lang} />
          {test.negativeMarking > 0 ? (
            <Badge tone="danger">
              −{test.negativeMarking} {lang === 'hi' ? 'प्रति गलत' : 'per wrong'}
            </Badge>
          ) : (
            <Badge tone="success">{lang === 'hi' ? 'ऋणात्मक अंकन नहीं' : 'No negative marking'}</Badge>
          )}
        </View>
        <Text style={[s.h1, { marginTop: 10 }]}>{t(test.title, lang)}</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
          <Stat label={lang === 'hi' ? 'प्रश्न' : 'Questions'} value={String(count)} />
          <Stat label={lang === 'hi' ? 'अंक' : 'Marks'} value={String(count * test.marksPerQuestion)} />
          <Stat label={lang === 'hi' ? 'अवधि' : 'Duration'} value={`${test.durationMinutes}m`} />
        </View>
      </View>

      <View style={[s.card, { padding: theme.space.xl, marginTop: theme.space.lg }]}>
        <Text style={s.h2}>
          {lang === 'hi' ? 'खंड' : 'Sections'} ({test.sections.length})
        </Text>
        {test.sections.map((sec) => {
          const subject = getSubject(sec.subjectId);
          return (
            <View
              key={sec.id}
              style={[s.row, { gap: theme.space.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.color.border, marginTop: 10 }]}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: theme.radius.sm,
                  backgroundColor: `${subject?.color ?? theme.color.accent}1a`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16 }}>{subject?.icon ?? '📘'}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: theme.font.sm, fontWeight: '600' }}>
                {t(sec.name, lang)}
              </Text>
              <Text style={s.faint}>
                {sec.questionIds.length} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[s.card, { padding: theme.space.xl, marginTop: theme.space.lg }]}>
        <Text style={s.h2}>{lang === 'hi' ? 'निर्देश' : 'Instructions'}</Text>
        {test.instructions.map((ins, i) => (
          <View key={ins.en} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Text style={[s.faint, { fontWeight: '800' }]}>{i + 1}.</Text>
            <Text style={[s.body, { flex: 1, fontSize: theme.font.sm }]}>{t(ins, lang)}</Text>
          </View>
        ))}
      </View>

      {result ? (
        <View style={[s.card, { padding: theme.space.xl, marginTop: theme.space.lg }]}>
          <Text style={s.h2}>{lang === 'hi' ? 'पिछला परिणाम' : 'Last result'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Stat
              label={t(UI.score, lang)}
              value={`${result.score}/${result.maxScore}`}
              color={result.qualified ? theme.color.success : theme.color.danger}
            />
            <Stat label={t(UI.accuracy, lang)} value={`${result.accuracy}%`} />
            {result.rank !== undefined ? (
              <Stat
                label={t(UI.rank, lang)}
                value={`#${formatCount(result.rank)}`}
                color={theme.color.accent}
              />
            ) : null}
          </View>
          <Button
            label={lang === 'hi' ? 'पूरा विश्लेषण देखें' : 'View full analysis'}
            variant="outline"
            onPress={() => router.push(`/test/${test.id}/result`)}
            style={{ marginTop: 12 }}
          />
        </View>
      ) : null}

    </ScrollView>

    {/* The one action this screen exists for stays reachable at every scroll
        position — on a 1440px display the sections list pushed it below the
        fold with nothing hinting there was more page. */}
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: theme.space.lg,
        paddingBottom: theme.space.xl,
        backgroundColor: theme.color.surface,
        borderTopWidth: 1,
        borderTopColor: theme.color.border,
      }}
    >
      <Button
        label={inProgress ? t(UI.resumeTest, lang) : t(UI.startTest, lang)}
        onPress={() => router.push(`/test/${test.id}/attempt`)}
      />
    </View>
    </View>
  );
}
