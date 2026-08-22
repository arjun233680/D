import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  examSubtitle,
  listExams,
  listLevels,
  listPaperLevelsForExams,
  t,
  theme,
  type Exam,
  type Level,
} from '@adhyapak/core';
import {
  saveLearnerLevelIds,
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
} from '@/lib/learner';
import { useStore } from '@/lib/store';
import { useResponsive } from '@/lib/responsive';
import { LEVEL_ART_COLOR, LevelMark } from '@/components/art';
import {
  BAR_CLEARANCE,
  CANVAS,
  CheckDot,
  ChosenExams,
  ContinueBar,
  ErrorNote,
  INK,
  PICKED_BG,
  StepHeader,
  StepLoading,
  BackButton,
  EyebrowPill,
  StepRail,
  Tip,
  VIOLET,
} from '@/components/onboarding';

/**
 * Step 2: which level do you teach at?
 *
 * More than one, like step 1, and for the same reason: an aspirant who has a
 * B.Ed and a master's sits TGT and PGT in the same season, and making them pick
 * one hides half the syllabus they are actually revising.
 *
 * The levels come from the `levels` table, not from `exam_papers.post` — see
 * the comment at the head of migration 0020 for why those are different
 * questions.
 *
 * Ported from apps/web/app/onboarding/level/page.tsx. The list is already a
 * stack of full-width rows on the web, so it needs no re-layout here; what
 * changes is that the row is a 44pt-plus tap target rather than a click target.
 */
export default function ChooseLevelScreen() {
  const { lang, ready } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  /** Carried through every step so "Change Selection" edits rather than onboards. */
  const changing = useLocalSearchParams<{ change?: string }>().change === '1';

  const [levels, setLevels] = useState<Level[] | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [levelList, examList, examIds, levelIds] = await Promise.all([
        listLevels(),
        listExams(),
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
      ]);
      if (!live) return;
      // Arriving here without having answered step 1 means a deep link or a
      // relaunch out of order. Send them back rather than asking step 2 of
      // somebody whose exams are unknown.
      if (examIds.length === 0) {
        router.replace('/onboarding/exams');
        return;
      }
      /*
       * Only levels the chosen exams actually examine.
       *
       * CTET has no PGT paper; offering PGT to a CTET candidate lets them pick
       * a level their exam does not run and then land on a PYQ screen with
       * nothing behind it. A level with no `teachingLevels` — the catch-all —
       * is always offered, and if the papers tell us nothing the whole list
       * stands, because an unanswerable question beats an empty screen.
       */
      const offered = await listPaperLevelsForExams(examIds);
      if (!live) return;
      const usable =
        offered.length === 0
          ? levelList
          : levelList.filter(
              (l) =>
                l.teachingLevels.length === 0 ||
                l.teachingLevels.some((tl) => offered.includes(tl)),
            );

      setLevels(usable);
      setExams(examList.filter((e) => examIds.includes(e.id)));
      setChosen(new Set(levelIds.filter((id) => usable.some((l) => l.id === id))));
    })();
    return () => {
      live = false;
    };
  }, []);

  const strip = useMemo(
    () =>
      exams.map((e) => ({
        id: e.id,
        shortName: e.shortName,
        subtitle: examSubtitle(e, lang),
        emoji: e.emoji,
        color: e.color,
      })),
    [exams, lang],
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
    const outcome = await saveLearnerLevelIds([...chosen]);
    setSaving(false);
    if (!outcome.ok) {
      // See the note on the exam step: an expired session needs the door, not
      // a retry against a request the server will keep refusing.
      if (outcome.expired) {
        router.replace('/(auth)/login');
        return;
      }
      setFailed(true);
      return;
    }
    /*
     * Straight to the dashboard when nothing left asks a subject question —
     * PRT on its own is the case. Routing to the subject step and letting it
     * bounce would work, but it shows a loading screen on the way to somewhere
     * it was never going to stop.
     */
    const anyAsks = (levels ?? []).some((l) => chosen.has(l.id) && l.requiresSubject);
    if (!anyAsks) {
      router.replace('/(tabs)');
      return;
    }
    router.push(changing ? '/onboarding/subject?change=1' : '/onboarding/subject');
  };

  if (!ready || levels === null) {
    return <StepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: BAR_CLEARANCE }}>
          <View
            style={{
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
              paddingHorizontal: r.gutter,
              paddingTop: 8,
            }}
          >
            {/* Arrow, heading and step count on one line.

                The arrow and the counter used to hold down a 44pt row with
                nothing between them, and the heading started under all of it.
                They fit either side of the heading, which is a row of the
                screen given back to the levels. */}
            <StepHeader
              /* "Select Your Level / Target" wrapped onto two lines and the
                 Hindi never carried the second half anyway. */
              title={hi ? 'अपना स्तर चुनें' : 'Select Your Level'}
              leading={<BackButton fallback="/onboarding/exams" />}
              trailing={<StepRail step={2} />}
              /* No subtitle. "For the exams you just chose" restated the strip
                 of exam marks directly underneath it, which shows the same
                 thing and names them. */
            />

            {/* Under the heading, not beside the arrow. It is a note about the
                answer already given, and above the question it was competing
                with the heading for the top of the screen. */}
            <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
              <EyebrowPill
                label={
                  hi
                    ? exams.length === 1
                      ? '1 परीक्षा चुनी गई'
                      : `${exams.length} परीक्षाएँ चुनी गईं`
                    : `${exams.length} exam${exams.length === 1 ? '' : 's'} selected`
                }
              />
            </View>

            <ChosenExams items={strip} />

            {/* The heading above the list said "Select Level / Target" under a
                title that already said "Select Your Level / Target". One
                question, asked once. */}
            {/*
              One card per row.

              Two columns gave each card about 138pt of text width, and no size
              above the 12pt floor fits "Trained Graduate Teacher" on one line
              in 138pt — it broke to three. Full width fits every name on one
              line at a comfortable size and leaves room for a bigger book
              beside it, which is what the two-column grid was really costing.
            */}
            {/* Well clear of the exam strip. The first card started 16 under
                it — the same gap the cards keep between themselves — so the
                strip read as the top card of the list rather than as the exams
                the list is for. The break is what separates the two. */}
            <View style={{ marginTop: 52, gap: 10 }}>
              {levels.map((level) => {
                const on = chosen.has(level.id);
                /*
                 * The line under the name.
                 *
                 * Usually the class range, which is what actually tells PRT
                 * from TGT. "Other" has no range, and without one it was the
                 * only card of the four showing a single line — so it falls
                 * back to what its full name adds. That name leads with the
                 * card's own word ("Other / Non-Teaching Posts"), and
                 * repeating it under itself says nothing, so the lead comes
                 * off.
                 */
                const full = t(level.fullName, lang);
                const lead = `${level.name} / `;
                const detail = level.classes
                  ? t(level.classes, lang)
                  : full.startsWith(lead)
                    ? full.slice(lead.length)
                    : full;
                return (
                  <Pressable
                    key={level.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggle(level.id)}
                    /* The card answers the tap before the state does. Without
                       it a press on a card that is already chosen looks like
                       nothing happened at all. */
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: theme.radius.card,
                      borderWidth: 1,
                      padding: 10,
                      /* Level with each other. The two names that wrap to a
                         second line came out 3pt taller than the two that do
                         not, which down a list of four reads as a wobble
                         rather than as a set. Measured, not guessed. */
                      minHeight: 85,
                      borderColor: on ? VIOLET : '#F1EEFC',
                      backgroundColor: on ? PICKED_BG : '#fff',
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      ...(on ? theme.shadow.picked : theme.shadow.card),
                    })}
                  >
                    <View
                      style={{
                        height: 60,
                        width: 60,
                        borderRadius: theme.radius.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F3F0FE',
                      }}
                    >
                      <LevelMark levelId={level.id} color={level.color} size={52} />
                    </View>

                    <View style={{ flex: 1, minWidth: 0, paddingRight: 30 }}>
                      {/*
                        The acronym is the name.

                        The card carried both — "Primary Teacher" over "PRT" —
                        and the full form was the longer, quieter half of a
                        pair that says one thing. PRT, TGT and PGT are what
                        every notice, every syllabus and every aspirant calls
                        these, so the card says that and gives it the size.
                        "Other" is not an acronym; it stands as its own word.
                      */}
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 26,
                          lineHeight: 32,
                          letterSpacing: 0.3,
                          fontFamily: theme.family.displayBold,
                          /* Its own book's colour, so the letters and the
                             picture beside them agree. */
                          color: LEVEL_ART_COLOR[level.id] ?? INK,
                        }}
                      >
                        {level.name.length <= 3 ? level.name.toUpperCase() : level.name}
                      </Text>
                      {detail ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            marginTop: 1,
                            fontSize: 14,
                            lineHeight: 19,
                            letterSpacing: 0.2,
                            fontFamily: theme.family.bodySemi,
                            color: '#8B91AD',
                          }}
                        >
                          {detail}
                        </Text>
                      ) : null}
                    </View>

                    {/* Out of the flow, in the corner. In the row it cost the
                        name 38pt of width, which is exactly what turned
                        "Trained Graduate Teacher" into an ellipsis. */}
                    <View
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 0,
                        bottom: 0,
                        justifyContent: 'center',
                      }}
                    >
                      <CheckDot on={on} size={22} />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Tip>
              {/* It said "profile settings", and there is nothing there to
                  change: the control is "Change Selections" on the home
                  screen. A tip that sends you to the wrong screen is worse
                  than no tip. */}
              {hi ? 'बाद में होम स्क्रीन से बदल सकते हैं।' : 'You can change this later from Home.'}
            </Tip>
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
