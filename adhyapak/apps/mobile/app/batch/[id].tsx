import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  NOTES,
  VIDEOS,
  formatCount,
  formatDate,
  getBatch,
  getEducator,
  getExam,
  getSubject,
  t,
  theme,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { NoteCard, VideoCard } from '@/components/cards';
import { AccessBadge, Button, EmptyState, s } from '@/components/ui';

export default function BatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, user, toggleEnrolment } = useStore();
  const [open, setOpen] = useState<string | null>(null);

  const batch = getBatch(String(id));
  if (!batch) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState
          icon="🎥"
          title={lang === 'hi' ? 'नहीं मिला' : 'Not found'}
          body={lang === 'hi' ? 'यह बैच समाप्त हो चुका है।' : 'This batch has ended.'}
        />
      </View>
    );
  }

  const exam = getExam(batch.examId);
  const enrolled = user.enrolledBatchIds.includes(batch.id);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: exam?.shortName ?? 'Batch' }} />

      <View style={{ padding: theme.space.lg }}>
        <View style={{ backgroundColor: batch.color, borderRadius: theme.radius.xl, padding: theme.space.xl }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <AccessBadge access={batch.access} lang={lang} />
          </View>
          <Text style={{ color: '#fff', fontSize: theme.font.lg, fontWeight: '800', marginTop: 10 }}>
            {t(batch.title, lang)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: theme.font.sm, marginTop: 8 }}>
            {t(batch.schedule, lang)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: theme.font.xs, marginTop: 4 }}>
            {formatDate(batch.startsAt, lang)} → {formatDate(batch.endsAt, lang)}
          </Text>
          <Button
            label={enrolled ? `✓ ${t(UI.enrolled, lang)}` : t(UI.enroll, lang)}
            variant={enrolled ? 'outline' : 'dark'}
            onPress={() => toggleEnrolment(batch.id)}
            style={{ marginTop: theme.space.lg }}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        {batch.includes.map((inc) => (
          <View key={inc.en} style={[s.card, s.row, { padding: theme.space.md, gap: 8 }]}>
            <Text style={{ color: theme.color.primary }}>✔</Text>
            <Text style={{ fontSize: theme.font.sm, fontWeight: '600' }}>{t(inc, lang)}</Text>
          </View>
        ))}
      </View>

      <View style={{ padding: theme.space.lg, gap: theme.space.sm }}>
        <Text style={s.h2}>
          {lang === 'hi' ? 'सिलेबस' : 'Syllabus'} ({batch.syllabus.length})
        </Text>
        {batch.syllabus.map((mod) => {
          const subject = getSubject(mod.subjectId);
          const isOpen = open === mod.id;
          const videos = mod.videoIds
            .map((vid) => VIDEOS.find((v) => v.id === vid))
            .filter((v): v is NonNullable<typeof v> => Boolean(v));
          const notes = mod.noteIds
            .map((nid) => NOTES.find((n) => n.id === nid))
            .filter((n): n is NonNullable<typeof n> => Boolean(n));

          return (
            <View key={mod.id} style={[s.card, { overflow: 'hidden' }]}>
              <Pressable
                onPress={() => setOpen(isOpen ? null : mod.id)}
                style={[s.row, { padding: theme.space.lg, gap: theme.space.md }]}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: theme.radius.md,
                    backgroundColor: `${subject?.color ?? theme.color.accent}1a`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{subject?.icon ?? '📘'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: theme.font.base }}>
                    {t(mod.title, lang)}
                  </Text>
                  <Text style={[s.faint, { marginTop: 2 }]}>
                    {videos.length} {lang === 'hi' ? 'वीडियो' : 'videos'} · {notes.length}{' '}
                    {lang === 'hi' ? 'नोट्स' : 'notes'} · {mod.questionIds.length}{' '}
                    {lang === 'hi' ? 'प्रश्न' : 'Qs'}
                  </Text>
                </View>
                <Text style={{ color: theme.color.textFaint }}>{isOpen ? '▲' : '▼'}</Text>
              </Pressable>

              {isOpen ? (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.color.border,
                    padding: theme.space.md,
                    gap: theme.space.md,
                  }}
                >
                  {videos.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {videos.map((v) => (
                        <VideoCard key={v.id} video={v} />
                      ))}
                    </ScrollView>
                  ) : null}
                  {notes.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {notes.map((n) => (
                        <NoteCard key={n.id} note={n} />
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
