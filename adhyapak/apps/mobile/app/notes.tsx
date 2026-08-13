import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { NOTES, SUBJECTS, t, theme, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { NoteCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';

export default function NotesScreen() {
  const { lang, uploadedNotes } = useStore();
  const [subjectId, setSubjectId] = useState('all');
  const all = [...uploadedNotes, ...NOTES];
  const data = subjectId === 'all' ? all : all.filter((n) => n.subjectId === subjectId);

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: t(UI.notes, lang) }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: theme.space.lg }}
      >
        <Chip
          label={lang === 'hi' ? 'सभी' : 'All'}
          active={subjectId === 'all'}
          onPress={() => setSubjectId('all')}
        />
        {SUBJECTS.filter((sub) => all.some((n) => n.subjectId === sub.id)).map((sub) => (
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
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 24 }}
        renderItem={({ item }) => <NoteCard note={item} full />}
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title={lang === 'hi' ? 'नोट्स नहीं' : 'No notes'}
            body={lang === 'hi' ? 'दूसरा विषय चुनें।' : 'Try another subject.'}
          />
        }
      />
    </View>
  );
}
