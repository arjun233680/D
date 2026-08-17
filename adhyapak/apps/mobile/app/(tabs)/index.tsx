import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BATCHES,
  TESTS,
  currentStreak,
  formatDate,
  getExam,
  getPaper,
  getSubject,
  getTopic,
  liveVideos,
  recommendedTopics,
  subjectsForPaperOrEmpty,
  t,
  theme,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { usePalette } from '@/lib/session';
import { useResponsive } from '@/lib/responsive';
import { Content, s } from '@/components/ui';

/**
 * Dashboard.
 *
 * Answers one question: what should I do right now. Anything merely browsable —
 * batches, the test catalogue, notes, videos, current affairs — lives in its own
 * tab or in the library row, so the dashboard never shows the same rail twice.
 * What stays is what a browse screen cannot give: how far away the exam is,
 * whether the streak is alive, what to practise next, and what changed in this
 * exam's cycle.
 */

/** Shortcuts to sections that do NOT have their own tab, so nothing is duplicated. */
const SHORTCUTS = [
  { href: '/notes', icon: '📚', label: { en: 'Notes', hi: 'नोट्स' }, color: '#F97316' },
  { href: '/videos', icon: '🎥', label: { en: 'Videos', hi: 'वीडियो' }, color: '#DB2777' },
  { href: '/practice/pyq', icon: '📜', label: { en: 'Previous year', hi: 'विगत वर्ष' }, color: '#0891B2' },
  { href: '/doubts', icon: '💬', label: { en: 'Doubts', hi: 'शंका' }, color: '#7C3AED' },
  { href: '/current-affairs', icon: '📰', label: { en: 'Affairs', hi: 'समसामयिकी' }, color: '#DC2626' },
  { href: '/studio', icon: '⬆️', label: { en: 'Upload', hi: 'अपलोड' }, color: '#0D9488' },
] as const;

const daysUntil = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / 86_400_000) : null;
};

export default function DashboardScreen() {
  const { lang, user, results, toggleLang } = useStore();
  const palette = usePalette();
  const r = useResponsive();
  const hi = lang === 'hi';

  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const streak = currentStreak(user.activeDates);
  const attempts = Object.values(results);

  const countdown = daysUntil(exam?.nextExamDate);
  const avgAccuracy = attempts.length
    ? Math.round(attempts.reduce((sum, x) => sum + x.accuracy, 0) / attempts.length)
    : 0;

  // What to do next, in priority order.
  const dailyQuiz = TESTS.find((x) => x.type === 'daily-quiz');
  const nextMock = TESTS.find((x) => x.examId === user.goalExamId && x.type === 'mock' && !results[x.id]);
  const weakTopicId = attempts.flatMap((x) => x.weakTopics)[0]?.topicId;
  // Empty when the paper has an unresolved elective: the home feed then
  // suggests nothing rather than suggesting somebody else's subject.
  const subjectIds = subjectsForPaperOrEmpty(paper?.id, user.electiveSubjectId);
  const suggested = weakTopicId ? getTopic(weakTopicId) : recommendedTopics(subjectIds, 1)[0];

  const live = liveVideos().filter((v) => v.examIds.includes(user.goalExamId));
  // This exam's dashboard, so an enrolment from a previous goal does not belong
  // on it. It is still on the batches tab, where your own enrolments live.
  const myBatch = BATCHES.find(
    (b) => b.examId === user.goalExamId && user.enrolledBatchIds.includes(b.id),
  );
  // Only updates that have not already happened, newest first.
  const upcoming = (exam?.updates ?? []).filter((u) => new Date(u.date).getTime() >= Date.now() - 86_400_000);
  const timeline = (upcoming.length ? upcoming : (exam?.updates ?? []).slice(-2)).slice(0, 2);

  // Ordered by what a candidate opens the app for. The first becomes the
  // primary card; the rest are quieter rows. Every row used to carry the same
  // filled accent pill, so the section that exists to answer "what should I do
  // first" answered it four times at once.
  const actions = [
    dailyQuiz && {
      key: 'quiz',
      icon: '⚡',
      tint: theme.color.primaryLight,
      title: hi ? 'आज की प्रश्नोत्तरी' : "Today's quiz",
      sub: `10 ${hi ? 'प्रश्न' : 'questions'} · 10 ${hi ? 'मिनट' : 'min'}`,
      cta: hi ? 'शुरू करें' : 'Start',
      accent: palette.accent,
      go: () => router.push(`/test/${dailyQuiz.id}`),
    },
    suggested && {
      key: 'topic',
      icon: '🎯',
      tint: theme.color.warningLight,
      title: weakTopicId
        ? hi ? 'कमज़ोर टॉपिक सुधारें' : 'Fix your weak topic'
        : hi ? 'सर्वाधिक भार वाला टॉपिक' : 'Highest-weightage topic',
      sub: `${getSubject(suggested.subjectId)?.icon ?? ''} ${t(suggested.name, lang)}`,
      cta: hi ? 'अभ्यास करें' : 'Practise',
      accent: palette.accent,
      go: () => router.push(`/practice/topic/${suggested.id}`),
    },
    nextMock && {
      key: 'mock',
      icon: '📝',
      tint: theme.color.accentLight,
      title: hi ? 'अगला मॉक टेस्ट' : 'Next mock test',
      sub: t(nextMock.title, lang),
      cta: hi ? 'टेस्ट दें' : 'Attempt',
      accent: palette.accent,
      go: () => router.push(`/test/${nextMock.id}`),
    },
    myBatch && {
      key: 'batch',
      icon: '🎓',
      tint: theme.color.infoLight,
      title: hi ? 'आपका बैच' : 'Your batch',
      sub: t(myBatch.title, lang),
      cta: hi ? 'खोलें' : 'Open',
      accent: palette.accent,
      go: () => router.push(`/batch/${myBatch.id}`),
    },
  ].filter(Boolean) as ActionItem[];

  // A live class outranks the list while it is on air, and only while it is.
  const liveNow = live[0];

  const updates = timeline.length ? (
    <>
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: theme.space.md }]}>
        <Eyebrow text={hi ? `${exam?.shortName} अपडेट` : `${exam?.shortName} updates`} flush />
        <Pressable onPress={() => (exam ? router.push(`/goal/${exam.slug}`) : undefined)}>
          <Text style={{ color: palette.accent, fontFamily: theme.family.bodySemi, fontSize: theme.font.sm }}>
            {hi ? 'सभी' : 'All'}
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: theme.space.sm }}>
        {timeline.map((u) => (
          <View key={`${u.date}-${u.title.en}`} style={[s.card, { padding: theme.space.lg }]}>
            <Text style={[s.faint, { fontFamily: theme.family.bodySemi, color: palette.accent }]}>
              {formatDate(u.date, lang)}
            </Text>
            <Text style={[s.title, { marginTop: 4 }]}>{t(u.title, lang)}</Text>
            <Text style={[s.muted, { marginTop: 4 }]}>{t(u.detail, lang)}</Text>
          </View>
        ))}
      </View>
    </>
  ) : null;

  const today = formatDate(new Date().toISOString().slice(0, 10), lang);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space.xxxl }} showsVerticalScrollIndicator={false}>
        <Content>
          {/* -------------------------------------------------------- the day
              A prep app is opened daily, so the screen names the day rather
              than repeating the app's own name back at somebody who just
              tapped its icon. The date runs through `formatDate`, which is
              deterministic — the platform's own formatter disagrees between
              runtimes and broke the website's hydration when it was trusted. */}
          <View style={[s.row, { justifyContent: 'space-between', paddingVertical: theme.space.md }]}>
            <View style={[s.row, { gap: 8, alignItems: 'baseline' }]}>
              <Text style={{ fontSize: theme.font.xl, fontFamily: theme.family.displayBold }}>
                {hi ? 'आज' : 'Today'}
              </Text>
              <Text style={[s.faint, { fontFamily: theme.family.bodySemi }]}>{today}</Text>
            </View>
            <View style={[s.row, { gap: theme.space.sm }]}>
              <Pressable
                onPress={toggleLang}
                style={{
                  borderWidth: 1,
                  borderColor: theme.color.border,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  backgroundColor: theme.color.surface,
                }}
              >
                <Text style={{ fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
                  {hi ? 'EN' : 'हिं'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/profile')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.color.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 17 }}>{user.avatar}</Text>
              </Pressable>
            </View>
          </View>

          {/* ---------------------------------------------------- the deadline
              Slim: the countdown is the reason to open the app on a Tuesday,
              and the rest of the exam's detail lives on its own screen. */}
          <Pressable
            onPress={() => (exam ? router.push(`/goal/${exam.slug}`) : undefined)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.lg,
              backgroundColor: palette.accent,
              borderRadius: theme.radius.xl,
              paddingHorizontal: theme.space.lg,
              paddingVertical: theme.space.lg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: '#fff', fontSize: theme.font.md, fontFamily: theme.family.displayBold }}
                numberOfLines={1}
              >
                {exam ? t(exam.name, lang) : ''}
              </Text>
              {paper ? (
                <Text
                  style={{ color: 'rgba(255,255,255,0.8)', fontSize: theme.font.xs, marginTop: 2 }}
                  numberOfLines={1}
                >
                  {t(paper.name, lang)}
                </Text>
              ) : null}
            </View>
            {countdown !== null ? (
              <HeroFigure value={`${countdown}`} label={hi ? 'दिन शेष' : 'days left'} />
            ) : paper ? (
              <HeroFigure value={`${paper.cutoffGeneral}%`} label={hi ? 'कट-ऑफ' : 'cut-off'} />
            ) : null}
          </Pressable>

          {/* ----------------------------------------------------- two figures
              Both counted from the learner's own record. Deliberately no
              "0 / 2 practice": a daily target implies a study plan this app
              does not have, and a bar against nothing is a bar against nothing. */}
          <View style={{ flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.lg }}>
            <Tile
              label={hi ? 'श्रृंखला' : 'Streak'}
              value={`${streak}`}
              unit={hi ? 'दिन' : streak === 1 ? 'day' : 'days'}
              foot={streak > 0 ? (hi ? 'बनाए रखिए' : 'Keep it going') : hi ? 'आज से शुरू कीजिए' : 'Start it today'}
              color={theme.color.warning}
            />
            <Tile
              label={hi ? 'बुकमार्क' : 'Bookmarks'}
              value={`${user.bookmarkedQuestionIds.length}`}
              unit={hi ? 'प्रश्न' : 'saved'}
              foot={hi ? 'दोबारा हल करें →' : 'Practise them →'}
              color={theme.color.accent}
              onPress={() => router.push('/practice/bookmarks')}
            />
          </View>

          {/* ------------------------------------------ the one thing to do now */}
          <View style={{ marginTop: theme.space.lg }}>
            {liveNow ? (
              <FeatureRow
                icon="🔴"
                tint={theme.color.danger}
                label={hi ? 'अभी लाइव' : 'Live now'}
                title={t(liveNow.title, lang)}
                cta={hi ? 'जुड़ें' : 'Join'}
                accent={theme.color.danger}
                onPress={() => router.push(`/video/${liveNow.id}`)}
              />
            ) : actions[0] ? (
              <FeatureRow
                icon={actions[0].icon}
                tint={palette.accent}
                label={hi ? 'आज का अभ्यास' : "Today's practice"}
                title={actions[0].title}
                sub={actions[0].sub}
                cta={actions[0].cta}
                accent={palette.accent}
                onPress={actions[0].go}
              />
            ) : null}
          </View>

          {/* ------------------------------------------------------- the rest */}
          <View style={{ gap: theme.space.sm, marginTop: theme.space.sm }}>
            {actions.slice(liveNow ? 0 : 1).map((a) => (
              <Row key={a.key} icon={a.icon} tint={a.tint} title={a.title} sub={a.sub} onPress={a.go} />
            ))}
          </View>

          {/* --------------------------------------------------------- shortcuts
              Tiles rather than the chip row, in the softer style: a tinted
              square, one word under it. */}
          <Text
            style={{
              fontSize: theme.font.md,
              fontFamily: theme.family.displayBold,
              marginTop: theme.space.xxl,
              marginBottom: theme.space.md,
            }}
          >
            {hi ? 'सामग्री' : 'Quick access'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {SHORTCUTS.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as never)}
                style={{
                  width: r.isPhone ? '33.333%' : '16.666%',
                  alignItems: 'center',
                  paddingVertical: theme.space.md,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: `${item.color}1f`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                </View>
                <Text
                  style={{
                    fontSize: theme.font.xs,
                    fontFamily: theme.family.bodySemi,
                    color: theme.color.text,
                    marginTop: 8,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {t(item.label, lang)}
                </Text>
              </Pressable>
            ))}
          </View>

          {updates ? <View style={{ marginTop: theme.space.xxl }}>{updates}</View> : null}
        </Content>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One counted figure, in the soft-tile style. */
function Tile({
  label,
  value,
  unit,
  foot,
  color,
  onPress,
}: {
  label: string;
  value: string;
  unit: string;
  foot: string;
  color: string;
  onPress?: () => void;
}) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      style={[s.card, { flex: 1, padding: theme.space.lg }]}
    >
      <Text
        style={{
          fontSize: theme.font.xs,
          fontFamily: theme.family.bodySemi,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 }}>
        <Text style={[s.numeric, { fontSize: 26 }]}>{value}</Text>
        <Text style={s.muted}>{unit}</Text>
      </View>
      <Text style={[s.faint, { marginTop: 6, color: onPress ? color : theme.color.textMuted }]}>
        {foot}
      </Text>
    </Wrap>
  );
}

/** The single most important thing to do, with its own button. */
function FeatureRow({
  icon,
  tint,
  label,
  title,
  sub,
  cta,
  accent,
  onPress,
}: {
  icon: string;
  tint: string;
  label: string;
  title: string;
  sub?: string;
  cta: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.card,
        s.row,
        { padding: theme.space.lg, gap: theme.space.md, borderColor: `${accent}59` },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1f`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 21 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: theme.font.xs,
            fontFamily: theme.family.bodySemi,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {label}
        </Text>
        <Text style={[s.title, { marginTop: 2 }]} numberOfLines={1}>
          {title}
        </Text>
        {/* On its own line: joined with the title it truncated the part that
            says what the thing costs you — "10 questions · 10 min". */}
        {sub ? (
          <Text style={s.muted} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: accent,
          borderRadius: theme.radius.pill,
          paddingHorizontal: 15,
          paddingVertical: 9,
        }}
      >
        <Text style={{ color: '#fff', fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
          {cta}
        </Text>
      </View>
    </Pressable>
  );
}

/** A quieter row: icon, two lines, a chevron. */
function Row({
  icon,
  tint,
  title,
  sub,
  onPress,
}: {
  icon: string;
  tint: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.card, s.row, { padding: theme.space.md, gap: theme.space.md }]}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.md,
          backgroundColor: `${tint}1f`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.muted} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={{ color: theme.color.border, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

interface ActionItem {
  key: string;
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
  accent: string;
  go: () => void;
}

/**
 * A section label.
 *
 * A small tracked-out uppercase line rather than another `s.h2`: with four
 * headings at that weight down one screen, the labels competed with the content
 * they were labelling.
 */
function Eyebrow({ text, flush }: { text: string; flush?: boolean }) {
  return (
    <Text
      style={{
        fontSize: theme.font.xs,
        fontFamily: theme.family.bodySemi,
        color: theme.color.textFaint,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        marginBottom: flush ? 0 : theme.space.md,
      }}
    >
      {text}
    </Text>
  );
}

/** One figure in the goal card — the number first, what it means underneath. */
function HeroFigure({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text
        style={{
          color: '#fff',
          fontSize: 32,
          lineHeight: 34,
          fontFamily: theme.family.displayBold,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontSize: theme.font.xs,
          fontFamily: theme.family.bodySemi,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginTop: 5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

