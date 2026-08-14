import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { SUBJECTS, listNotes, t, theme, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { NoteCard } from '@/components/cards';
import { AsyncSection, Chip, s } from '@/components/ui';

export default function NotesScreen() {
  const { lang, uploadedNotes } = useStore();
  const [subjectId, setSubjectId] = useState('all');
  // Published notes only, enforced in the repository. Notes uploaded in this
  // session sit in front until they reach the backend.
  const state = useAsync(
    () => listNotes({ subjectId: subjectId === 'all' ? undefined : subjectId }),
    [subjectId],
  );
  const all = [...uploadedNotes, ...(state.data ?? [])];
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
        {SUBJECTS.map((sub) => (
          <Chip
            key={sub.id}
            label={`${sub.icon} ${t(sub.name, lang)}`}
            active={subjectId === sub.id}
            onPress={() => setSubjectId(sub.id)}
          />
        ))}
      </ScrollView>
      <View style={{ flex: 1, paddingHorizontal: theme.space.lg }}>
        <AsyncSection
          state={{ ...state, data }}
          lang={lang}
          empty={{
            icon: '📚',
            title: lang === 'hi' ? 'नोट्स नहीं' : 'No notes',
            body:
              lang === 'hi'
                ? 'इस विषय के लिए अभी कोई नोट्स प्रकाशित नहीं हुए हैं।'
                : 'No notes have been published for this subject yet.',
          }}
        >
          {(list) => (
            <FlatList
              data={list}
              keyExtractor={(n) => n.id}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => <NoteCard note={item} full />}
            />
          )}
        </AsyncSection>
      </View>
    </View>
  );
}
