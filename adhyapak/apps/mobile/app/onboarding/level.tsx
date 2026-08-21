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
import {
  BAR_CLEARANCE,
  BackButton,
  CANVAS,
  CheckDot,
  ChosenExams,
  ContinueBar,
  ErrorNote,
  INK,
  LINE,
  MUTED,
  PICKED_BG,
  StepHeader,
  StepLoading,
  StepRail,
  Tip,
  VIOLET,
  tint,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <BackButton fallback="/onboarding/exams" />
              <StepRail step={2} />
            </View>

            <StepHeader
              eyebrow={
                hi
                  ? `बढ़िया! ${exams.length} परीक्षाएँ चुनी गईं 🎉`
                  : `Great! ${exams.length} exam${exams.length === 1 ? '' : 's'} selected 🎉`
              }
              title={hi ? 'अपना स्तर चुनें' : 'Select Your Level / Target'}
              subtitle={
                hi
                  ? 'चुनी गई परीक्षाओं में आप जिस स्तर की तैयारी कर रहे हैं, वह चुनें।'
                  : 'Choose the level or target you are preparing for in the selected exams.'
              }
            />

            <ChosenExams items={strip} />

            <Text
              style={{
                marginTop: 24,
                fontSize: 15,
                fontFamily: theme.family.displayBold,
                color: VIOLET,
              }}
            >
              {hi ? 'स्तर चुनें' : 'Select Level / Target'}
            </Text>

            <View style={{ marginTop: 12, gap: 12 }}>
              {levels.map((level) => {
                const on = chosen.has(level.id);
                return (
                  <Pressable
                    key={level.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggle(level.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      padding: 16,
                      borderColor: on ? VIOLET : LINE,
                      backgroundColor: on ? PICKED_BG : '#fff',
                    }}
                  >
                    <View
                      style={{
                        height: 48,
                        width: 48,
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: tint(level.color),
                      }}
                    >
                      <Text style={{ fontSize: 21 }}>{level.icon}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{ fontSize: 16, fontFamily: theme.family.displayBold, color: INK }}
                      >
                        {level.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          lineHeight: 18,
                          fontFamily: theme.family.body,
                          color: MUTED,
                        }}
                      >
                        {t(level.fullName, lang)}
                        {level.classes ? `\n(${t(level.classes, lang)})` : ''}
                      </Text>
                    </View>
                    <CheckDot on={on} />
                  </Pressable>
                );
              })}
            </View>

            <Tip>
              {hi
                ? 'आप बाद में प्रोफ़ाइल सेटिंग्स से किसी भी परीक्षा के लिए स्तर बदल या जोड़ सकते हैं।'
                : 'You can change or add more levels for any exam later from your profile settings.'}
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
