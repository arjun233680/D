import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import {
  SUBJECT_BY_ID,
  examBrowsableSubjects,
  getExam,
  t,
  theme,
  UI,
  type Subject,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { EmptyState, s, Touch } from '@/components/ui';
import { Screen } from '@/components/prep';

/**
 * Search within the exam the learner is sitting.
 *
 * This used to be a directory of every exam in the catalogue. It is not any
 * more, for the same reason no other screen lists them: someone preparing for
 * HTET should not be shown CTET and REET while they work. Changing exam is the
 * goal switcher's job — one control, in the corner, listing every exam.
 */
export default function ExploreScreen() {
  const { lang, user } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const exam = getExam(user.goalExamId);

  const data = useMemo(() => {
    const subjects = examBrowsableSubjects(user.goalExamId)
      .map((id) => SUBJECT_BY_ID.get(id))
      .filter((sub): sub is Subject => Boolean(sub));
    return q
      ? subjects.filter(
          (sub) =>
            sub.name.en.toLowerCase().includes(q) ||
            sub.name.hi.includes(query) ||
            sub.topics.some(
              (topic) => topic.name.en.toLowerCase().includes(q) || topic.name.hi.includes(query),
            ),
        )
      : subjects;
  }, [q, query, user.goalExamId]);

  return (
    <Screen
      title={lang === 'hi' ? 'खोजें' : 'Explore'}
      subtitle={lang === 'hi' ? 'विषय और टॉपिक ढूँढ़िए' : 'Find a subject or a topic'}
      lang={lang}
      back
    >
      <View style={{ padding: theme.space.lg, gap: theme.space.sm }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t(UI.search, lang)}
          placeholderTextColor={theme.color.textFaint}
          style={{
            backgroundColor: theme.color.surface,
            borderWidth: 1,
            borderColor: theme.color.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 11,
            fontSize: theme.font.base,
          }}
        />
        {exam ? (
          <Text style={s.faint}>
            {t(exam.name, lang)} · {data.length} {lang === 'hi' ? 'विषय' : 'subjects'}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={data}
        keyExtractor={(sub) => sub.id}
        contentContainerStyle={{
          paddingHorizontal: theme.space.lg,
          paddingBottom: 24,
          gap: theme.space.md,
        }}
        renderItem={({ item }) => (
          <Touch
            href={`/practice/subject/${item.id}`}
            style={[s.card, { flexDirection: 'row', gap: theme.space.md, padding: theme.space.lg }]}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: theme.radius.md,
                backgroundColor: `${item.color}1a`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{t(item.name, lang)}</Text>
              <Text style={[s.faint, { marginTop: 2 }]} numberOfLines={2}>
                {t(item.description, lang)}
              </Text>
              <Text style={[s.faint, { marginTop: 4 }]}>
                {item.topics.length} {lang === 'hi' ? 'टॉपिक' : 'topics'}
              </Text>
            </View>
          </Touch>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title={lang === 'hi' ? 'कोई परिणाम नहीं' : 'No results'}
            body={
              lang === 'hi'
                ? 'दूसरे शब्दों से खोजें, या ऊपर दाईं ओर से परीक्षा बदलें।'
                : 'Try another term, or change exam from the goal switcher.'
            }
          />
        }
      />
    </Screen>
  );
}
