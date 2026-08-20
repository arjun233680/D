import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { listTests, theme, type Test } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { TestCard } from '@/components/cards';
import { AsyncSection, Chip } from '@/components/ui';
import { Screen } from '@/components/prep';
import { useResponsive } from '@/lib/responsive';

const TYPES: { id: Test['type'] | 'all'; label: { en: string; hi: string } }[] = [
  { id: 'all', label: { en: 'All', hi: 'सभी' } },
  { id: 'mock', label: { en: 'Full Mock', hi: 'पूर्ण मॉक' } },
  { id: 'pyq', label: { en: 'Previous Year', hi: 'विगत वर्ष' } },
  { id: 'sectional', label: { en: 'Sectional', hi: 'सेक्शनल' } },
  { id: 'daily-quiz', label: { en: 'Daily Quiz', hi: 'दैनिक क्विज़' } },
];

export default function TestsScreen() {
  const { lang, user } = useStore();
  const r = useResponsive();
  const [type, setType] = useState<Test['type'] | 'all'>('all');

  // Always the learner's own exam. A row of exam chips used to sit here,
  // offering the mocks of exams they are not sitting; changing exam is the goal
  // switcher's job, one control in the corner rather than a row per screen.
  const state = useAsync(() => listTests(user.goalExamId), [user.goalExamId]);
  const data = (state.data ?? []).filter((x) => type === 'all' || x.type === type);

  return (
    <Screen
      title={lang === 'hi' ? 'टेस्ट सीरीज़' : 'Test Series'}
      subtitle={lang === 'hi' ? 'अधिक अभ्यास, बेहतर अंक' : 'Practice More, Score Higher'}
      lang={lang}
      back
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: r.gutter, paddingTop: r.gutter }}
      >
        {TYPES.map((x) => (
          <Chip
            key={x.id}
            label={x.label[lang]}
            active={type === x.id}
            onPress={() => setType(x.id)}
          />
        ))}
      </ScrollView>

      <View style={{ flex: 1, paddingHorizontal: r.gutter }}>
        <AsyncSection
          state={{ ...state, data }}
          lang={lang}
          empty={{
            icon: '🎯',
            title: lang === 'hi' ? 'कोई टेस्ट नहीं' : 'No tests here',
            body:
              lang === 'hi'
                ? 'इस फ़िल्टर के लिए अभी कोई टेस्ट प्रकाशित नहीं हुआ है।'
                : 'No tests have been published for this filter yet.',
          }}
        >
          {(list) => (
            <FlatList
              key={'cols-' + r.columns}
              numColumns={r.columns}
              columnWrapperStyle={r.columns > 1 ? { gap: theme.space.md } : undefined}
              data={list}
              keyExtractor={(x) => x.id}
              contentContainerStyle={{
                paddingBottom: 24,
                width: '100%',
                maxWidth: r.maxWidth,
                alignSelf: 'center',
              }}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <TestCard test={item} full />
                </View>
              )}
            />
          )}
        </AsyncSection>
      </View>
    </Screen>
  );
}
