import { useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { listBatches, theme } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { BatchCard } from '@/components/cards';
import { Chip, EmptyState, s } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';

export default function BatchesScreen() {
  const { lang, user } = useStore();
  const r = useResponsive();
  // The learner's own exam, always — see the tests tab for why the chips went.
  const batches = useAsync(() => listBatches(user.goalExamId), [user.goalExamId]);
  const data = batches.data ?? [];

  return (
    <View style={s.screen}>

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
