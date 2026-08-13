import { FlatList, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { DOUBTS, getSubject, t, theme, timeAgo } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, s } from '@/components/ui';

export default function DoubtsScreen() {
  const { lang } = useStore();

  return (
    <FlatList
      style={s.screen}
      data={DOUBTS}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.md }}
      ListHeaderComponent={
        <Stack.Screen options={{ title: lang === 'hi' ? 'शंका समाधान' : 'Doubts' }} />
      }
      renderItem={({ item }) => {
        const subject = getSubject(item.subjectId);
        return (
          <View style={[s.card, { padding: theme.space.lg }]}>
            <View style={[s.row, { gap: 8 }]}>
              <Text style={{ fontSize: 18 }}>{item.avatar}</Text>
              <Text style={{ fontWeight: '700', fontSize: theme.font.sm }}>{item.askedBy}</Text>
              <Text style={s.faint}>{timeAgo(item.askedAt, lang)}</Text>
              <View style={{ flex: 1 }} />
              {subject ? <Badge tone="neutral">{subject.icon}</Badge> : null}
            </View>
            <Text style={{ fontSize: theme.font.base, fontWeight: '600', lineHeight: 22, marginTop: 8 }}>
              {t(item.question, lang)}
            </Text>
            {item.answers.map((a) => (
              <View
                key={a.id}
                style={{
                  marginTop: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: theme.color.primary,
                  backgroundColor: theme.color.surfaceAlt,
                  borderRadius: theme.radius.md,
                  padding: 12,
                }}
              >
                <View style={[s.row, { gap: 8 }]}>
                  <Text style={{ fontWeight: '700', fontSize: theme.font.sm }}>{a.by}</Text>
                  {a.isEducator ? (
                    <Badge tone="brand">{lang === 'hi' ? 'शिक्षक' : 'Educator'}</Badge>
                  ) : null}
                </View>
                <Text style={{ fontSize: theme.font.sm, lineHeight: 21, marginTop: 6 }}>
                  {t(a.body, lang)}
                </Text>
              </View>
            ))}
          </View>
        );
      }}
    />
  );
}
