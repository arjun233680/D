import { FlatList, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { DOUBTS, getSubject, t, theme, timeAgo } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, s } from '@/components/ui';

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
      /* A FlatList with nothing in it renders nothing at all, so with the
         bundled doubts gone this screen was a title over blank space. */
      ListEmptyComponent={
        <EmptyState
          icon="💬"
          title={lang === 'hi' ? 'अभी कोई शंका नहीं' : 'No doubts yet'}
          body={
            lang === 'hi'
              ? 'जब शिक्षार्थी प्रश्न पूछना शुरू करेंगे, वे उत्तरों सहित यहाँ दिखेंगे।'
              : 'Once learners start asking, their questions and the answers appear here.'
          }
        />
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
