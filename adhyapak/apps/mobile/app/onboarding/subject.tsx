import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  examSubtitle,
  listElectiveChoices,
  listExams,
  listLevelSubjects,
  listLevels,
  saveLearnerSubject,
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
import { SubjectMark } from '@/components/art';
import {
  BAR_CLEARANCE,
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
  StepHeaderRow,
  Tip,
  VIOLET,
  tint,
} from '@/components/onboarding';

/**
 * Step 3: which subject, for each level?
 *
 * One screen per level rather than one screen with two grids. The question is
 * genuinely separate each time — a TGT Science teacher is often a PGT Chemistry
 * candidate, and the PGT list does not even contain "Science" — and stacking
 * both grids on one screen makes a page nobody can see the bottom of.
 *
 * Which level is being asked about is derived rather than routed. The learner's
 * levels and their answers so far both live in the database, so "the first
 * level with no subject yet" is a fact this screen can work out on load. That
 * means a reload, a back gesture or a re-entry days later all resume in the
 * same place, with no step counter in a URL to get out of sync with what was
 * actually saved.
 *
 * Ported from apps/web/app/onboarding/subject/page.tsx.
 */
export default function ChooseSubjectScreen() {
  const { lang, ready } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  const changing = useLocalSearchParams<{ change?: string }>().change === '1';

  const [levels, setLevels] = useState<Level[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<LevelSubject[] | null>(null);
  const [current, setCurrent] = useState<Level | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  /**
   * Moves to the next level that still needs a subject, or leaves onboarding.
   *
   * Levels with `requiresSubject: false` are stepped over entirely — primary is
   * one whole paper with nothing to choose between. A learner who picked only
   * such levels never sees this screen: they arrive, nothing is outstanding,
   * and they go straight to the dashboard.
   */
  const advance = useCallback(
    (all: Level[], done: Record<string, string>, examIds: string[]) => {
      const next = all.find((l) => l.requiresSubject && !done[l.id]);
      if (!next) {
        router.replace('/(tabs)');
        return;
      }
      setCurrent(next);
      setPicked(null);
      setOffers(null);
      void (async () => {
        /*
         * What this learner's own exams offer, not a generic list for the
         * level. CTET Paper II offers two subjects; HTET Level 2 offers
         * twelve. Showing the generic ten to a CTET candidate offered them
         * eight subjects they cannot sit.
         *
         * `level_subjects` remains the fallback for exams whose papers carry
         * no elective data yet — an approximate list beats an empty grid.
         */
        const allowed = await listElectiveChoices(examIds, next.teachingLevels);
        const generic = await listLevelSubjects(next.id);
        setOffers(
          allowed.length > 0
            ? generic.filter(
                (o) => allowed.includes(o.subjectId) || o.subjectId === 'other-subject',
              )
            : generic,
        );
      })();
    },
    [],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      const [levelList, examList, examIds, levelIds, subjects] = await Promise.all([
        listLevels(),
        listExams(),
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
      ]);
      if (!live) return;
      if (examIds.length === 0) {
        router.replace('/onboarding/exams');
        return;
      }
      if (levelIds.length === 0) {
        router.replace('/onboarding/level');
        return;
      }
      const mine = levelList.filter((l) => levelIds.includes(l.id));
      /*
       * Editing asks every level again, even ones already answered — that is
       * what "change my subject" means. Onboarding resumes instead, skipping
       * what is already saved.
       */
      const done = changing
        ? {}
        : Object.fromEntries(subjects.map((sub) => [sub.levelId, sub.subjectId]));
      setLevels(mine);
      setExams(examList.filter((e) => examIds.includes(e.id)));
      setAnswered(done);
      advance(mine, done, examIds);
    })();
    return () => {
      live = false;
    };
  }, [advance, changing]);

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

  const submit = async () => {
    if (!current || !picked) return;
    setSaving(true);
    setFailed(false);
    const outcome = await saveLearnerSubject(current.id, picked);
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
    const done = { ...answered, [current.id]: picked };
    setAnswered(done);
    advance(
      levels,
      done,
      exams.map((e) => e.id),
    );
  };

  if (!ready || !current || offers === null) {
    return <StepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  const columns = 3;
  const gap = 10;

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
            <StepHeaderRow step={3} fallback="/onboarding/level" />

            <StepHeader
              title={hi ? `अपना ${current.name} विषय चुनें` : `Choose Your ${current.name} Subject`}
              subtitle={
                hi
                  ? `${current.name} स्तर के लिए वह विषय चुनें जिसकी आप तैयारी करना चाहते हैं।`
                  : `Select the subject you want to prepare for in ${current.name} level.`
              }
            />

            <ChosenExams
              items={strip}
              title={hi ? 'आपकी चुनी परीक्षाएँ' : 'Your Selected Exams'}
            />

            {/* No second heading: the title already asks for the subject. */}
            <View style={{ marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {offers.map((offer) => {
                const on = picked === offer.subjectId;
                return (
                  <View key={offer.subjectId} style={{ width: gridItemWidth(r, columns, gap) }}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setPicked(offer.subjectId)}
                      style={{
                        borderRadius: 16,
                        borderWidth: 1,
                        padding: 8,
                        minHeight: 112,
                        alignItems: 'center',
                        borderColor: on ? VIOLET : LINE,
                        backgroundColor: on ? PICKED_BG : '#fff',
                      }}
                    >
                      {/* The tick rides the card's own corner, as on step 1:
                          at this size there is no room for it beside the
                          icon. */}
                      <View style={{ position: 'absolute', top: 5, right: 5, zIndex: 2 }}>
                        <CheckDot on={on} size={18} />
                      </View>
                      {/*
                        Drawn, not typed. `offer.icon` is an emoji out of the
                        database — a different picture on every phone, and one
                        that cannot take the subject's colour. `subjectIcon`
                        maps the subject to a stroke from the same set the rest
                        of the app uses: a flask for Chemistry, an atom for
                        Physics, a leaf for Biology, a calculator for Maths.
                      */}
                      <SubjectMark subjectId={offer.subjectId} color={offer.color} size={46} />
                      <Text
                        numberOfLines={2}
                        style={{
                          marginTop: 8,
                          alignSelf: 'stretch',
                          textAlign: 'center',
                          fontSize: 16,
                          lineHeight: 19,
                          fontFamily: theme.family.display,
                          color: INK,
                        }}
                      >
                        {t(offer.name, lang)}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Tip>
              {hi
                ? 'आप बाद में प्रोफ़ाइल सेटिंग्स से विषय जोड़ या बदल सकते हैं।'
                : 'You can add or change subject later from your profile settings.'}
            </Tip>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ContinueBar
        onPress={submit}
        disabled={!picked}
        busy={saving}
        label={saving ? (hi ? 'सहेजा जा रहा है…' : 'Saving…') : hi ? 'आगे बढ़ें' : 'Continue'}
      >
        {failed ? (
          <ErrorNote>
            {hi
              ? 'विषय सहेजा नहीं जा सका। कनेक्शन जाँचकर पुनः प्रयास करें।'
              : 'Could not save your subject. Check your connection and try again.'}
          </ErrorNote>
        ) : null}
      </ContinueBar>
    </View>
  );
}
