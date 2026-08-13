import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { EXAMS, t, theme, UI } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { ExamCard } from '@/components/cards';
import { EmptyState, s } from '@/components/ui';

export default function ExploreScreen() {
  const { lang } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const data = useMemo(
    () =>
      EXAMS.filter(
        (e) =>
          !q ||
          e.shortName.toLowerCase().includes(q) ||
          e.name.en.toLowerCase().includes(q) ||
          e.name.hi.includes(query) ||
          (e.state?.en.toLowerCase().includes(q) ?? false),
      ),
    [q, query],
  );

  return (
    <View style={s.screen}>
      <Stack.Screen options={{ title: lang === 'hi' ? 'खोजें' : 'Explore' }} />
      <View style={{ padding: theme.space.lg }}>
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
      </View>
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        numColumns={2}
        columnWrapperStyle={{ gap: theme.space.md }}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 24, gap: theme.space.md }}
        renderItem={({ item }) => <ExamCard exam={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title={lang === 'hi' ? 'कोई परिणाम नहीं' : 'No results'}
            body={lang === 'hi' ? 'CTET, REET या हरियाणा आज़माएँ।' : 'Try CTET, REET or Haryana.'}
          />
        }
      />
    </View>
  );
}
