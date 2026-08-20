import { useState } from 'react';
import { FlatList, ScrollView } from 'react-native';
import { SUBJECT_BY_ID, examBrowsableSubjects, listVideos, t, theme } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { VideoCard } from '@/components/cards';
import { Chip, EmptyState } from '@/components/ui';
import { Screen } from '@/components/prep';

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
    <Screen
      title={lang === 'hi' ? 'वीडियो' : 'Videos'}
      subtitle={lang === 'hi' ? 'पढ़िए, देखिए, समझिए' : 'Watch, learn, revise'}
      lang={lang}
      back
    >
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
            title={
              all.length
                ? lang === 'hi' ? 'इस विषय में वीडियो नहीं' : 'No videos in this subject'
                : lang === 'hi' ? 'अभी कोई वीडियो नहीं' : 'No lessons yet'
            }
            body={
              all.length
                ? lang === 'hi' ? 'दूसरा विषय चुनें।' : 'Try another subject.'
                : lang === 'hi'
                  ? 'कोई कक्षा अभी प्रकाशित नहीं हुई। नोट्स, प्रश्न बैंक और टेस्ट खुले हैं।'
                  : 'No classes have been published yet. The notes, question bank and tests are open.'
            }
          />
        }
      />
    </Screen>
  );
}
