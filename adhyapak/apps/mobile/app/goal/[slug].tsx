import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  BATCHES,
  NOTES,
  TESTS,
  VIDEOS,
  formatCount,
  getExamBySlug,
  getSubject,
  t,
  theme,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { BatchCard, NoteCard, TestCard, VideoCard } from '@/components/cards';
import { Badge, Button, EmptyState, s, SectionHeader } from '@/components/ui';

export default function GoalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, user, setGoal } = useStore();
  const [paperIndex, setPaperIndex] = useState(0);
  const exam = getExamBySlug(String(slug));

  if (!exam) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState icon="🎯" title="Not found" body="This exam is not in the catalogue." />
      </View>
    );
  }

  const paper = exam.papers[paperIndex] ?? exam.papers[0];
  const isGoal = user.goalExamId === exam.id;
  const batches = BATCHES.filter((b) => b.examId === exam.id);
  const tests = TESTS.filter((x) => x.examId === exam.id);
  const videos = VIDEOS.filter((v) => v.examIds.includes(exam.id));
  const notes = NOTES.filter((n) => n.examIds.includes(exam.id));

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: exam.shortName }} />

      <View style={{ padding: theme.space.lg }}>
        <View style={{ backgroundColor: exam.color, borderRadius: theme.radius.xl, padding: theme.space.xl }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.sm }}>
            {t(exam.authority, lang)}
          </Text>
          <Text style={{ color: '#fff', fontSize: theme.font.xl, fontWeight: '800', marginTop: 6 }}>
            {t(exam.name, lang)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: theme.font.sm, lineHeight: 21, marginTop: 10 }}>
            {t(exam.about, lang)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: theme.font.xs, marginTop: 10 }}>
            {formatCount(exam.learners)} {lang === 'hi' ? 'शिक्षार्थी' : 'learners'} ·{' '}
            {t(exam.frequency, lang)}
          </Text>
          <Button
            label={
              isGoal
                ? lang === 'hi'
                  ? '✓ आपका लक्ष्य'
                  : '✓ Your goal'
                : lang === 'hi'
                  ? 'इसे लक्ष्य बनाएँ'
                  : 'Set as my goal'
            }
            variant={isGoal ? 'outline' : 'dark'}
            onPress={() => setGoal(exam.id, paper?.id)}
            style={{ marginTop: theme.space.lg }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        {exam.highlights.map((h) => (
          <View key={h.en} style={[s.card, s.row, { padding: theme.space.md, gap: 8 }]}>
            <Text style={{ color: theme.color.primary }}>✔</Text>
            <Text style={{ fontSize: theme.font.sm, fontWeight: '600' }}>{t(h, lang)}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: theme.space.xl }}>
        <SectionHeader title={lang === 'hi' ? 'परीक्षा पैटर्न' : 'Exam pattern'} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.space.lg, marginBottom: theme.space.md }}
        >
          {exam.papers.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => setPaperIndex(i)}
              style={{
                backgroundColor: i === paperIndex ? theme.color.ink : theme.color.surface,
                borderWidth: 1,
                borderColor: i === paperIndex ? 'transparent' : theme.color.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 13,
                paddingVertical: 7,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color: i === paperIndex ? '#fff' : theme.color.textMuted,
                }}
              >
                {t(p.name, lang)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {paper ? (
          <View style={{ paddingHorizontal: theme.space.lg }}>
            <View style={[s.card, { padding: theme.space.lg }]}>
              <Text style={[s.faint, { fontWeight: '700' }]}>
                {paper.totalQuestions} {lang === 'hi' ? 'प्रश्न' : 'questions'} ·{' '}
                {paper.durationMinutes} min ·{' '}
                {paper.negativeMarking
                  ? `−${paper.negativeMarking}`
                  : lang === 'hi'
                    ? 'ऋणात्मक अंकन नहीं'
                    : 'no negative marking'}{' '}
                · {lang === 'hi' ? 'कट-ऑफ' : 'cut-off'} {paper.cutoffGeneral}%/{paper.cutoffReserved}%
              </Text>
              {paper.sections.map((sec) => {
                const subject = getSubject(sec.subjectId);
                return (
                  <View
                    key={sec.subjectId}
                    style={[
                      s.row,
                      {
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        borderTopWidth: 1,
                        borderTopColor: theme.color.border,
                        marginTop: 10,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: theme.font.sm, fontWeight: '600', flex: 1 }}>
                      {subject?.icon} {subject ? t(subject.name, lang) : sec.subjectId}
                    </Text>
                    <Text style={s.faint}>
                      {sec.questions} {lang === 'hi' ? 'प्रश्न' : 'Qs'} · {sec.marks}{' '}
                      {lang === 'hi' ? 'अंक' : 'marks'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: theme.space.xl }}>
        <SectionHeader title={lang === 'hi' ? 'पात्रता' : 'Eligibility'} />
        <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
          {exam.eligibility.map((e) => (
            <View key={e.en} style={[s.card, { padding: theme.space.md, flexDirection: 'row', gap: 8 }]}>
              <Text style={{ color: theme.color.primary }}>•</Text>
              <Text style={{ flex: 1, fontSize: theme.font.sm, lineHeight: 20 }}>{t(e, lang)}</Text>
            </View>
          ))}
        </View>
      </View>

      {[
        { title: lang === 'hi' ? 'बैच' : 'Batches', items: batches.map((b) => <BatchCard key={b.id} batch={b} />) },
        { title: lang === 'hi' ? 'टेस्ट सीरीज़' : 'Test series', items: tests.map((x) => <TestCard key={x.id} test={x} />) },
        { title: lang === 'hi' ? 'वीडियो' : 'Videos', items: videos.map((v) => <VideoCard key={v.id} video={v} />) },
        { title: lang === 'hi' ? 'नोट्स' : 'Notes', items: notes.map((n) => <NoteCard key={n.id} note={n} />) },
      ]
        .filter((sec) => sec.items.length)
        .map((sec) => (
          <View key={sec.title} style={{ marginTop: theme.space.xl }}>
            <SectionHeader title={sec.title} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.space.lg }}
            >
              {sec.items}
            </ScrollView>
          </View>
        ))}
    </ScrollView>
  );
}
