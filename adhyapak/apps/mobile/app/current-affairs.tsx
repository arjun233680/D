import { FlatList, Text, View } from 'react-native';
import { formatDate, listCurrentAffairs, t, theme } from '@adhyapak/core';
import { useAsync } from '@/lib/useAsync';
import { useStore } from '@/lib/store';
import { Badge, s } from '@/components/ui';
import { Screen } from '@/components/prep';

export default function CurrentAffairsScreen() {
  const affairs = useAsync(() => listCurrentAffairs(), []);
  const { lang } = useStore();

  return (
    <Screen
      title={lang === 'hi' ? 'समसामयिकी' : 'Current Affairs'}
      subtitle={lang === 'hi' ? 'रोज़ अपडेट रहें' : 'Stay Updated Daily'}
      lang={lang}
      back
    >
    <FlatList
      data={affairs.data ?? []}
      keyExtractor={(ca) => ca.id}
      contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.md }}
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
    </Screen>
  );
}
