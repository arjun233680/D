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

  const plan = (
    <>
      <Eyebrow text={hi ? 'आज क्या करें' : 'What to do today'} />
      <View style={{ gap: theme.space.sm }}>
        {liveNow ? (
          <Action
            icon="🔴"
            tint={theme.color.dangerLight}
            title={hi ? 'अभी लाइव क्लास' : 'Live class now'}
            sub={t(liveNow.title, lang)}
            cta={hi ? 'जुड़ें' : 'Join'}
            accent={theme.color.danger}
            primary
            onPress={() => router.push(`/video/${liveNow.id}`)}
          />
        ) : null}

        {actions.map((a, i) => (
          <Action
            key={a.key}
            icon={a.icon}
            tint={a.tint}
            title={a.title}
            sub={a.sub}
            cta={a.cta}
            accent={a.accent}
            primary={!liveNow && i === 0}
            onPress={a.go}
          />
        ))}
      </View>
    </>
  );

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

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space.xxxl }} showsVerticalScrollIndicator={false}>
        <Content>
          {/* Identity bar */}
          <View style={[s.row, { justifyContent: 'space-between', paddingVertical: theme.space.md }]}>
            <View style={[s.row, { gap: theme.space.sm }]}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: palette.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontFamily: theme.family.displayBold, fontSize: 17 }}>अ</Text>
              </View>
              <Text style={{ fontSize: theme.font.md, fontFamily: theme.family.display }}>
                {t(UI.appName, lang)}
              </Text>
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

          {/* Goal card — the exam, the paper, and how long is left. On a wide
              screen the three metrics sit beside it instead of under it. */}
          <View style={{ flexDirection: r.isPhone ? 'column' : 'row', gap: theme.space.lg }}>
            <Pressable
              onPress={() => (exam ? router.push(`/goal/${exam.slug}`) : undefined)}
              style={{
                flex: r.isPhone ? undefined : 2,
                backgroundColor: palette.accent,
                borderRadius: theme.radius.xl,
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.xxl,
              }}
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: theme.font.xs,
                  fontFamily: theme.family.bodySemi,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {hi ? 'आपका लक्ष्य' : 'Your goal'}
              </Text>
              <Text
                style={{
                  color: '#fff',
                  fontSize: r.isPhone ? theme.font.lg : theme.font.xl,
                  lineHeight: r.isPhone ? theme.line.lg : theme.line.xl,
                  fontFamily: theme.family.displayBold,
                  marginTop: 6,
                }}
              >
                {exam ? t(exam.name, lang) : ''}
              </Text>
              {paper ? (
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: theme.font.sm, fontFamily: theme.family.body, marginTop: 3 }}>
                  {t(paper.name, lang)}
                </Text>
              ) : null}

              {/* Set as display numerals rather than another row of pills: the
                  countdown is the only figure here that moves on its own and
                  the only one a candidate checks daily. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.xl, marginTop: theme.space.xl }}>
                {countdown !== null ? (
                  <HeroFigure value={`${countdown}`} label={hi ? 'दिन शेष' : 'days left'} />
                ) : null}
                {paper ? (
                  <HeroFigure value={`${paper.cutoffGeneral}%`} label={hi ? 'कट-ऑफ' : 'cut-off'} />
                ) : null}
                {exam?.vacancies ? (
                  <HeroFigure
                    value={exam.vacancies.toLocaleString('en-IN')}
                    label={hi ? 'पद' : 'posts'}
                  />
                ) : null}
              </View>
            </Pressable>

            {/* Progress, or the reason there is none yet.
                Three metrics reading 0, 0 and 0% used to sit here at the same
                weight as the goal itself — the loudest thing on a new learner's
                first screen was three zeros. Until there is something to
                report, the space says what to do instead. */}
            {attempts.length ? (
              <View
                style={[
                  s.card,
                  { flex: r.isPhone ? undefined : 1, padding: theme.space.lg, justifyContent: 'center' },
                ]}
              >
                <Eyebrow text={hi ? 'आपकी प्रगति' : 'Your progress'} />
                <View style={{ flexDirection: 'row', gap: theme.space.md }}>
                  <Metric label={hi ? 'श्रृंखला' : 'Streak'} value={`${streak}`} unit={hi ? 'दिन' : 'days'} accent={palette.accent} />
                  <Metric label={hi ? 'टेस्ट' : 'Tests'} value={`${attempts.length}`} unit={hi ? 'पूर्ण' : 'done'} accent={theme.color.accent} />
                  <Metric label={hi ? 'शुद्धता' : 'Accuracy'} value={`${avgAccuracy}%`} unit={hi ? 'औसत' : 'avg'} accent={theme.color.success} />
                </View>
              </View>
            ) : (
              <View
                style={[
                  s.card,
                  { flex: r.isPhone ? undefined : 1, padding: theme.space.lg, justifyContent: 'center', gap: 10 },
                ]}
              >
                <Eyebrow text={hi ? 'शुरुआत करें' : 'Get started'} />
                <Text style={[s.title, { lineHeight: theme.line.base }]}>
                  {hi
                    ? 'पहला टेस्ट दीजिए — उसके बाद यहाँ आपकी श्रृंखला, शुद्धता और कमज़ोर टॉपिक दिखेंगे।'
                    : 'Sit your first test — your streak, accuracy and weak topics appear here afterwards.'}
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/tests')}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: palette.accent,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
                    {hi ? 'टेस्ट सीरीज़ खोलें' : 'Open test series'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Library — shortcuts to the sections that carry the material.
              Directly under the goal as a quick-access row: six large tiles
              used to take a full band of a phone screen to say what a row of
              chips says, so promoting it now costs almost no height and does
              not push the day's work off the first screen. */}
          <View style={{ marginTop: theme.space.xxl }}>
            <Eyebrow text={hi ? 'सामग्री' : 'Library'} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
            {SHORTCUTS.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as never)}
                style={[
                  s.card,
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 9,
                    paddingLeft: 9,
                    paddingRight: 14,
                    paddingVertical: 9,
                  },
                ]}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    backgroundColor: `${item.color}1a`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 15 }}>{item.icon}</Text>
                </View>
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontFamily: theme.family.bodySemi,
                    color: theme.color.text,
                  }}
                  numberOfLines={1}
                >
                  {t(item.label, lang)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Today's plan, and this exam's cycle updates beside it on desktop */}
          {r.isDesktop && updates ? (
            <View style={{ flexDirection: 'row', gap: theme.space.xxl, marginTop: theme.space.xxl }}>
              <View style={{ flex: 1.6 }}>{plan}</View>
              <View style={{ flex: 1 }}>{updates}</View>
            </View>
          ) : (
            <>
              <View style={{ marginTop: theme.space.xxl }}>{plan}</View>
              {updates ? <View style={{ marginTop: theme.space.xxl }}>{updates}</View> : null}
            </>
          )}

        </Content>
      </ScrollView>
    </SafeAreaView>
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

function Metric({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.numeric, { fontSize: theme.font.xl, color: accent }]}>{value}</Text>
      <Text style={[s.faint, { marginTop: 3 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.faint, { color: theme.color.textFaint }]} numberOfLines={1}>
        {unit}
      </Text>
    </View>
  );
}

/**
 * A single next-step row: what it is, why, and one button.
 *
 * `primary` is given to exactly one row on the screen. Every row used to carry
 * the same filled accent pill, so the section that exists to answer "what
 * should I do first" answered it four times at once. The primary row is
 * slightly taller and tinted and keeps the filled button; the rest get a quiet
 * outline.
 */
function Action({
  icon,
  tint,
  title,
  sub,
  cta,
  accent,
  primary = false,
  onPress,
}: {
  icon: string;
  tint: string;
  title: string;
  sub: string;
  cta: string;
  accent: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const size = primary ? 46 : 40;
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.card,
        s.row,
        {
          padding: primary ? theme.space.lg : theme.space.md,
          gap: theme.space.md,
        },
        primary ? { borderColor: `${accent}59`, backgroundColor: `${accent}0d` } : null,
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: theme.radius.md,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: primary ? 22 : 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[s.muted, { marginTop: 2 }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {primary ? (
        <View
          style={{
            backgroundColor: accent,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 16,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: '#fff', fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
            {cta}
          </Text>
        </View>
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.color.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 13,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: accent, fontSize: theme.font.xs, fontFamily: theme.family.bodySemi }}>
            {cta}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
