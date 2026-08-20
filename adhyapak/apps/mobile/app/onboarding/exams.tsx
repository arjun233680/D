import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EXAM_CHOOSER_FILTERS,
  examSubtitle,
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
  filterExamsForChooser,
  isBackendConfigured,
  listExams,
  listLevels,
  nextOnboardingStep,
  saveLearnerExamIds,
  theme,
  type Exam,
  type ExamChooserFilter,
  type Lang,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useResponsive } from '@/lib/responsive';
import {
  BAR_CLEARANCE,
  CANVAS,
  CheckDot,
  ContinueBar,
  ErrorNote,
  GradientFill,
  INK,
  LINE,
  MUTED,
  PICKED_BG,
  SearchIcon,
  StepHeader,
  StepLoading,
  Tick,
  VIOLET,
  tint,
} from '@/components/onboarding';

/**
 * Step 1: which exams are you for?
 *
 * Every card comes from the `exams` table — the emoji, the accent colour, the
 * authority line, the order of the grid and which exams the "Important" tab
 * shows. Nothing about the list is written in this file, which is the point:
 * adding a state's TET is an insert, not a release.
 *
 * More than one answer is allowed, because more than one answer is the truth.
 * An aspirant sits CTET *and* their own state's TET, and a single-choice
 * question makes them pick a favourite and then hides the rest of the app.
 *
 * The web original is apps/web/app/onboarding/exams/page.tsx and this follows
 * it line for line, including which redirect happens when. What changes is the
 * shape of the input, not the logic: a two-column grid that keeps its cards
 * thumb-sized, and a filter rail that scrolls rather than wrapping.
 */

const FILTER_LABEL: Record<ExamChooserFilter, { en: string; hi: string; icon: string }> = {
  all: { en: 'All', hi: 'सभी', icon: '▦' },
  centre: { en: 'Centre', hi: 'केंद्र', icon: '🏛' },
  state: { en: 'State', hi: 'राज्य', icon: '📍' },
  important: { en: 'Important', hi: 'प्रमुख', icon: '★' },
};

export default function ChooseExamScreen() {
  const { lang, ready } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  /*
   * "Change Selection" arrives here with `?change=1`.
   *
   * Without it this screen forwards anyone who has already answered — which is
   * right on sign-in and exactly wrong when they came to change the answer.
   */
  const changing = useLocalSearchParams<{ change?: string }>().change === '1';

  const [exams, setExams] = useState<Exam[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ExamChooserFilter>('all');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const noBackend = !isBackendConfigured();

  /*
   * Loaded together, and the existing choice decides whether this screen should
   * be on screen at all. This is the flow's front door, so it reads all three
   * answers once and sends the learner to the question they actually stopped
   * at — one redirect on sign-in rather than three.
   */
  useEffect(() => {
    let live = true;
    void (async () => {
      const [list, already, levelIds, subjects, levels] = await Promise.all([
        listExams(),
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
        listLevels(),
      ]);
      if (!live) return;
      if (changing) {
        // Pre-ticked with what they chose last time: this is an edit, not a
        // fresh question, and re-picking five exams to add a sixth is how a
        // learner loses one by accident.
        setChosen(new Set(already));
        setExams(list);
        return;
      }
      const step = nextOnboardingStep(already, levels, levelIds, subjects);
      if (step !== 'exams') {
        router.replace(
          step === 'level'
            ? '/onboarding/level'
            : step === 'subject'
              ? '/onboarding/subject'
              : '/(tabs)',
        );
        return;
      }
      setExams(list);
    })();
    return () => {
      live = false;
    };
  }, [changing]);

  const visible = useMemo(
    () => (exams ? filterExamsForChooser(exams, filter, query) : []),
    [exams, filter, query],
  );

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = async () => {
    if (chosen.size === 0) return;
    setSaving(true);
    setFailed(false);
    const outcome = await saveLearnerExamIds([...chosen]);
    setSaving(false);
    if (!outcome.ok) {
      /*
       * An expired session is not a connection problem, and telling somebody to
       * check their connection leaves them retrying a request that will keep
       * being refused. Send them to the door instead.
       */
      if (outcome.expired) {
        router.replace('/(auth)/login');
        return;
      }
      // Staying put is the whole point. Navigating on a failed write would land
      // them on a dashboard that thinks they never answered.
      setFailed(true);
      return;
    }
    router.push(changing ? '/onboarding/level?change=1' : '/onboarding/level');
  };

  if (!ready || exams === null) {
    return <StepLoading label={hi ? 'परीक्षाएँ लाई जा रही हैं…' : 'Fetching exams…'} />;
  }

  /*
   * Two columns on a phone, three once there is room.
   *
   * The design draws three across, and three 100px cards on a 360px phone
   * leaves "Central Teacher Eligibility Test" wrapping to five lines under a
   * name it no longer fits beside. Two keeps the card's proportions and the
   * card is what the design is; the count is what has to give on a narrow
   * screen. A tablet gets the three from the picture.
   */
  const columns = r.isPhone ? 2 : 3;
  const gap = 12;

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: BAR_CLEARANCE + 40 }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
              paddingHorizontal: r.gutter,
            }}
          >
            <StepHeader
              eyebrow={hi ? 'स्वागत है! 👋' : 'Welcome! 👋'}
              title={hi ? 'अपनी परीक्षा चुनें' : 'Choose Your Exam'}
              subtitle={
                hi ? 'शुरू करने के लिए अपनी परीक्षा चुनें' : 'Select your exam to get started'
              }
            />

            {/* ------------------------------------------------------ search */}
            <View style={{ marginTop: 24, justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: 16, zIndex: 1 }}>
                <SearchIcon />
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={hi ? 'अपनी परीक्षा खोजें' : 'Search your exam'}
                placeholderTextColor="#a8a3bd"
                accessibilityLabel={hi ? 'परीक्षा खोजें' : 'Search exams'}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#e8e4f6',
                  backgroundColor: '#fff',
                  paddingVertical: 14,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  fontFamily: theme.family.body,
                  color: INK,
                }}
              />
            </View>

            {/* ------------------------------------------------------ filters */}
            {/* A rail, not a wrap: four tabs fit on a phone, and wrapping the
                fourth onto its own line reads as a different control. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 16, marginHorizontal: -r.gutter }}
              contentContainerStyle={{ gap: 12, paddingHorizontal: r.gutter, paddingBottom: 4 }}
            >
              {EXAM_CHOOSER_FILTERS.map((f) => {
                const on = filter === f;
                return (
                  <Pressable
                    key={f}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setFilter(f)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderRadius: 16,
                      overflow: 'hidden',
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      borderWidth: on ? 0 : 1,
                      borderColor: '#e8e4f6',
                      backgroundColor: on ? 'transparent' : '#fff',
                    }}
                  >
                    {on ? <GradientFill /> : null}
                    <Text style={{ fontSize: 15 }}>{FILTER_LABEL[f].icon}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: theme.family.bodySemi,
                        color: on ? '#fff' : '#4b5563',
                      }}
                    >
                      {hi ? FILTER_LABEL[f].hi : FILTER_LABEL[f].en}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {noBackend ? (
              <View
                style={{
                  marginTop: 20,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#f3d9a8',
                  backgroundColor: '#fef7e8',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    lineHeight: 19,
                    fontFamily: theme.family.body,
                    color: '#7a5a1e',
                  }}
                >
                  ⚠️{' '}
                  {hi
                    ? 'कोई डेटाबेस कॉन्फ़िगर नहीं है, इसलिए यह चुनाव सहेजा नहीं जाएगा। सूची बंडल की गई सामग्री से आ रही है।'
                    : 'No database is configured, so this choice will not be saved. The list is coming from bundled content.'}
                </Text>
              </View>
            ) : null}

            {/* -------------------------------------------------------- grid */}
            {visible.length === 0 ? (
              <Text
                style={{
                  marginTop: 40,
                  textAlign: 'center',
                  fontSize: 14,
                  fontFamily: theme.family.body,
                  color: '#8b869e',
                }}
              >
                {hi ? 'इस खोज से कोई परीक्षा नहीं मिली।' : 'No exam matches that search.'}
              </Text>
            ) : (
              <View
                style={{
                  marginTop: 20,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap,
                }}
              >
                {visible.map((exam) => (
                  <View
                    key={exam.id}
                    style={{ width: `${(100 - (columns - 1) * 3) / columns}%` }}
                  >
                    <ExamCard
                      exam={exam}
                      lang={lang}
                      selected={chosen.has(exam.id)}
                      onToggle={() => toggle(exam.id)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <ContinueBar
        onPress={submit}
        disabled={chosen.size === 0}
        busy={saving}
        label={saving ? (hi ? 'सहेजा जा रहा है…' : 'Saving…') : hi ? 'आगे बढ़ें' : 'Continue'}
      >
        {failed ? (
          <ErrorNote>
            {hi
              ? 'चुनाव सहेजा नहीं जा सका। कनेक्शन जाँचकर पुनः प्रयास करें।'
              : 'Could not save your choice. Check your connection and try again.'}
          </ErrorNote>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 16,
            backgroundColor: '#f1eefc',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              height: 28,
              width: 28,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: chosen.size > 0 ? VIOLET : '#cfc8ee',
            }}
          >
            <Tick />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: theme.family.displayBold, color: INK }}>
              {hi
                ? `${chosen.size} परीक्षा चुनी गई`
                : `${chosen.size} exam${chosen.size === 1 ? '' : 's'} selected`}
            </Text>
            <Text style={{ fontSize: 12.5, fontFamily: theme.family.body, color: MUTED }}>
              {hi
                ? 'जारी रखने के लिए एक या अधिक परीक्षाएँ चुनें'
                : 'Select one or more exams to continue'}
            </Text>
          </View>
        </View>
      </ContinueBar>
    </View>
  );
}

/* --------------------------------------------------------------- fragments */

/**
 * One exam.
 *
 * The tile behind the emoji is the exam's own `color` at low opacity, so the
 * grid is coloured by the database rather than by a palette in this file. That
 * is what keeps a newly inserted exam looking like it belongs.
 */
function ExamCard({
  exam,
  lang,
  selected,
  onToggle,
}: {
  exam: Exam;
  lang: Lang;
  selected: boolean;
  onToggle: () => void;
}) {
  // The acronym spelled out — see `examSubtitle` for why that is not always in
  // the same column.
  const subtitle = examSubtitle(exam, lang);

  /*
   * Icon beside the name, not above it — the arrangement in the design. The
   * tile behind the emoji is the exam's own `color` at low opacity, so the grid
   * is coloured by the database rather than by a palette in this file.
   */
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        minHeight: 104,
        borderColor: selected ? VIOLET : LINE,
        backgroundColor: selected ? PICKED_BG : '#fff',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            height: 40,
            width: 40,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tint(exam.color),
          }}
        >
          <Text style={{ fontSize: 19 }}>{exam.emoji}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 19,
              fontFamily: theme.family.displayBold,
              color: INK,
            }}
          >
            {exam.shortName}
          </Text>
        </View>
        <CheckDot on={selected} size={20} />
      </View>
      <Text
        numberOfLines={3}
        style={{
          marginTop: 8,
          fontSize: 11.5,
          lineHeight: 15,
          fontFamily: theme.family.body,
          color: MUTED,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
