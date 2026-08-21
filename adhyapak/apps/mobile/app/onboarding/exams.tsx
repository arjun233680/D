import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EXAM_CHOOSER_FILTERS,
  filterExamsForChooser,
  isBackendConfigured,
  listExams,
  listLevels,
  nextOnboardingStep,
  saveLearnerExamIds,
  theme,
  type Exam,
  type ExamChooserFilter,
} from '@adhyapak/core';
import { ExamMark } from '@/components/exam-mark';
import {
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
} from '@/lib/learner';
import { useStore } from '@/lib/store';
import { gridItemWidth, useResponsive } from '@/lib/responsive';
import {
  BAR_CLEARANCE,
  CANVAS,
  CheckDot,
  BackButton,
  ContinueBar,
  ErrorNote,
  GradientFill,
  INK,
  LINE,
  PICKED_BG,
  SearchIcon,
  StepHeader,
  StepLoading,
  VIOLET,
} from '@/components/onboarding';

/**
 * Step 1: which exams are you for?
 *
 * Every card comes from the `exams` table — the accent colour, the order of
 * the grid and which exams the "Important" tab shows. Nothing about the list
 * is written in this file, which is the point: adding a state's TET is an
 * insert, not a release.
 *
 * More than one answer is allowed, because more than one answer is the truth.
 * An aspirant sits CTET *and* their own state's TET, and a single-choice
 * question makes them pick a favourite and then hides the rest of the app.
 *
 * The web original is apps/web/app/onboarding/exams/page.tsx and this follows
 * it line for line, including which redirect happens when. What changes is the
 * shape of the input, not the logic: a three-column grid of acronym-only cards
 * that stay thumb-sized, and a filter rail that scrolls rather than wrapping.
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
   * Three across, which is what the design draws.
   *
   * Two was a workaround for the wrong card. While the name sat *beside* the
   * icon it had about 70pt to live in, so a third column broke "SuperTET"
   * mid-word and the count was the only thing left to give. The card stacks
   * now — icon row, then name, then the authority line — so the name has the
   * card's whole width and three fit honestly, exactly as in the mockup.
   *
   * Below 340pt a third column would leave under 90pt of card, which is
   * narrower than the icon plus its padding, so the smallest handsets keep two.
   */
  // Three across at every width. The old `width < 340 ? 2 : 3` guard existed
  // because the card carried the authority line — at 90pt "Delhi Subordinate
  // Services Selection Board" wrapped to four ragged lines. The card is the
  // acronym alone now, so 90pt is comfortable and the guard has nothing left
  // to protect against. Anything narrower than 340 was silently getting two.
  const columns = 3;
  const gap = 8;

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: BAR_CLEARANCE }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
              paddingHorizontal: r.gutter,
            }}
          >
            {changing ? (
              <View style={{ marginTop: 4 }}>
                <BackButton fallback="/" />
              </View>
            ) : null}
            <StepHeader
              eyebrow={hi ? 'स्वागत है!' : 'Welcome!'}
              title={hi ? 'अपनी परीक्षा चुनें' : 'Choose Your Exam'}
              /* This used to read "Select your exam to get started" while a
                 box above the button said "Select one or more exams to
                 continue" — the same sentence twice, and only the lower one
                 mentioned that more than one answer is allowed. The box is
                 gone; the line that carried the useful half is here. */
              subtitle={
                hi
                  ? 'जारी रखने के लिए एक या अधिक परीक्षाएँ चुनें'
                  : 'Select one or more exams to continue'
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
                  <View key={exam.id} style={{ width: gridItemWidth(r, columns, gap) }}>
                    <ExamCard
                      exam={exam}
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
      </ContinueBar>
    </View>
  );
}

/* --------------------------------------------------------------- fragments */

/**
 * One exam.
 *
 * The mark is `ExamMark`: the board's own logo where we have one, otherwise a
 * motif drawn in the exam's `color` from the database. Either way the card
 * takes its look from the data rather than from a palette in this file, which
 * is what keeps a newly inserted exam looking like it belongs.
 */
function ExamCard({
  exam,
  selected,
  onToggle,
}: {
  exam: Exam;
  selected: boolean;
  onToggle: () => void;
}) {
  /*
   * Icon and tick on the top row, acronym beneath. Nothing else.
   *
   * The authority line used to sit under the name — "Central Board of
   * Secondary Education (CBSE)" and so on. It was the longest thing on a card
   * that is 90pt wide, it wrapped to three or four lines, and it pushed the
   * grid down to two columns to survive. It also said nothing a candidate
   * choosing their own exam does not already know.
   *
   * `examSubtitle` still exists and still spells the acronym out; it belongs
   * on a screen with room for it, not on a thumbnail.
   *
   * `minHeight` keeps a row level when one name wraps ("SuperTET") and its
   * neighbours do not.
   */
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={{
        minHeight: 100,
        borderRadius: theme.radius.card,
        borderWidth: 1,
        padding: 8,
        borderColor: selected ? VIOLET : LINE,
        backgroundColor: selected ? PICKED_BG : '#fff',
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <ExamMark exam={exam} size={36} />
        <CheckDot on={selected} size={18} />
      </View>

      <Text
        numberOfLines={2}
        style={{
          marginTop: 8,
          fontSize: 16,
          lineHeight: 19,
          fontFamily: theme.family.displayBold,
          color: INK,
        }}
      >
        {exam.shortName}
      </Text>
    </Pressable>
  );
}
