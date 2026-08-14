import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { EXAMS, listBatches, theme } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { BatchCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';

export default function BatchesScreen() {
  const batches = useAsync(() => listBatches(), []);
  const { lang } = useStore();
  const r = useResponsive();
  const [examId, setExamId] = useState('all');
  const all = batches.data ?? [];
  const data = examId === 'all' ? all : all.filter((b) => b.examId === examId);

  return (
    <View style={s.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: r.gutter }}
      >
        <Chip
          label={lang === 'hi' ? 'सभी' : 'All'}
          active={examId === 'all'}
          onPress={() => setExamId('all')}
        />
        {EXAMS.map((e) => (
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
        keyExtractor={(b) => b.id}
        contentContainerStyle={{
          paddingHorizontal: r.gutter,
          paddingBottom: 24,
          width: '100%',
          maxWidth: r.maxWidth,
          alignSelf: 'center',
        }}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <BatchCard batch={item} full />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🎥"
            title={lang === 'hi' ? 'बैच नहीं मिले' : 'No batches found'}
            body={lang === 'hi' ? 'दूसरी परीक्षा चुनें।' : 'Try another exam.'}
          />
        }
      />
    </View>
  );
}
