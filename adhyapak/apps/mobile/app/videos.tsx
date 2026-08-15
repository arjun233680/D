import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { SUBJECT_BY_ID, examBrowsableSubjects, listVideos, t, theme, UI } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { VideoCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';

export default function VideosScreen() {
  const { lang, user, uploadedVideos } = useStore();
  // Scoped to the learner's exam, like every other listing.
  const videos = useAsync(() => listVideos({ examId: user.goalExamId }), [user.goalExamId]);
  const [subjectId, setSubjectId] = useState('all');
  const subjects = examBrowsableSubjects(user.goalExamId)
    .map((id) => SUBJECT_BY_ID.get(id))
    .filter((sub): sub is NonNullable<typeof sub> => Boolean(sub));
  const all = [...uploadedVideos, ...(videos.data ?? [])];
  const data = subjectId === 'all' ? all : all.filter((v) => v.subjectId === subjectId);

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: t(UI.videos, lang) }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ padding: theme.space.lg }}
      >
        <Chip
          label={lang === 'hi' ? 'सभी' : 'All'}
          active={subjectId === 'all'}
          onPress={() => setSubjectId('all')}
        />
        {subjects.filter((sub) => all.some((v) => v.subjectId === sub.id)).map((sub) => (
          <Chip
            key={sub.id}
            label={`${sub.icon} ${t(sub.name, lang)}`}
            active={subjectId === sub.id}
            onPress={() => setSubjectId(sub.id)}
          />
        ))}
      </ScrollView>
      <FlatList
        data={data}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 24 }}
        renderItem={({ item }) => <VideoCard video={item} full />}
        ListEmptyComponent={
          <EmptyState
            icon="🎥"
            title={lang === 'hi' ? 'वीडियो नहीं' : 'No videos'}
            body={lang === 'hi' ? 'दूसरा विषय चुनें।' : 'Try another subject.'}
          />
        }
      />
    </View>
  );
}
