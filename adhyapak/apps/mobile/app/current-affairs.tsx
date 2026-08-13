import { FlatList, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { CURRENT_AFFAIRS, formatDate, t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, s } from '@/components/ui';

export default function CurrentAffairsScreen() {
  const { lang } = useStore();

  return (
    <FlatList
      style={s.screen}
      data={CURRENT_AFFAIRS}
      keyExtractor={(ca) => ca.id}
      contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.md }}
      ListHeaderComponent={
        <Stack.Screen
          options={{ title: lang === 'hi' ? 'समसामयिकी' : 'Current affairs' }}
        />
      }
      renderItem={({ item }) => (
        <View style={[s.card, { padding: theme.space.lg }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {item.tags.map((tag) => (
              <Badge key={tag.en} tone="info">
                {t(tag, lang)}
              </Badge>
            ))}
            <Text style={s.faint}>{formatDate(item.date, lang)}</Text>
          </View>
          <Text style={{ fontSize: theme.font.base, fontWeight: '700', marginTop: 8 }}>
            {t(item.title, lang)}
          </Text>
          <Text style={[s.muted, { marginTop: 6, lineHeight: 20 }]}>{t(item.summary, lang)}</Text>
        </View>
      )}
    />
  );
}
