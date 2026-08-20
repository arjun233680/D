import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { SUBJECT_BY_ID, examBrowsableSubjects, listNotes, t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { NoteCard } from '@/components/cards';
import { AsyncSection, Chip } from '@/components/ui';
import { Screen, ScreenBody } from '@/components/prep';

export default function NotesScreen() {
  const { lang, user, uploadedNotes } = useStore();
  const [subjectId, setSubjectId] = useState('all');
  // Only the subjects this exam tests — the chip row used to list the whole
  // catalogue, including subjects from exams the learner is not sitting.
  const subjects = examBrowsableSubjects(user.goalExamId)
    .map((id) => SUBJECT_BY_ID.get(id))
    .filter((sub): sub is NonNullable<typeof sub> => Boolean(sub));
  // Published notes only, enforced in the repository. Notes uploaded in this
  // session sit in front until they reach the backend.
  const state = useAsync(
    () =>
      listNotes({
        examId: user.goalExamId,
        subjectId: subjectId === 'all' ? undefined : subjectId,
      }),
    [subjectId, user.goalExamId],
  );
  const all = [...uploadedNotes, ...(state.data ?? [])];
  const data = subjectId === 'all' ? all : all.filter((n) => n.subjectId === subjectId);

  return (
    <Screen
      title={lang === 'hi' ? 'नोट्स' : 'Notes'}
      subtitle={lang === 'hi' ? 'बेहतर पढ़ाई, बेहतर अंक' : 'Study Smart, Score Better'}
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
        {subjects.map((sub) => (
          <Chip
            key={sub.id}
            label={`${sub.icon} ${t(sub.name, lang)}`}
            active={subjectId === sub.id}
            onPress={() => setSubjectId(sub.id)}
          />
        ))}
      </ScrollView>
      <ScreenBody>
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
      </ScreenBody>
    </Screen>
  );
}
