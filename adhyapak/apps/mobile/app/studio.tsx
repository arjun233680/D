import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  EXAMS,
  SUBJECTS,
  t,
  theme,
  UI,
  type ContentAccess,
  type Note,
  type Video,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useStudioAccess } from '@/lib/useStudioAccess';
import { StudioGate } from '@/components/StudioGate';
import { Badge, Button, s } from '@/components/ui';

type Mode = 'video' | 'note';

/**
 * Educator Studio on mobile. The picked file's URI goes straight into the same
 * Video/Note shape the seed data uses, so the upload appears in the lists
 * immediately and swaps to a CDN URL the day storage is wired up.
 */
export default function StudioScreen() {
  const { access: studioAccess, loading: checkingAccess } = useStudioAccess();
  const { lang, user, addVideo, addNote, uploadedVideos, uploadedNotes } = useStore();
  const [mode, setMode] = useState<Mode>('video');
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [desc, setDesc] = useState('');
  const [subjectId, setSubjectId] = useState(SUBJECTS[0]!.id);
  const [access, setAccess] = useState<ContentAccess>('free');
  const [examIds, setExamIds] = useState<string[]>(['ctet']);
  const [file, setFile] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [saved, setSaved] = useState(false);

  const subject = SUBJECTS.find((x) => x.id === subjectId)!;
  const canSave = titleEn.trim().length > 2 && (mode === 'note' || Boolean(file));

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: mode === 'video' ? 'video/*' : 'application/pdf',
      copyToCacheDirectory: true,
    });
    const asset = res.assets?.[0];
    if (asset) setFile({ uri: asset.uri, name: asset.name, size: asset.size ?? undefined });
  };

  const publish = () => {
    const now = new Date().toISOString();
    const id = `${mode}-upload-${Date.now()}`;
    const title = { en: titleEn, hi: titleHi || titleEn };

    if (mode === 'video') {
      const video: Video = {
        id,
        title,
        description: { en: desc, hi: desc },
        educatorId: user.id,
        subjectId,
        examIds,
        src: file?.uri ?? '',
        thumbnail: subject.color,
        durationSeconds: 0,
        publishedAt: now.slice(0, 10),
        access,
        language: lang,
        chapters: [],
        resources: [],
      };
      addVideo(video);
    } else {
      const note: Note = {
        id,
        title,
        subjectId,
        examIds,
        educatorId: user.id,
        fileUrl: file?.uri,
        pages: 1,
        downloads: 0,
        updatedAt: now.slice(0, 10),
        access,
        language: 'both',
        tags: [{ en: 'Uploaded', hi: 'अपलोड किया' }],
        sections: [{ heading: title, body: { en: desc || titleEn, hi: desc || titleHi || titleEn } }],
      };
      addNote(note);
    }

    setSaved(true);
    setTitleEn('');
    setTitleHi('');
    setDesc('');
    setFile(null);
    setTimeout(() => setSaved(false), 4000);
  };

  const input = {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: theme.font.base,
  } as const;

  // The Studio is the admin module: uploading and importing are staff acts, and
  // the database says so — `commit_import_batch` raises for a non-staff caller.
  // This screen had no check at all, so the form rendered for anybody who
  // reached it and the refusal arrived only after it was filled in.
  return (
    <StudioGate access={studioAccess} loading={checkingAccess} lang={lang}>
    <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: t(UI.studio, lang) }} />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['video', 'note'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setFile(null);
            }}
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: theme.radius.md,
              alignItems: 'center',
              backgroundColor: mode === m ? theme.color.ink : theme.color.surface,
              borderWidth: 1,
              borderColor: mode === m ? 'transparent' : theme.color.border,
            }}
          >
            <Text style={{ fontWeight: '700', color: mode === m ? '#fff' : theme.color.textMuted }}>
              {m === 'video'
                ? `🎥 ${lang === 'hi' ? 'वीडियो' : 'Video'}`
                : `📄 ${lang === 'hi' ? 'नोट्स' : 'Notes'}`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.lg, gap: theme.space.md }]}>
        <Pressable
          onPress={pick}
          style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: theme.color.borderStrong,
            borderRadius: theme.radius.md,
            paddingVertical: 30,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 28 }}>{mode === 'video' ? '🎬' : '📄'}</Text>
          <Text style={{ fontWeight: '700', fontSize: theme.font.sm, marginTop: 6 }}>
            {file
              ? file.name
              : lang === 'hi'
                ? 'फ़ाइल चुनने हेतु टैप करें'
                : 'Tap to choose a file'}
          </Text>
          <Text style={[s.faint, { marginTop: 3 }]}>
            {mode === 'video' ? 'MP4, MOV' : 'PDF'}
            {file?.size ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
          </Text>
        </Pressable>

        <TextInput
          style={input}
          value={titleEn}
          onChangeText={setTitleEn}
          placeholder={lang === 'hi' ? 'शीर्षक (English)' : 'Title (English)'}
          placeholderTextColor={theme.color.textFaint}
        />
        <TextInput
          style={input}
          value={titleHi}
          onChangeText={setTitleHi}
          placeholder={lang === 'hi' ? 'शीर्षक (हिंदी)' : 'Title (Hindi)'}
          placeholderTextColor={theme.color.textFaint}
        />
        <TextInput
          style={[input, { minHeight: 80, textAlignVertical: 'top' }]}
          value={desc}
          onChangeText={setDesc}
          multiline
          placeholder={lang === 'hi' ? 'विवरण' : 'Description'}
          placeholderTextColor={theme.color.textFaint}
        />

        <Text style={[s.faint, { fontWeight: '700' }]}>{lang === 'hi' ? 'विषय' : 'Subject'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {SUBJECTS.map((sub) => (
            <Pressable
              key={sub.id}
              onPress={() => setSubjectId(sub.id)}
              style={{
                backgroundColor: subjectId === sub.id ? theme.color.primary : theme.color.surface,
                borderWidth: 1,
                borderColor: subjectId === sub.id ? 'transparent' : theme.color.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 12,
                paddingVertical: 7,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '600',
                  color: subjectId === sub.id ? '#fff' : theme.color.textMuted,
                }}
              >
                {sub.icon} {t(sub.name, lang)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[s.faint, { fontWeight: '700' }]}>{lang === 'hi' ? 'पहुँच' : 'Access'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['free', 'plus', 'iconic'] as ContentAccess[]).map((a) => (
            <Pressable
              key={a}
              onPress={() => setAccess(a)}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: theme.radius.sm,
                alignItems: 'center',
                backgroundColor: access === a ? theme.color.accent : theme.color.surface,
                borderWidth: 1,
                borderColor: access === a ? 'transparent' : theme.color.border,
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.xs,
                  fontWeight: '700',
                  color: access === a ? '#fff' : theme.color.textMuted,
                }}
              >
                {a === 'free' ? t(UI.free, lang) : a}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.faint, { fontWeight: '700' }]}>
          {lang === 'hi' ? 'किन परीक्षाओं हेतु' : 'Target exams'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EXAMS.map((e) => {
            const on = examIds.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() =>
                  setExamIds((prev) =>
                    prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id],
                  )
                }
                style={{
                  backgroundColor: on ? theme.color.accent : theme.color.surface,
                  borderWidth: 1,
                  borderColor: on ? 'transparent' : theme.color.border,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontWeight: '600',
                    color: on ? '#fff' : theme.color.textMuted,
                  }}
                >
                  {e.shortName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          label={lang === 'hi' ? 'प्रकाशित करें' : 'Publish'}
          disabled={!canSave}
          onPress={publish}
        />

        {saved ? (
          <View
            style={{
              backgroundColor: theme.color.successLight,
              borderRadius: theme.radius.md,
              padding: 12,
            }}
          >
            <Text style={{ color: theme.color.success, fontWeight: '700', fontSize: theme.font.sm }}>
              {lang === 'hi' ? '✓ प्रकाशित!' : '✓ Published!'}
            </Text>
          </View>
        ) : null}
      </View>

      {uploadedVideos.length || uploadedNotes.length ? (
        <View style={{ marginTop: theme.space.xl, gap: theme.space.sm }}>
          <Text style={s.h2}>{lang === 'hi' ? 'आपके अपलोड' : 'Your uploads'}</Text>
          {uploadedVideos.map((v) => (
            <View key={v.id} style={[s.card, s.row, { padding: theme.space.md, gap: 10 }]}>
              <Text style={{ fontSize: 18 }}>🎥</Text>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: theme.font.sm }} numberOfLines={1}>
                {t(v.title, lang)}
              </Text>
              <Badge tone="brand">{lang === 'hi' ? 'वीडियो' : 'Video'}</Badge>
            </View>
          ))}
          {uploadedNotes.map((n) => (
            <View key={n.id} style={[s.card, s.row, { padding: theme.space.md, gap: 10 }]}>
              <Text style={{ fontSize: 18 }}>📄</Text>
              <Text style={{ flex: 1, fontWeight: '700', fontSize: theme.font.sm }} numberOfLines={1}>
                {t(n.title, lang)}
              </Text>
              <Badge tone="accent">{lang === 'hi' ? 'नोट्स' : 'Notes'}</Badge>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
    </StudioGate>
  );
}
