import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import {
  currentStreak,
  listExams,
  listExamLevelSubjects,
  listLevelSubjects,
  listLevels,
  listLevelsForExams,
  nextOnboardingStep,
  t,
  theme,
  type Exam,
  type Level,
  type LevelSubject,
} from '@adhyapak/core';
import {
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
} from '@/lib/learner';
import { useStore } from '@/lib/store';
import { gridItemWidth, useResponsive } from '@/lib/responsive';
import { CANVAS, FAINT, INK, LINE, MUTED, StepLoading, VIOLET, tint } from '@/components/onboarding';
import { Icon, type IconName } from '@/components/icons';

/**
 * The dashboard.
 *
 * Answers one question — what should I do right now — against what the learner
 * told onboarding: the exams they sit, the levels they teach at, and the
 * subject they chose for each. Every card here is one of those answers made
 * actionable.
 *
 * Laid out from the design mockup: a white panel holding the selections, a
 * Quick Access rail, a Continue panel, and a four-tile snapshot over the tab
 * bar. Every box the mockup draws is drawn here.
 *
 * WHAT IS REAL AND WHAT IS ZERO
 *
 * The mockup fills those boxes with numbers — "45% Completed", "Study Time 42
 * min", "Topics Completed 2 / 5", "60%" against a half-finished chapter. None
 * of them can be computed: nothing in the schema records a minute spent, a
 * chapter opened or a topic finished. So the boxes are here at the size and in
 * the position the design gives them, and they read zero, with one line under
 * them saying why.
 *
 * That is a deliberate difference from the picture and the only one. A
 * fabricated 45% is worse than a bar at zero, because a learner who has
 * practised nothing would be told they are nearly halfway and would plan a
 * month of revision around it. Every tile lights up on its own the day the app
 * starts recording what it claims to measure.
 *
 * The web original is apps/web/app/page.tsx and makes the same call.
 */

const QUICK = [
  {
    href: '/(tabs)/study',
    icon: 'book',
    label: { en: 'Notes', hi: 'नोट्स' },
    sub: { en: 'Study Smart', hi: 'बेहतर पढ़ाई' },
    tint: '#efeafe',
    color: '#6d4aed',
  },
  {
    href: '/prep/pyq',
    icon: 'test',
    label: { en: 'PYQ', hi: 'विगत वर्ष' },
    sub: { en: 'Previous Year Questions', hi: 'विगत वर्ष प्रश्न' },
    tint: '#e8f7ee',
    color: '#16a34a',
  },
  {
    href: '/prep/tests',
    icon: 'chart',
    label: { en: 'Test Series', hi: 'टेस्ट सीरीज़' },
    sub: { en: 'Practice & Improve', hi: 'अभ्यास एवं सुधार' },
    tint: '#e6f0fd',
    color: '#2563eb',
  },
  {
    href: '/prep/tests',
    icon: 'target',
    label: { en: 'Mock Tests', hi: 'मॉक टेस्ट' },
    sub: { en: 'Real Exam Experience', hi: 'वास्तविक परीक्षा अनुभव' },
    tint: '#fff1e6',
    color: '#ea580c',
  },
  {
    href: '/current-affairs',
    icon: 'news',
    label: { en: 'Current Affairs', hi: 'समसामयिकी' },
    sub: { en: 'Stay Updated Daily', hi: 'रोज़ अपडेट रहें' },
    tint: '#fdeaf3',
    color: '#db2777',
  },
] as const;

interface Selection {
  level: Level;
  /** Absent at levels that have no subject to choose — primary. */
  subject?: LevelSubject;
  exam?: Exam;
}

export default function DashboardScreen() {
  const { lang, user, results, ready } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();

  const [selections, setSelections] = useState<Selection[] | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [examIds, levelIds, chosen] = await Promise.all([
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
      ]);
      if (!live) return;

      const [levels, exams] = await Promise.all([listLevels(), listExams()]);
      if (!live) return;

      /*
       * The same decision the chooser makes, from the same function.
       *
       * Answering it independently here is what creates a loop: a learner who
       * chose PRT alone owns no `learner_subjects` row, so a test for "has
       * subjects" calls them unfinished while the chooser — seeing nothing
       * owed — calls them finished, and the two screens volley them forever.
       */
      if (nextOnboardingStep(examIds, levels, levelIds, chosen) !== 'done') {
        router.replace('/onboarding/exams');
        return;
      }
      const mine = exams.filter((e) => examIds.includes(e.id));
      const myLevels = levels.filter((l) => levelIds.includes(l.id));

      /*
       * One card per exam-and-level pair, which is what the learner actually
       * holds.
       *
       * It used to be one card per level, with an exam paired off by array
       * index — the code said in as many words that this was a presentation
       * choice rather than a claim, because the data could not say which exam
       * a level belonged to. It can now: `learner_subjects` is keyed on the
       * exam, and `exam_levels` says which exams run which levels. Somebody
       * sitting CTET and HTET at both PRT and TGT has four answers and was
       * being shown two, one of them stamped with the wrong exam.
       */
      const built: Selection[] = [];
      for (const exam of mine) {
        const runs = await listLevelsForExams([exam.id]);
        if (!live) return;
        for (const level of myLevels) {
          const labelled = runs.find((l) => l.id === level.id);
          if (!labelled) continue;
          const pick = chosen.find((c) => c.examId === exam.id && c.levelId === level.id);
          /*
           * The board's own list, not the generic one. `level_subjects.tgt`
           * has no "Mathematics & Science", so looking a CTET answer up there
           * found nothing and the card fell back to the level's full name —
           * "Trained Graduate Teacher" where the learner had chosen a subject.
           */
          const offers = pick
            ? await listExamLevelSubjects(exam.id, level.id, level.teachingLevels)
            : [];
          if (!live) return;
          built.push({
            level: labelled,
            subject: pick ? offers.find((o) => o.subjectId === pick.subjectId) : undefined,
            exam,
          });
        }
      }

      setSelections(built);
    })();
    return () => {
      live = false;
    };
  }, []);

  const streak = useMemo(() => currentStreak(user.activeDates ?? []), [user.activeDates]);
  const solved = Object.keys(results ?? {}).length;

  if (!ready || selections === null) {
    return <StepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  // The mockup shows two selection cards side by side with the second clipped,
  // which is what says "scrollable". The card reads across now rather than
  // down — symbol, exam, level, subject on one line — so it needs more width
  // and far less height than the stacked version it replaced.
  const selectionWidth = r.isPhone ? Math.min(r.width * 0.78, 300) : 320;
  // Two snapshot tiles per row on a phone, four once there is room.
  const tileW = gridItemWidth(r, r.isPhone ? 2 : 4);

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View
            style={{
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
              paddingHorizontal: r.gutter,
              paddingTop: 8,
            }}
          >
            {/* ------------------------------------------------- top actions */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <IconButton
                label={hi ? 'मेन्यू' : 'Menu'}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
                  <Path
                    d="M3 6h14M3 10h14M3 14h14"
                    stroke={INK}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
              </IconButton>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <IconButton label={hi ? 'खोजें' : 'Search'} onPress={() => router.push('/explore')}>
                  <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
                    <Circle cx={9} cy={9} r={6} stroke={INK} strokeWidth={1.9} />
                    <Path
                      d="m13.6 13.6 3.4 3.4"
                      stroke={INK}
                      strokeWidth={1.9}
                      strokeLinecap="round"
                    />
                  </Svg>
                </IconButton>
                <IconButton
                  label={hi ? 'सूचनाएँ' : 'Updates'}
                  onPress={() => router.push('/current-affairs')}
                >
                  <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
                    <Path
                      d="M10 3a5 5 0 0 0-5 5v3l-1.4 2.2h12.8L15 11V8a5 5 0 0 0-5-5Z"
                      stroke={INK}
                      strokeWidth={1.7}
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M8.2 16a2 2 0 0 0 3.6 0"
                      stroke={INK}
                      strokeWidth={1.7}
                      strokeLinecap="round"
                    />
                  </Svg>
                  <View
                    style={{
                      position: 'absolute',
                      top: 9,
                      right: 9,
                      height: 8,
                      width: 8,
                      borderRadius: 4,
                      backgroundColor: VIOLET,
                    }}
                  />
                </IconButton>
              </View>
            </View>

            {/* -------------------------------------------------- greeting */}
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: VIOLET,
                    }}
                  >
                    <Svg width={21} height={21} viewBox="0 0 40 40" fill="none">
                      <Path d="M20 9 31 13.6 20 18.2 9 13.6 20 9Z" fill="#fff" />
                      <Path
                        d="M12 21h7.4c.4 0 .6.3.6.7V31c0-.5-.3-.8-.8-.8H12V21Z"
                        fill="#fff"
                        opacity={0.95}
                      />
                      <Path
                        d="M28 21h-7.4c-.4 0-.6.3-.6.7V31c0-.5.3-.8.8-.8H28V21Z"
                        fill="#fff"
                        opacity={0.78}
                      />
                    </Svg>
                  </View>
                  <Text style={{ fontSize: 26, fontFamily: theme.family.displayBold, color: INK }}>
                    Adhyapak
                  </Text>
                </View>
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 17,
                    fontFamily: theme.family.displayBold,
                    color: INK,
                  }}
                >
                  {hi ? `नमस्ते, ${user.name || 'साथी'}! 👋` : `Hello, ${user.name || 'there'}! 👋`}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 13.5,
                    fontFamily: theme.family.body,
                    color: MUTED,
                  }}
                >
                  {hi ? 'चलिए तैयारी जारी रखें।' : "Let's continue your learning journey."}
                </Text>
              </View>
              <DashboardArt width={r.isPhone ? 96 : 150} />
            </View>

            {/* ------------------------------------------------- selections */}
            {/* The mockup boxes this section rather than letting it sit on the
                canvas, which is what separates "what I chose" from the rails
                below it. */}
            <Panel style={{ marginTop: 20 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <SectionTitle icon="bookmark" text={hi ? 'मेरे चुनाव' : 'My Selections'} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/onboarding/exams?change=1')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#e2dcf7',
                    paddingHorizontal: 12,
                    // 40pt is the floor for anything a thumb has to hit; the
                    // padding alone left this at 36.
                    minHeight: 40,
                  }}
                >
                  <Text
                    style={{ fontSize: 12.5, fontFamily: theme.family.displayBold, color: VIOLET }}
                  >
                    ✎ {hi ? 'बदलें' : 'Change Selections'}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 14, marginHorizontal: -14 }}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 14 }}
              >
                {selections.map((sel) => {
                  const accent = sel.subject?.color ?? sel.level.color;
                  /* This board's own word for the level — CTET's "Paper II"
                     rather than the shared "TGT". */
                  const levelWord = sel.level.officialNames?.length
                    ? t(sel.level.officialNames[0], lang)
                    : sel.level.name;
                  return (
                    <Pressable
                      /* Keyed on both, because one level can appear twice —
                         once per exam that sets it. */
                      key={`${sel.exam?.id ?? 'x'}-${sel.level.id}`}
                      accessibilityRole="button"
                      onPress={() => router.push(`/prep?level=${sel.level.id}`)}
                      style={{
                        width: selectionWidth,
                        borderRadius: 16,
                        // Tinted in the selection's own colour, which is what
                        // makes two selections legible at a glance.
                        backgroundColor: `${accent}14`,
                        padding: 12,
                      }}
                    >
                      {/*
                        Laid across rather than down.
                        
                        The card stacked six things in a column — exam chip,
                        icon, level, subject, a status line and a progress row —
                        and ran nearly 200pt tall for four short strings. The
                        symbol and the exam badge stay, because they are what
                        makes one card tell itself from the next at a glance;
                        they just sit beside the text instead of above it.
                      */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            height: 40,
                            width: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#ffffffcc',
                          }}
                        >
                          <Text style={{ fontSize: 19 }}>
                            {sel.subject?.icon ?? sel.level.icon}
                          </Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                          >
                            <View
                              style={{
                                borderRadius: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                backgroundColor: tint(sel.exam?.color ?? VIOLET),
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontFamily: theme.family.displayBold,
                                  color: sel.exam?.color ?? VIOLET,
                                }}
                              >
                                {sel.exam?.shortName ?? '—'}
                              </Text>
                            </View>
                            <Text
                              numberOfLines={1}
                              style={{
                                flexShrink: 1,
                                fontSize: 15,
                                fontFamily: theme.family.displayBold,
                                color: INK,
                              }}
                            >
                              {levelWord}
                            </Text>
                          </View>

                          {/* Primary has no subject line because it has no
                              subject: the whole paper is the syllabus. */}
                          <Text
                            numberOfLines={1}
                            style={{
                              marginTop: 2,
                              fontSize: 13,
                              fontFamily: theme.family.bodySemi,
                              color: accent,
                            }}
                          >
                            {sel.subject
                              ? t(sel.subject.name, lang)
                              : t(sel.level.fullName, lang)}
                          </Text>
                        </View>

                        <View
                          style={{
                            height: 26,
                            width: 26,
                            borderRadius: 13,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: accent,
                          }}
                        >
                          <ArrowGlyph size={12} />
                        </View>
                      </View>

                      {/* The design reads "45% Completed" here. See the note at
                          the head of this file for why this one says nothing
                          has been started. */}
                      <View
                        style={{
                          marginTop: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            height: 5,
                            borderRadius: 999,
                            backgroundColor: '#ffffffcc',
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: theme.family.bodySemi,
                            color: MUTED,
                          }}
                        >
                          {hi ? 'शुरू नहीं' : 'Not started'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Panel>

            {/* ----------------------------------------------- quick access */}
            <View style={{ marginTop: 24 }}>
              <SectionTitle icon="bolt" text={hi ? 'त्वरित पहुँच' : 'Quick Access'} />
              <Text
                style={{ marginTop: 2, fontSize: 12.5, fontFamily: theme.family.body, color: FAINT }}
              >
                {hi ? 'आपकी तैयारी, आसान बनाई गई' : 'Your exam prep, simplified'}
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 12, marginHorizontal: -r.gutter }}
                contentContainerStyle={{ gap: 12, paddingHorizontal: r.gutter }}
              >
                {QUICK.map((q, i) => (
                  <Pressable
                    key={`${q.label.en}-${i}`}
                    accessibilityRole="button"
                    onPress={() => router.push(q.href as never)}
                    style={{
                      width: 132,
                      borderRadius: 16,
                      backgroundColor: q.tint,
                      padding: 14,
                    }}
                  >
                    <View
                      style={{
                        height: 42,
                        width: 42,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#ffffffbd',
                      }}
                    >
                      <Icon name={q.icon} size={21} color={q.color} />
                    </View>
                    <Text
                      style={{
                        marginTop: 10,
                        fontSize: 14,
                        fontFamily: theme.family.displayBold,
                        color: INK,
                      }}
                    >
                      {t(q.label, lang)}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        lineHeight: 15,
                        fontFamily: theme.family.body,
                        color: MUTED,
                      }}
                    >
                      {t(q.sub, lang)}
                    </Text>
                    <View
                      style={{
                        marginTop: 12,
                        height: 28,
                        width: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: q.color,
                      }}
                    >
                      <ArrowGlyph />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* ------------------------------------- continue your preparation */}
            <Panel style={{ marginTop: 24 }}>
              <SectionTitle
                icon="book"
                text={hi ? 'तैयारी जारी रखें' : 'Continue Your Preparation'}
              />
              {/* The design puts a half-read chapter here with a 60% bar. There
                  is no "last topic" recorded anywhere, so rather than pick one
                  at random this says what is true and points at the shelf. */}
              <View
                style={{
                  marginTop: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#ded9f3',
                  padding: 14,
                }}
              >
                <View
                  style={{
                    height: 52,
                    width: 52,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f1eefc',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>📖</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 19,
                      fontFamily: theme.family.body,
                      color: MUTED,
                    }}
                  >
                    {hi
                      ? 'अभी कोई अध्याय शुरू नहीं हुआ। जहाँ छोड़ेंगे, वहीं से यहाँ दिखेगा।'
                      : 'No chapter started yet. Where you leave off will appear here.'}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/study')}
                style={{
                  marginTop: 12,
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderRadius: 12,
                  backgroundColor: VIOLET,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontFamily: theme.family.displayBold, color: '#fff' }}
                >
                  ▶ {hi ? 'पढ़ना शुरू करें' : 'Start studying'}
                </Text>
              </Pressable>
            </Panel>

            {/* --------------------------------------------- today's snapshot */}
            <View style={{ marginTop: 24 }}>
              <SectionTitle icon="chart" text={hi ? 'आज का सारांश' : "Today's Snapshot"} />

              {/* Four tiles, as the design lays them out. Two of them have a
                  source and two do not; all four are here so the row is the row
                  from the picture, and the two without one read zero. */}
              <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <StatTile
                  icon="⏱️"
                  tintColor="#e8f7ee"
                  label={hi ? 'अध्ययन समय' : 'Study Time'}
                  value={hi ? '0 मिनट' : '0 min'}
                  measured={false}
                  width={tileW}
                />
                <StatTile
                  icon="🎯"
                  tintColor="#fdeaf3"
                  label={hi ? 'हल किए प्रश्न' : 'Questions Solved'}
                  value={String(solved)}
                  measured
                  width={tileW}
                />
                <StatTile
                  icon="📖"
                  tintColor="#efeafe"
                  label={hi ? 'पूर्ण विषय' : 'Topics Completed'}
                  value="0"
                  measured={false}
                  width={tileW}
                />
                <StatTile
                  icon="🔥"
                  tintColor="#fff1e6"
                  label={hi ? 'दैनिक श्रृंखला' : 'Daily Streak'}
                  value={hi ? `${streak} दिन` : `${streak} day${streak === 1 ? '' : 's'}`}
                  measured
                  width={tileW}
                />
              </View>

              <Text
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  lineHeight: 17,
                  fontFamily: theme.family.body,
                  color: '#a8a3bd',
                }}
              >
                {hi
                  ? 'अध्ययन समय और पूर्ण विषय तब दिखेंगे जब उनका रिकॉर्ड रखा जाने लगेगा।'
                  : 'Study time and topics completed appear once the app starts recording them.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------------------------------------- fragments */

/** The white box the design groups a section inside. */
function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  return (
    <View
      style={[
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: LINE,
          backgroundColor: '#fff',
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 44,
        width: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: '#fff',
      }}
    >
      {children}
    </Pressable>
  );
}

/** The prototype's section heading: a tinted plate, then the title. */
function SectionTitle({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View
        style={{
          height: 30,
          width: 30,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.color.primaryLight,
        }}
      >
        <Icon name={icon} size={19} color={theme.color.primary} />
      </View>
      <Text style={{ fontSize: 18, fontFamily: theme.family.displayBold, color: INK }}>{text}</Text>
    </View>
  );
}

/**
 * One snapshot tile.
 *
 * `measured` is not decoration. A tile whose number nothing counts is drawn at
 * the same size and in the same place as the others — the design's row stays
 * the design's row — but its value is greyed, so the eye can tell a real zero
 * from a zero that only means "not recorded yet" without reading the footnote.
 */
function StatTile({
  icon,
  tintColor,
  label,
  value,
  measured,
  width,
}: {
  icon: string;
  tintColor: string;
  label: string;
  value: string;
  measured: boolean;
  width: number;
}) {
  return (
    <View
      style={{
        width,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: LINE,
        backgroundColor: '#fff',
        padding: 14,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tintColor,
        }}
      >
        <Text style={{ fontSize: 17 }}>{icon}</Text>
      </View>
      <Text
        style={{
          marginTop: 8,
          fontSize: 19,
          fontFamily: theme.family.displayBold,
          color: measured ? INK : '#b8b3c9',
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}>{label}</Text>
    </View>
  );
}

function ArrowGlyph({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 10h11m0 0-4-4m4 4-4 4"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The cap-and-books mark in the dashboard header's corner. Decoration only. */
function DashboardArt({ width }: { width: number }) {
  const height = (width / 180) * 130;
  return (
    <Svg width={width} height={height} viewBox="0 0 180 130" fill="none">
      <Circle cx={140} cy={34} r={32} fill="#efecfd" />
      <Path d="M60 76c-9-3-14-11-12-19 9-1 17 4 19 12" fill="#34c77b" opacity={0.8} />
      <Rect x={66} y={86} width={96} height={14} rx={4} fill="#7c5cf7" />
      <Rect x={72} y={100} width={88} height={14} rx={4} fill="#fbc02d" />
      <Rect x={62} y={114} width={102} height={13} rx={4} fill="#eef1fb" />
      <Path d="M113 40 158 56l-45 16-45-16 45-16Z" fill="#5b46d6" />
      <Path d="M88 64v13c0 5 11 9 25 9s25-4 25-9V64l-25 9-25-9Z" fill={VIOLET} />
    </Svg>
  );
}
