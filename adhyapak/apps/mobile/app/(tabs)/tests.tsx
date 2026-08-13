import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { EXAMS, TESTS, theme, type Test } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { TestCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';

const TYPES: { id: Test['type'] | 'all'; label: { en: string; hi: string } }[] = [
  { id: 'all', label: { en: 'All', hi: 'सभी' } },
  { id: 'mock', label: { en: 'Full Mock', hi: 'पूर्ण मॉक' } },
  { id: 'pyq', label: { en: 'Previous Year', hi: 'विगत वर्ष' } },
  { id: 'sectional', label: { en: 'Sectional', hi: 'सेक्शनल' } },
  { id: 'daily-quiz', label: { en: 'Daily Quiz', hi: 'दैनिक क्विज़' } },
];

export default function TestsScreen() {
  const { lang } = useStore();
  const r = useResponsive();
  const [type, setType] = useState<Test['type'] | 'all'>('all');
  const [examId, setExamId] = useState('all');

  const data = TESTS.filter(
    (x) => (type === 'all' || x.type === type) && (examId === 'all' || x.examId === examId),
  );

  return (
    <View style={s.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: r.gutter }}
      >
        <Chip
          label={lang === 'hi' ? 'सभी परीक्षाएँ' : 'All exams'}
          active={examId === 'all'}
          onPress={() => setExamId('all')}
        />
        {EXAMS.filter((e) => TESTS.some((x) => x.examId === e.id)).map((e) => (
          <Chip
            key={e.id}
            label={`${e.emoji} ${e.shortName}`}
            active={examId === e.id}
            onPress={() => setExamId(e.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        key={'cols-' + r.columns}
        numColumns={r.columns}
        columnWrapperStyle={r.columns > 1 ? { gap: theme.space.md } : undefined}
        data={data}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{
          paddingHorizontal: r.gutter,
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
        ListEmptyComponent={
          <EmptyState
            icon="🎯"
            title={lang === 'hi' ? 'कोई टेस्ट नहीं' : 'No tests here'}
            body={lang === 'hi' ? 'फ़िल्टर बदलें।' : 'Change the filter.'}
          />
        }
      />
    </View>
  );
}
