import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  NOTES,
  buildNoteDocument,
  formatCount,
  getSubject,
  t,
  theme,
  type NoteBlock,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';
import { useResponsive } from '@/lib/responsive';
import { openNotePdf } from '@/lib/pdf';
import { Content, EmptyState, s } from '@/components/ui';

/**
 * The note reader.
 *
 * Notes are read as documents, so this screen is a PDF viewer rather than a web
 * page: a cover sheet, numbered A4 pages on a grey desk, running headers, and a
 * download that hands over the same document as a real file. The pagination
 * comes from `buildNoteDocument`, so page 4 here is page 4 in the file.
 */
/** A page stops growing here — past it, lines are too long to scan. */
const SHEET_MAX = 820;

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang, user, toggleSavedNote, uploadedNotes } = useStore();
  const { palette } = useSession();
  const r = useResponsive();
  const [busy, setBusy] = useState(false);

  const note = [...uploadedNotes, ...NOTES].find((n) => n.id === String(id));
  const doc = useMemo(() => (note ? buildNoteDocument(note, lang) : null), [note, lang]);

  if (!note || !doc) {
    return (
      <View style={[s.screen, { padding: theme.space.lg }]}>
        <EmptyState
          icon="📚"
          title={lang === 'hi' ? 'नहीं मिला' : 'Not found'}
          body={lang === 'hi' ? 'ये नोट्स अब उपलब्ध नहीं हैं।' : 'These notes are no longer available.'}
        />
      </View>
    );
  }

  const hi = lang === 'hi';
  const subject = getSubject(note.subjectId);
  const saved = user.savedNoteIds.includes(note.id);

  // Sheets keep the A4 ratio once there is room for it; on a phone they grow to
  // whatever their text needs, the way any reader reflows a page to the screen.
  const sheetPad = r.isPhone ? theme.space.lg : 44;
  const sheetRatio = r.isPhone ? 0 : 1.414;

  const download = async () => {
    setBusy(true);
    try {
      await openNotePdf(note, lang);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.surfaceAlt }}>
      <Stack.Screen options={{ title: subject ? t(subject.name, lang) : 'PDF' }} />

      <ScrollView contentContainerStyle={{ paddingVertical: theme.space.lg, paddingBottom: 120 }}>
        {/* The whole viewer — toolbar included — is as wide as a page, no wider. */}
        <Content style={{ maxWidth: SHEET_MAX + 2 * r.gutter }}>
          {/* Viewer chrome — what you are looking at, and how big it is. */}
          <View
            style={[
              s.row,
              { justifyContent: 'space-between', marginBottom: theme.space.md, gap: theme.space.md },
            ]}
          >
            <View style={[s.row, { gap: 8, flex: 1 }]}>
              <View
                style={{
                  backgroundColor: theme.color.danger,
                  borderRadius: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontFamily: theme.family.bodySemi }}>
                  PDF
                </Text>
              </View>
              <Text style={s.faint} numberOfLines={1}>
                {doc.totalPages} {hi ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}{' '}
                {hi ? 'डाउनलोड' : 'downloads'}
              </Text>
            </View>
            <Pressable onPress={() => toggleSavedNote(note.id)} hitSlop={8}>
              <Text
                style={{
                  color: saved ? palette.accent : theme.color.textMuted,
                  fontFamily: theme.family.bodySemi,
                  fontSize: theme.font.sm,
                }}
              >
                {saved ? `★ ${hi ? 'सहेजा गया' : 'Saved'}` : `☆ ${hi ? 'सहेजें' : 'Save'}`}
              </Text>
            </Pressable>
          </View>

          {doc.pages.map((page) => (
            <View
              key={page.number}
              style={{
                backgroundColor: '#fff',
                borderRadius: r.isPhone ? theme.radius.md : 4,
                borderWidth: 1,
                borderColor: theme.color.border,
                padding: sheetPad,
                marginBottom: theme.space.lg,
                // A sheet never grows past a comfortable page width, however
                // wide the desk behind it gets.
                width: '100%',
                maxWidth: SHEET_MAX,
                alignSelf: 'center',
                minHeight: sheetRatio ? SHEET_MAX * sheetRatio : undefined,
                // A page casts a slight shadow onto the desk behind it.
                shadowColor: '#0f172a',
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <View
                style={[
                  s.row,
                  {
                    justifyContent: 'space-between',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.color.border,
                    paddingBottom: 8,
                    marginBottom: theme.space.lg,
                    gap: theme.space.md,
                  },
                ]}
              >
                <Text style={[s.faint, { flex: 1 }]} numberOfLines={1}>
                  {doc.subject}
                </Text>
                <Text style={s.faint} numberOfLines={1}>
                  {doc.title}
                </Text>
              </View>

              {page.kind === 'cover' ? (
                <Cover doc={doc} hi={hi} accent={palette.accent} />
              ) : (
                page.blocks.map((block) => (
                  <Block key={block.section.heading.en} block={block} lang={lang} hi={hi} />
                ))
              )}

              <View
                style={[
                  s.row,
                  {
                    justifyContent: 'space-between',
                    borderTopWidth: 1,
                    borderTopColor: theme.color.border,
                    paddingTop: 8,
                    marginTop: 'auto',
                    gap: theme.space.md,
                  },
                ]}
              >
                <Text style={s.faint} numberOfLines={1}>
                  adhyapak · {doc.author}
                </Text>
                <Text style={[s.faint, s.numeric]}>
                  {hi ? 'पृष्ठ' : 'Page'} {page.number} / {doc.totalPages}
                </Text>
              </View>
            </View>
          ))}

          <Pressable
            onPress={() =>
              router.push(
                note.topicId
                  ? `/practice/topic/${note.topicId}`
                  : `/practice/subject/${note.subjectId}`,
              )
            }
            style={{
              width: '100%',
              maxWidth: SHEET_MAX,
              alignSelf: 'center',
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: theme.color.border,
              backgroundColor: theme.color.surface,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={[s.title, { color: palette.accent }]}>
              {hi ? 'अब इस टॉपिक के प्रश्न हल करें →' : 'Now practise this topic →'}
            </Text>
          </Pressable>
        </Content>
      </ScrollView>

      {/* The file itself is always one tap away, at every scroll position. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: r.gutter,
          paddingTop: theme.space.md,
          paddingBottom: theme.space.xl,
          backgroundColor: theme.color.surface,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={download}
          disabled={busy}
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: palette.accent,
            borderRadius: theme.radius.md,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: theme.font.base, fontFamily: theme.family.display }}>
            {busy
              ? hi
                ? 'तैयार हो रहा है…'
                : 'Preparing…'
              : hi
                ? '⬇  PDF डाउनलोड करें'
                : '⬇  Download PDF'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Cover({
  doc,
  hi,
  accent,
}: {
  doc: NonNullable<ReturnType<typeof buildNoteDocument>>;
  hi: boolean;
  accent: string;
}) {
  return (
    <View style={{ paddingTop: theme.space.lg }}>
      <Text style={{ fontSize: theme.icon.xl }}>{doc.subjectIcon}</Text>
      <Text
        style={{
          marginTop: theme.space.lg,
          color: accent,
          fontSize: theme.font.xs,
          letterSpacing: 1.6,
          fontFamily: theme.family.bodySemi,
          textTransform: 'uppercase',
        }}
      >
        {doc.subject}
      </Text>
      <Text style={[s.h1, { marginTop: 6, fontSize: theme.font.xxl, lineHeight: theme.line.xxl }]}>
        {doc.title}
      </Text>
      <Text style={[s.muted, { marginTop: 8 }]}>
        {doc.author} · {doc.updated} · {doc.totalPages} {hi ? 'पृष्ठ' : 'pages'}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.space.lg }}>
        {doc.exams.map((exam) => (
          <View
            key={exam}
            style={{
              borderWidth: 1,
              borderColor: theme.color.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={s.faint}>{exam}</Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          marginTop: theme.space.xxl,
          color: theme.color.textFaint,
          fontSize: theme.font.xs,
          letterSpacing: 1.4,
          fontFamily: theme.family.bodySemi,
          textTransform: 'uppercase',
        }}
      >
        {hi ? 'विषय-सूची' : 'Contents'}
      </Text>
      {doc.pages
        .filter((p) => p.kind === 'content')
        .flatMap((p) => p.blocks.map((b) => ({ b, page: p.number })))
        .map(({ b, page }) => (
          <View
            key={b.section.heading.en}
            style={[
              s.row,
              {
                justifyContent: 'space-between',
                gap: theme.space.md,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: theme.color.border,
              },
            ]}
          >
            <Text style={[s.body, { flex: 1, fontSize: theme.font.sm }]} numberOfLines={2}>
              {b.index}. {b.section.heading.hi && hi ? b.section.heading.hi : b.section.heading.en}
            </Text>
            <Text style={[s.faint, s.numeric]}>{page}</Text>
          </View>
        ))}
    </View>
  );
}

function Block({ block, lang, hi }: { block: NoteBlock; lang: 'en' | 'hi'; hi: boolean }) {
  const { index, section } = block;
  return (
    <View style={{ marginBottom: theme.space.xl }}>
      <Text style={s.h2}>
        <Text style={{ color: theme.color.textFaint }}>{index}. </Text>
        {t(section.heading, lang)}
      </Text>
      <Text style={[s.body, { marginTop: 8 }]}>{t(section.body, lang)}</Text>

      {section.bullets?.map((b) => (
        <View key={b.en} style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Text style={{ color: theme.color.textFaint }}>▸</Text>
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
          <Text
            style={{
              color: theme.color.saffron,
              fontSize: theme.font.xs,
              letterSpacing: 1.2,
              fontFamily: theme.family.bodySemi,
            }}
          >
            {hi ? 'याद रखें' : 'REMEMBER'}
          </Text>
          <Text style={[s.body, { fontSize: theme.font.sm, marginTop: 4 }]}>
            {t(section.callout, lang)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
