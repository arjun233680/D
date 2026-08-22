import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  examSubtitle,
  listExams,
  listLevelsForExams,
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
  MUTED,
  PICKED_BG,
  StepHeader,
  StepLoading,
  BackButton,
  StepProgress,
  BooksArt,
  tint,
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
      const [examList, examIds, levelIds] = await Promise.all([
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
       * Only the levels the chosen exams actually recruit for.
       *
       * This used to derive the answer from `exam_papers`, which had two
       * holes. The paper rows were incomplete — MPTET carried only Varg 3,
       * EMRS only TGT, HPSC PGT no paper at all — so exams silently lost
       * levels they do run. And the catch-all was exempted from the filter
       * altogether, which is why "Other / Non-Teaching Posts" appeared under
       * every state's teacher eligibility test; a TET recruits teachers and
       * nothing else. `exam_levels` states it outright, non-teaching included.
       */
      const usable = await listLevelsForExams(examIds);
      if (!live) return;

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
            {/* One row: where you came from, what the last step settled, and
                how far through the three this is — with the app's mark under
                it on the same side, so the right of the row reads top to
                bottom as progress then brand. */}
            <View
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <BackButton fallback="/onboarding/exams" />
              {/* No pill behind it. The tinted plate made a line of text look
                  like a control, and its padding was the difference between
                  the line fitting this row and the 🎉 dropping to a second
                  one. One line, kept to one line. */}
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  lineHeight: 18,
                  fontFamily: theme.family.displayBold,
                  color: VIOLET,
                }}
              >
                {hi
                  ? exams.length === 1
                    ? 'बढ़िया! 1 परीक्षा चुनी गई 🎉'
                    : `बढ़िया! ${exams.length} परीक्षाएँ चुनी गईं 🎉`
                  : `Great! ${exams.length} exam${exams.length === 1 ? '' : 's'} selected 🎉`}
              </Text>
              <StepProgress done={2} total={3} width={72} />
            </View>

            <StepHeader
              /* The mark rides the heading's own line. On a row of its own it
                 was 72pt of height spent on decoration, which is what pushed
                 the tip under the button. */
              trailing={<BooksArt width={100} />}
              /* "Select Your Level / Target" wrapped onto two lines and the
                 Hindi never carried the second half anyway. */
              title={hi ? 'अपना स्तर चुनें' : 'Select Your Level'}
            />

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
            {/* A label for the list, in the design's own words. It does
                echo the heading above it; the mockup carries both. */}
            <Text
              style={{
                marginTop: 34,
                fontSize: 14,
                letterSpacing: 0.2,
                fontFamily: theme.family.displayBold,
                color: VIOLET,
              }}
            >
              {hi ? 'स्तर / लक्ष्य चुनें' : 'Select Level / Target'}
            </Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              {levels.map((level) => {
                const on = chosen.has(level.id);
                return (
                  <Pressable
                    key={level.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggle(level.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      borderRadius: theme.radius.card,
                      borderWidth: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderColor: on ? VIOLET : '#F1EEFC',
                      backgroundColor: on ? PICKED_BG : '#fff',
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                      ...(on ? theme.shadow.picked : theme.shadow.card),
                    })}
                  >
                    {/* A disc, not a rounded square: the design's marks sit in
                        circles tinted from the level's own colour. */}
                    <View
                      style={{
                        height: 52,
                        width: 52,
                        borderRadius: 26,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: tint(level.color),
                      }}
                    >
                      <LevelMark levelId={level.id} color={level.color} size={32} />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 17,
                          lineHeight: 22,
                          fontFamily: theme.family.displayBold,
                          color: INK,
                        }}
                      >
                        {level.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          marginTop: 1,
                          fontSize: 14,
                          lineHeight: 19,
                          fontFamily: theme.family.body,
                          color: MUTED,
                        }}
                      >
                        {t(level.fullName, lang)}
                      </Text>
                      {level.classes ? (
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 13,
                            lineHeight: 18,
                            fontFamily: theme.family.body,
                            color: MUTED,
                          }}
                        >
                          {`(${t(level.classes, lang)})`}
                        </Text>
                      ) : null}
                    </View>

                    {/* A radio, which is what the design draws — a ring that
                        takes a filled core when chosen, rather than a tick. */}
                    <View
                      style={{
                        height: 22,
                        width: 22,
                        borderRadius: 11,
                        borderWidth: on ? 2 : 1.5,
                        borderColor: on ? VIOLET : '#D8D3EE',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? (
                        <View
                          style={{
                            height: 11,
                            width: 11,
                            borderRadius: 6,
                            backgroundColor: VIOLET,
                          }}
                        />
                      ) : null}
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
