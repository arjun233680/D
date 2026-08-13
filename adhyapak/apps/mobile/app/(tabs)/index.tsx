import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BATCHES,
  CURRENT_AFFAIRS,
  EXAMS,
  NOTES,
  TESTS,
  VIDEOS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  getSubject,
  liveVideos,
  t,
  theme,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/session';
import { BatchCard, ExamCard, NoteCard, TestCard, VideoCard } from '@/components/cards';
import { Badge, Content, SectionHeader, Touch, s } from '@/components/ui';
import { useResponsive } from '@/lib/responsive';

const QUICK = [
  { href: '/tests', icon: '🎯', label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' }, color: '#4F46E5' },
  { href: '/practice', icon: '✍️', label: { en: 'Practice', hi: 'अभ्यास' }, color: '#0F9D58' },
  { href: '/notes', icon: '📚', label: { en: 'Notes', hi: 'नोट्स' }, color: '#F97316' },
  { href: '/videos', icon: '🎥', label: { en: 'Videos', hi: 'वीडियो' }, color: '#DB2777' },
  { href: '/practice/pyq', icon: '📜', label: { en: 'PYQ', hi: 'विगत वर्ष' }, color: '#0891B2' },
  { href: '/doubts', icon: '💬', label: { en: 'Doubts', hi: 'शंका' }, color: '#7C3AED' },
  { href: '/current-affairs', icon: '📰', label: { en: 'Affairs', hi: 'समसामयिकी' }, color: '#DC2626' },
  { href: '/studio', icon: '⬆️', label: { en: 'Upload', hi: 'अपलोड' }, color: '#0D9488' },
] as const;

export default function HomeScreen() {
  const { lang, user, toggleLang } = useStore();
  // The hero takes the chosen exam's colour, so the app a CTET aspirant opens
  // does not look like the one an HTET aspirant opens.
  const palette = usePalette();
  const r = useResponsive();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const streak = currentStreak(user.activeDates);

  const goalBatches = BATCHES.filter((b) => b.examId === user.goalExamId);
  const goalTests = TESTS.filter((x) => x.examId === user.goalExamId);
  const goalVideos = VIDEOS.filter((v) => v.examIds.includes(user.goalExamId));
  const goalNotes = NOTES.filter((n) => n.examIds.includes(user.goalExamId));
  const allLive = liveVideos();
  const goalLive = allLive.filter((v) => v.examIds.includes(user.goalExamId));
  const live = goalLive.length ? goalLive : [];
  const subjectIds = paper ? paper.sections.map((x) => x.subjectId) : ['cdp', 'math', 'evs'];

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <Content>
        <View
          style={[
            s.row,
            { justifyContent: 'space-between', paddingVertical: theme.space.md },
          ]}
        >
          <View style={[s.row, { gap: theme.space.sm }]}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: theme.color.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>अ</Text>
            </View>
            <Text style={{ fontSize: theme.font.md, fontWeight: '800' }}>{t(UI.appName, lang)}</Text>
          </View>

          <View style={[s.row, { gap: theme.space.sm }]}>
            <Pressable
              onPress={toggleLang}
              style={{
                borderWidth: 1,
                borderColor: theme.color.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 11,
                paddingVertical: 6,
                backgroundColor: theme.color.surface,
              }}
            >
              <Text style={{ fontSize: theme.font.xs, fontWeight: '800' }}>
                <Text style={{ color: lang === 'hi' ? theme.color.primary : theme.color.textFaint }}>
                  हिं
                </Text>
                <Text style={{ color: theme.color.borderStrong }}> / </Text>
                <Text style={{ color: lang === 'en' ? theme.color.primary : theme.color.textFaint }}>
                  EN
                </Text>
              </Text>
            </Pressable>
            <Touch href="/profile" style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.color.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontSize: 16 }}>{user.avatar}</Text>
              </Touch>
          </View>
        </View>

        {/* Hero */}
        <View>
          <View
            style={{
              backgroundColor: palette.accent,
              borderRadius: theme.radius.xl,
              padding: theme.space.xl,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: theme.font.sm }}>
              {lang === 'hi' ? `नमस्ते, ${user.name} 👋` : `Hello, ${user.name} 👋`}
            </Text>
            <Text
              style={{ color: '#fff', fontSize: theme.font.xl, fontWeight: '800', marginTop: 4 }}
            >
              {exam ? t(exam.name, lang) : t(UI.tagline, lang)}
            </Text>
            {paper ? (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.sm, marginTop: 4 }}>
                {t(paper.name, lang)}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <Pill text={`🔥 ${streak} ${t(UI.streak, lang)}`} />
              {paper ? <Pill text={`🎯 ${lang === 'hi' ? 'कट-ऑफ' : 'Cut-off'} ${paper.cutoffGeneral}%`} /> : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable
                onPress={() => router.push(`/goal/${exam?.slug ?? 'ctet'}`)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: theme.font.sm, color: theme.color.ink }}>
                  {lang === 'hi' ? 'सिलेबस देखें' : 'View syllabus'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/tests')}
                style={{
                  borderColor: 'rgba(255,255,255,0.45)',
                  borderWidth: 1,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: theme.font.sm, color: '#fff' }}>
                  {lang === 'hi' ? 'निःशुल्क मॉक' : 'Free mock'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: theme.space.xl }}
        >
          {QUICK.map((q) => (
            <Touch key={q.href} href={q.href as never} style={{ width: '25%', alignItems: 'center', paddingVertical: 10 }}>
                <View
                  style={{
                    width: theme.icon.xxl,
                    height: theme.icon.xxl,
                    borderRadius: theme.radius.md,
                    backgroundColor: `${q.color}1a`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: theme.icon.md }}>{q.icon}</Text>
                </View>
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontFamily: theme.family.bodyMedium,
                    color: theme.color.text,
                    marginTop: 8,
                  }}
                  numberOfLines={1}
                >
                  {t(q.label, lang)}
                </Text>
              </Touch>
          ))}
        </View>

        </Content>

        {live.length ? (
          <Section title={lang === 'hi' ? 'अभी लाइव' : 'Live right now'}>
            {live.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </Section>
        ) : null}

        <Section
          title={lang === 'hi' ? `${exam?.shortName} बैच` : `${exam?.shortName} batches`}
          href="/batches"
          action={lang === 'hi' ? 'सभी देखें' : 'See all'}
        >
          {(goalBatches.length ? goalBatches : BATCHES).map((b) => (
            <BatchCard key={b.id} batch={b} />
          ))}
        </Section>

        <Section title={lang === 'hi' ? 'विषयवार अभ्यास' : 'Practice by subject'} href="/practice">
          {subjectIds.map((id) => {
            const subject = getSubject(id);
            if (!subject) return null;
            return (
              <Touch key={id} href={`/practice/subject/${id}`} style={[
                    s.card,
                    {
                      width: 128,
                      marginRight: theme.space.md,
                      alignItems: 'center',
                      paddingVertical: theme.space.lg,
                    },
                  ]}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: `${subject.color}1a`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{subject.icon}</Text>
                  </View>
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', marginTop: 8, textAlign: 'center' }}
                    numberOfLines={2}
                  >
                    {t(subject.name, lang)}
                  </Text>
                </Touch>
            );
          })}
        </Section>

        <Section title={t(UI.tests, lang)} href="/tests">
          {(goalTests.length ? goalTests : TESTS).map((x) => (
            <TestCard key={x.id} test={x} />
          ))}
        </Section>

        <Section title={t(UI.videos, lang)} href="/videos">
          {(goalVideos.length ? goalVideos : VIDEOS).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </Section>

        <Section title={t(UI.notes, lang)} href="/notes">
          {(goalNotes.length ? goalNotes : NOTES).map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </Section>

        <Section
          title={lang === 'hi' ? 'सभी शिक्षक परीक्षाएँ' : 'All teaching exams'}
          href="/explore"
        >
          {EXAMS.map((e) => (
            <ExamCard key={e.id} exam={e} />
          ))}
        </Section>

        <View style={{ marginTop: theme.space.xl }}>
          <SectionHeader
            title={lang === 'hi' ? 'शिक्षा समसामयिकी' : 'Education current affairs'}
            href="/current-affairs"
            action={lang === 'hi' ? 'सभी देखें' : 'See all'}
          />
          <View style={{ paddingHorizontal: theme.space.lg, gap: theme.space.md }}>
            {CURRENT_AFFAIRS.slice(0, 3).map((ca) => (
              <View key={ca.id} style={[s.card, { padding: theme.space.lg }]}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {ca.tags.map((tag) => (
                    <Badge key={tag.en} tone="info">
                      {t(tag, lang)}
                    </Badge>
                  ))}
                </View>
                <Text style={{ fontSize: theme.font.base, fontWeight: '700', marginTop: 8 }}>
                  {t(ca.title, lang)}
                </Text>
                <Text style={[s.muted, { marginTop: 4 }]} numberOfLines={3}>
                  {t(ca.summary, lang)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: theme.radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: '#fff', fontSize: theme.font.xs, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

/**
 * A horizontal rail on phones. On wide screens the cards are centred with the
 * rest of the page instead of starting hard against the left edge.
 */
function Rail({ children }: { children: React.ReactNode }) {
  const r = useResponsive();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: r.gutter,
        width: r.isDesktop ? undefined : undefined,
      }}
      style={{ width: '100%', maxWidth: r.maxWidth, alignSelf: 'center' }}
    >
      {children}
    </ScrollView>
  );
}

function Section({
  title,
  href,
  action,
  children,
}: {
  title: string;
  href?: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: theme.space.xl }}>
      <SectionHeader title={title} href={href} action={action} />
      <Rail>{children}</Rail>
    </View>
  );
}
