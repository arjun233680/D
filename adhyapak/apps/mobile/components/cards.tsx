import { Text, View } from 'react-native';
import {
  buildNoteDocument,
  formatCount,
  formatDuration,
  getEducator,
  getExam,
  getSubject,
  t,
  testQuestionCount,
  theme,
  type Batch,
  type Exam,
  type Note,
  type Test,
  type Video,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, Touch, s } from './ui';

/** A flat colour block stands in for a thumbnail — no network, no layout shift. */
function Thumb({ color, emoji, height = 128 }: { color: string; emoji: string; height?: number }) {
  return (
    <View
      style={{
        height,
        backgroundColor: color,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: theme.space.md,
      }}
    >
      <Text style={{ fontSize: 30, opacity: 0.85 }}>{emoji}</Text>
    </View>
  );
}

export function ExamCard({ exam }: { exam: Exam }) {
  const { lang } = useStore();
  return (
    <Touch href={`/goal/${exam.slug}`} style={[s.card, { width: 200, marginRight: theme.space.md, overflow: 'hidden' }]}>
        <View
          style={{
            height: 74,
            backgroundColor: exam.color,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.space.lg,
            gap: theme.space.sm,
          }}
        >
          <Text style={{ fontSize: 26 }}>{exam.emoji}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: theme.font.md }}>
            {exam.shortName}
          </Text>
        </View>
        <View style={{ padding: theme.space.md }}>
          <Text style={{ fontSize: theme.font.sm, fontWeight: '700' }} numberOfLines={2}>
            {t(exam.name, lang)}
          </Text>
          <Text style={[s.faint, { marginTop: 6 }]}>
          </Text>
        </View>
      </Touch>
  );
}

export function BatchCard({ batch, full }: { batch: Batch; full?: boolean }) {
  const { lang, user } = useStore();
  const exam = getExam(batch.examId);
  const enrolled = user.enrolledBatchIds.includes(batch.id);

  return (
    <Touch href={`/batch/${batch.id}`} style={[
          s.card,
          {
            width: full ? undefined : 280,
            marginRight: full ? 0 : theme.space.md,
            marginBottom: full ? theme.space.md : 0,
            overflow: 'hidden',
          },
        ]}>
        <Thumb color={batch.color} emoji={exam?.emoji ?? '📘'} />
        <View style={{ padding: theme.space.md }}>
          <View style={[s.row, { gap: 6, marginBottom: 6 }]}>
            <AccessBadge access={batch.access} lang={lang} />
            {enrolled ? <Badge tone="success">{lang === 'hi' ? 'नामांकित' : 'Enrolled'}</Badge> : null}
          </View>
          <Text style={{ fontSize: theme.font.base, fontWeight: '700' }} numberOfLines={2}>
            {t(batch.title, lang)}
          </Text>
          <Text style={[s.faint, { marginTop: 4 }]} numberOfLines={1}>
            {t(batch.schedule, lang)}
          </Text>
        </View>
      </Touch>
  );
}

export function VideoCard({ video, full }: { video: Video; full?: boolean }) {
  const { lang } = useStore();
  const educator = getEducator(video.educatorId);
  const subject = getSubject(video.subjectId);

  return (
    <Touch href={`/video/${video.id}`} style={[
          s.card,
          {
            width: full ? undefined : 250,
            marginRight: full ? 0 : theme.space.md,
            marginBottom: full ? theme.space.md : 0,
            overflow: 'hidden',
          },
        ]}>
        <View>
          <Thumb color={video.thumbnail} emoji={subject?.icon ?? '🎬'} height={116} />
          <View
            style={{
              position: 'absolute',
              top: theme.space.sm,
              left: theme.space.sm,
              flexDirection: 'row',
              gap: 6,
            }}
          >
            {video.isLive ? <Badge tone="danger">● {lang === 'hi' ? 'लाइव' : 'LIVE'}</Badge> : null}
            <AccessBadge access={video.access} lang={lang} />
          </View>
          <View
            style={{
              position: 'absolute',
              right: theme.space.sm,
              bottom: theme.space.sm,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#fff', fontSize: theme.font.xs, fontWeight: '700' }}>
              {formatDuration(video.durationSeconds)}
            </Text>
          </View>
        </View>
        <View style={{ padding: theme.space.md }}>
          <Text style={{ fontSize: theme.font.sm, fontWeight: '700' }} numberOfLines={2}>
            {t(video.title, lang)}
          </Text>
          <Text style={[s.faint, { marginTop: 4 }]} numberOfLines={1}>
            {educator?.avatar} {educator?.name}
          </Text>
        </View>
      </Touch>
  );
}

export function NoteCard({ note, full }: { note: Note; full?: boolean }) {
  const { lang } = useStore();
  const subject = getSubject(note.subjectId);
  // The card promises the same page count the PDF actually opens with.
  const pages = buildNoteDocument(note, lang).totalPages;

  return (
    <Touch href={`/note/${note.id}`} style={[
          s.card,
          {
            width: full ? undefined : 240,
            marginRight: full ? 0 : theme.space.md,
            marginBottom: full ? theme.space.md : 0,
            padding: theme.space.md,
          },
        ]}>
        <View style={[s.row, { gap: theme.space.md }]}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: theme.radius.md,
              backgroundColor: `${subject?.color ?? theme.color.accent}1a`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{subject?.icon ?? '📄'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: '700' }} numberOfLines={2}>
              {t(note.title, lang)}
            </Text>
            <Text style={[s.faint, { marginTop: 3 }]}>
              {pages} {lang === 'hi' ? 'पृष्ठ' : 'pages'} · {formatCount(note.downloads)}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: theme.space.md, flexDirection: 'row', gap: 6 }}>
          <AccessBadge access={note.access} lang={lang} />
          {/* Says up front what opens on tap. */}
          <Badge tone="danger">PDF</Badge>
        </View>
      </Touch>
  );
}

export function TestCard({ test, full }: { test: Test; full?: boolean }) {
  const { lang, results } = useStore();
  const exam = getExam(test.examId);
  const result = results[test.id];
  const count = testQuestionCount(test);

  const typeLabel: Record<Test['type'], { en: string; hi: string }> = {
    mock: { en: 'Full Mock', hi: 'पूर्ण मॉक' },
    pyq: { en: 'Previous Year', hi: 'विगत वर्ष' },
    sectional: { en: 'Sectional', hi: 'सेक्शनल' },
    'daily-quiz': { en: 'Daily Quiz', hi: 'दैनिक क्विज़' },
  };

  return (
    <Touch href={`/test/${test.id}`} style={[
          s.card,
          {
            width: full ? undefined : 260,
            marginRight: full ? 0 : theme.space.md,
            marginBottom: full ? theme.space.md : 0,
            padding: theme.space.lg,
          },
        ]}>
        <View style={[s.row, { gap: 6 }]}>
          <Badge tone="accent">{t(typeLabel[test.type], lang)}</Badge>
          <AccessBadge access={test.access} lang={lang} />
        </View>
        <Text style={{ fontSize: theme.font.base, fontWeight: '700', marginTop: 8 }} numberOfLines={2}>
          {t(test.title, lang)}
        </Text>
        <Text style={[s.faint, { marginTop: 6 }]}>
          {count} {lang === 'hi' ? 'प्रश्न' : 'Qs'} · {test.durationMinutes} min · {exam?.shortName}
        </Text>
        {result ? (
          <View
            style={{
              marginTop: 10,
              backgroundColor: theme.color.surfaceAlt,
              borderRadius: theme.radius.sm,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontSize: theme.font.sm, fontWeight: '700' }}>
              <Text style={{ color: theme.color.textMuted }}>
                {lang === 'hi' ? 'स्कोर' : 'Score'}:{' '}
              </Text>
              <Text style={{ color: result.qualified ? theme.color.success : theme.color.danger }}>
                {result.score}/{result.maxScore}
              </Text>
            </Text>
          </View>
        ) : null}
      </Touch>
  );
}
