import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  formatClock,
  formatCount,
  getQuestion,
  getSubject,
  getTest,
  getTopic,
  matchesSolutionFilter,
  solutionFilterOptions,
  solutionOutcome,
  t,
  testQuestionIds,
  theme,
  UI,
  type SolutionFilter,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, Button, Chip, EmptyState, ProgressBar, s, Stat } from '@/components/ui';
import { QuestionSolution } from '@/components/QuestionSolution';
import { SolutionFilterChips } from '@/components/SolutionFilterChips';

type Tab = 'summary' | 'sections' | 'solutions';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, results, attempts, user, toggleBookmark } = useStore();
  const [tab, setTab] = useState<Tab>('summary');
  // The whole set, in order, is what a learner opens the solutions for: they
  // want to walk the paper. Narrowing to one outcome is one tap away, and is a
  // second pass rather than the first thing they are shown.
  const [filter, setFilter] = useState<SolutionFilter>('all');

  const test = getTest(String(id));
  const result = test ? results[test.id] : undefined;
  const attempt = test ? attempts[test.id] : undefined;

  if (!test || !result) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState
          icon="📊"
          title={lang === 'hi' ? 'अभी कोई परिणाम नहीं' : 'No result yet'}
          body={
            lang === 'hi'
              ? 'यह टेस्ट पूरा करने पर विश्लेषण यहाँ दिखेगा।'
              : 'Finish this test and the analysis appears here.'
          }
        />
      </View>
    );
  }

  const rows = testQuestionIds(test)
    .map((qid) => {
      const question = getQuestion(qid);
      if (!question) return null;
      const selectedIndex = attempt?.answers[qid]?.selectedIndex ?? null;
      return { question, selectedIndex, correct: selectedIndex === question.correctIndex };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Numbered by position in the paper, not position in the filtered list: under
  // "Incorrect" the third wrong answer is still Q17, and renumbering it Q3
  // would send a learner to the wrong question when they go back to it.
  const numbered = rows.map((row, i) => ({
    ...row,
    number: i + 1,
    outcome: solutionOutcome(row.selectedIndex, row.question.correctIndex),
  }));
  const filterOptions = solutionFilterOptions(numbered.map((r) => r.outcome));
  const visible = numbered.filter((r) => matchesSolutionFilter(r.outcome, filter));

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: lang === 'hi' ? 'परिणाम' : 'Result' }} />

      <View
        style={{
          backgroundColor: result.qualified ? theme.color.primary : theme.color.danger,
          borderRadius: theme.radius.xl,
          padding: theme.space.xl,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.sm }} numberOfLines={1}>
          {t(test.title, lang)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 }}>
          <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900' }}>{result.score}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '700', paddingBottom: 6 }}>
            / {result.maxScore}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: theme.radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                fontWeight: '800',
                fontSize: theme.font.xs,
                color: result.qualified ? theme.color.primaryDark : theme.color.danger,
              }}
            >
              {result.qualified ? t(UI.qualified, lang) : t(UI.notQualified, lang)} ·{' '}
              {lang === 'hi' ? 'कट-ऑफ' : 'cut-off'} {result.cutoff}%
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: theme.radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: theme.font.xs }}>
              {result.percentage}%
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.lg }}>
        <Stat label={t(UI.rank, lang)} value={`#${formatCount(result.rank)}`} color={theme.color.accent} />
        <Stat label={t(UI.percentile, lang)} value={String(result.percentile)} color={theme.color.primary} />
        <Stat label={t(UI.accuracy, lang)} value={`${result.accuracy}%`} />
        <Stat label={lang === 'hi' ? 'समय' : 'Time'} value={formatClock(result.totalTimeMs)} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.space.sm }}>
        <Stat label={t(UI.correct, lang)} value={String(result.correct)} color={theme.color.success} />
        <Stat label={t(UI.incorrect, lang)} value={String(result.incorrect)} color={theme.color.danger} />
        <Stat label={t(UI.unattempted, lang)} value={String(result.skipped)} />
      </View>

      <View style={{ flexDirection: 'row', marginTop: theme.space.lg }}>
        <Chip
          label={lang === 'hi' ? 'सारांश' : 'Summary'}
          active={tab === 'summary'}
          onPress={() => setTab('summary')}
        />
        <Chip
          label={lang === 'hi' ? 'खंड विश्लेषण' : 'Sections'}
          active={tab === 'sections'}
          onPress={() => setTab('sections')}
        />
        <Chip
          label={lang === 'hi' ? 'हल' : 'Solutions'}
          active={tab === 'solutions'}
          onPress={() => setTab('solutions')}
        />
      </View>

      {tab === 'summary' ? (
        <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
          <View style={[s.card, { padding: theme.space.lg }]}>
            <Text style={s.h2}>{lang === 'hi' ? 'आपके कमजोर टॉपिक' : 'Your weak topics'}</Text>
            {result.weakTopics.length ? (
              result.weakTopics.map((tp) => {
                const topic = getTopic(tp.topicId);
                return (
                  <Pressable
                    key={tp.topicId}
                    onPress={() => router.push(`/practice/topic/${tp.topicId}`)}
                    style={{ marginTop: 12 }}
                  >
                    <View style={[s.row, { justifyContent: 'space-between' }]}>
                      <Text style={{ fontSize: theme.font.sm, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                        {topic ? t(topic.name, lang) : tp.topicId}
                      </Text>
                      <Text style={{ color: theme.color.danger, fontWeight: '800', fontSize: theme.font.sm }}>
                        {tp.accuracy}%
                      </Text>
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <ProgressBar value={tp.accuracy} color={theme.color.danger} />
                    </View>
                    <Text style={{ color: theme.color.primary, fontSize: theme.font.xs, fontWeight: '700', marginTop: 5 }}>
                      {lang === 'hi' ? 'इस टॉपिक का अभ्यास करें →' : 'Practise this topic →'}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={[s.muted, { marginTop: 8 }]}>
                {lang === 'hi'
                  ? 'कोई कमजोर टॉपिक नहीं मिला।'
                  : 'No weak topics — everything is above 60%.'}
              </Text>
            )}
          </View>

          <View style={[s.card, { padding: theme.space.lg }]}>
            <Text style={s.h2}>{lang === 'hi' ? 'कोहॉर्ट में स्थिति' : 'Where you stand'}</Text>
            <Text style={[s.muted, { marginTop: 8 }]}>
              {lang === 'hi'
                ? `${formatCount(result.totalCandidates)} अभ्यर्थियों में रैंक #${formatCount(result.rank)} — ${result.percentile} पर्सेंटाइल।`
                : `Ranked #${formatCount(result.rank)} of ${formatCount(result.totalCandidates)} — ${result.percentile} percentile.`}
            </Text>
            <View style={{ marginTop: 12 }}>
              <ProgressBar value={result.percentile} color={theme.color.accent} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={t(UI.reattempt, lang)}
              variant="outline"
              onPress={() => router.push(`/test/${test.id}/attempt`)}
              style={{ flex: 1 }}
            />
            <Button
              label={t(UI.viewSolutions, lang)}
              onPress={() => setTab('solutions')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : null}

      {tab === 'sections' ? (
        <View style={[s.card, { marginTop: theme.space.lg }]}>
          {result.subjectScores.map((sc) => {
            const subject = getSubject(sc.subjectId);
            const pct = sc.maxScore ? Math.round((sc.score / sc.maxScore) * 100) : 0;
            return (
              <View
                key={sc.subjectId}
                style={{ padding: theme.space.lg, borderBottomWidth: 1, borderBottomColor: theme.color.border }}
              >
                <View style={[s.row, { gap: 8 }]}>
                  <Text style={{ fontSize: 18 }}>{subject?.icon}</Text>
                  <Text style={{ flex: 1, fontWeight: '700', fontSize: theme.font.base }}>
                    {subject ? t(subject.name, lang) : sc.subjectId}
                  </Text>
                  <Text style={{ fontWeight: '800' }}>
                    {sc.score}/{sc.maxScore}
                  </Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar value={pct} color={subject?.color ?? theme.color.primary} />
                </View>
                <Text style={[s.faint, { marginTop: 6 }]}>
                  ✅ {sc.correct} · ❌ {sc.incorrect} · ⏭ {sc.skipped} · 🎯 {sc.accuracy}% · ⏱{' '}
                  {formatClock(sc.timeSpentMs)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {tab === 'solutions' ? (
        <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
          <SolutionFilterChips
            options={filterOptions}
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
                selectedIndex={row.selectedIndex}
                lang={lang}
              />
            ))
          ) : (
            <EmptyState
              icon="🎉"
              title={lang === 'hi' ? 'सब सही!' : 'All correct!'}
              body={
                lang === 'hi'
                  ? 'इस टेस्ट में कोई गलत उत्तर नहीं।'
                  : 'No wrong answers in this test.'
              }
            />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
