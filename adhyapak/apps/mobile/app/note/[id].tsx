import { ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { NOTES, formatCount, formatDate, getEducator, getSubject, t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, Button, EmptyState, s } from '@/components/ui';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, user, toggleSavedNote, uploadedNotes } = useStore();

  const note = [...uploadedNotes, ...NOTES].find((n) => n.id === String(id));
  if (!note) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState icon="📚" title="Not found" body="These notes are no longer available." />
      </View>
    );
  }

  const subject = getSubject(note.subjectId);
  const educator = getEducator(note.educatorId);
  const saved = user.savedNoteIds.includes(note.id);

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: subject ? t(subject.name, lang) : 'Notes' }} />

      <View style={[s.card, { padding: theme.space.xl }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <AccessBadge access={note.access} lang={lang} />
          {note.tags.map((tag) => (
            <Badge key={tag.en} tone="info">
              {t(tag, lang)}
            </Badge>
          ))}
        </View>
        <Text style={[s.h1, { marginTop: 10 }]}>{t(note.title, lang)}</Text>
        <Text style={[s.faint, { marginTop: 6 }]}>
          {educator ? `${educator.avatar} ${educator.name} · ` : ''}
          {note.pages} {lang === 'hi' ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}{' '}
          {lang === 'hi' ? 'डाउनलोड' : 'downloads'} · {formatDate(note.updatedAt, lang)}
        </Text>
        <Button
          label={saved ? `✓ ${lang === 'hi' ? 'सहेजा गया' : 'Saved'}` : lang === 'hi' ? 'सहेजें' : 'Save'}
          variant={saved ? 'outline' : 'dark'}
          onPress={() => toggleSavedNote(note.id)}
          style={{ marginTop: theme.space.lg }}
        />
      </View>

      {note.sections.map((section, i) => (
        <View key={section.heading.en} style={[s.card, { padding: theme.space.xl, marginTop: theme.space.lg }]}>
          <Text style={s.h2}>
            <Text style={{ color: theme.color.textFaint }}>{i + 1}. </Text>
            {t(section.heading, lang)}
          </Text>
          <Text style={[s.body, { marginTop: 8 }]}>{t(section.body, lang)}</Text>

          {section.bullets?.map((b) => (
            <View key={b.en} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Text style={{ color: theme.color.primary }}>▸</Text>
              <Text style={[s.body, { flex: 1, fontSize: theme.font.sm }]}>{t(b, lang)}</Text>
            </View>
          ))}

          {section.callout ? (
            <View
              style={{
                marginTop: 12,
                borderLeftWidth: 4,
                borderLeftColor: theme.color.saffron,
                backgroundColor: theme.color.saffronLight,
                borderRadius: theme.radius.md,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.color.saffron, fontSize: theme.font.xs, fontWeight: '800' }}>
                {lang === 'hi' ? 'याद रखें' : 'REMEMBER'}
              </Text>
              <Text style={{ fontSize: theme.font.sm, lineHeight: 21, marginTop: 4, fontWeight: '500' }}>
                {t(section.callout, lang)}
              </Text>
            </View>
          ) : null}
        </View>
      ))}

      <Button
        label={lang === 'hi' ? 'अब इस टॉपिक के प्रश्न हल करें →' : 'Now practise this topic →'}
        onPress={() =>
          router.push(
            note.topicId
              ? `/practice/topic/${note.topicId}`
              : `/practice/subject/${note.subjectId}`,
          )
        }
        style={{ marginTop: theme.space.xl }}
      />
    </ScrollView>
  );
}
