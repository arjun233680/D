import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { BATCHES, EXAMS, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { BatchCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';

export default function BatchesScreen() {
  const { lang } = useStore();
  const [examId, setExamId] = useState('all');
  const data = examId === 'all' ? BATCHES : BATCHES.filter((b) => b.examId === examId);

  return (
    <View style={s.screen}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ padding: theme.space.lg }}
      >
        <Chip
          label={lang === 'hi' ? 'सभी' : 'All'}
          active={examId === 'all'}
          onPress={() => setExamId('all')}
        />
        {EXAMS.filter((e) => BATCHES.some((b) => b.examId === e.id)).map((e) => (
          <Chip
            key={e.id}
            label={`${e.emoji} ${e.shortName}`}
            active={examId === e.id}
            onPress={() => setExamId(e.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingBottom: 24 }}
        renderItem={({ item }) => <BatchCard batch={item} full />}
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
