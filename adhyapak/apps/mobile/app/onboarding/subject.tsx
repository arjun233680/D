import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  examSubtitle,
  listExamLevelSubjects,
  listExams,
  listLevelSubjects,
  listLevels,
  listLevelsForExams,
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
  saveLearnerSubject,
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
  StepProgress,
  BackButton,
  BooksArt,
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
  /** Keyed "examId::levelId", because one level can be two questions. */
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [offers, setOffers] = useState<LevelSubject[] | null>(null);
  const [current, setCurrent] = useState<{ exam: Exam; level: Level } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Every exam-and-level pair this learner has to answer for, in order. */
  const [queue, setQueue] = useState<{ exam: Exam; level: Level }[]>([]);

  /**
   * Moves to the next exam-and-level pair that still needs a subject.
   *
   * Per pair, not per level. CTET's Paper II and HTET's TGT are the same level
   * here and offer different things — two subjects against twelve — so a
   * learner sitting both answers twice, each time against that board's own
   * list. Asking once and applying the answer to both is what this replaces.
   *
   * Levels with `requiresSubject: false` never enter the queue at all: primary
   * is one whole paper with nothing to choose between. A learner who picked
   * only such levels arrives, finds the queue empty, and goes to the dashboard.
   */
  const advance = useCallback(
    (pending: { exam: Exam; level: Level }[], done: Record<string, string>) => {
      const next = pending.find((p) => !done[`${p.exam.id}::${p.level.id}`]);
      if (!next) {
        router.replace('/(tabs)');
        return;
      }
      setCurrent(next);
      setPicked(null);
      setOffers(null);
      void (async () => {
        /*
         * What this one board offers at this one level, whole.
         *
         * Two bugs went out with this. Passing every exam at once showed a
         * CTET candidate HTET's twelve subjects because HTET happened to be on
         * the same account. And intersecting the board's list with the generic
         * `level_subjects` deleted whatever the generic list did not carry —
         * which included "Mathematics & Science", one of exactly two things
         * CTET's Paper II offers, so that candidate saw a single real choice.
         *
         * `level_subjects` stays as the fallback for papers with no elective
         * data: an approximate list beats an empty grid.
         */
        const own = await listExamLevelSubjects(
          next.exam.id,
          next.level.id,
          next.level.teachingLevels,
        );
        setOffers(own.length > 0 ? own : await listLevelSubjects(next.level.id));
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
      const myExams = examList.filter((e) => examIds.includes(e.id));

      /*
       * One question per exam-and-level pair the boards actually set.
       *
       * `listLevelsForExams` answers which levels the learner's exams run
       * between them; this needs the finer fact — which of *those* exams runs
       * which level — so a CTET-and-HTET learner is asked about CTET's Paper II
       * and HTET's TGT separately, and is not asked about CTET at PGT, which
       * CTET does not set.
       *
       * Exam order follows the chooser's, so the queue runs down the list the
       * learner just built rather than jumping about.
       */
      const pairs: { exam: Exam; level: Level }[] = [];
      for (const exam of myExams) {
        const runs = await listLevelsForExams([exam.id]);
        if (!live) return;
        for (const level of mine) {
          if (!level.requiresSubject) continue;
          // The version from `runs` carries this board's own name for the
          // level — CTET's "Paper II" rather than the shared "TGT".
          const labelled = runs.find((l) => l.id === level.id);
          if (labelled) pairs.push({ exam, level: labelled });
        }
      }

      /*
       * Editing asks every pair again, even ones already answered — that is
       * what "change my subject" means. Onboarding resumes instead, skipping
       * what is already saved.
       */
      const done = changing
        ? {}
        : Object.fromEntries(
            subjects.map((sub) => [`${sub.examId}::${sub.levelId}`, sub.subjectId]),
          );
      setLevels(mine);
      setExams(myExams);
      setQueue(pairs);
      setAnswered(done);
      advance(pairs, done);
    })();
    return () => {
      live = false;
    };
  }, [advance, changing]);

  /*
   * Where this screen sits in a run whose length depends on the answers.
   *
   * Exams and levels are two steps; after them comes one subject screen per
   * level that needs one, so a TGT-and-PGT learner has four steps in all and
   * a PRT-only learner never reaches this screen at all. Counting the levels
   * that actually require a subject is what makes the bar tell the truth
   * rather than promise the end a screen early.
   */
  const stepTotal = 2 + Math.max(1, queue.length);
  const stepDone = useMemo(() => {
    const settled = queue.filter((p) => answered[`${p.exam.id}::${p.level.id}`]).length;
    return Math.min(stepTotal, 2 + settled + 1);
  }, [queue, answered, stepTotal]);

  /*
   * The one exam this screen is asking about.
   *
   * It listed every exam the learner holds, which was right while the question
   * was "your subject for TGT" and is wrong now that it is "your subject for
   * CTET's Paper II" — the other exams have their own turn coming.
   */
  const strip = useMemo(
    () =>
      current
        ? [
            {
              id: current.exam.id,
              shortName: current.exam.shortName,
              subtitle: examSubtitle(current.exam, lang),
              emoji: current.exam.emoji,
              color: current.exam.color,
            },
          ]
        : [],
    [current, lang],
  );

  const submit = async () => {
    if (!current || !picked) return;
    setSaving(true);
    setFailed(false);
    const outcome = await saveLearnerSubject(current.exam.id, current.level.id, picked);
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
    const done = { ...answered, [`${current.exam.id}::${current.level.id}`]: picked };
    setAnswered(done);
    advance(queue, done);
  };

  if (!ready || !current || offers === null) {
    return <StepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  // This board's word for the level — CTET's "Paper II", not the shared "TGT".
  const levelWord = current.level.officialNames?.length
    ? t(current.level.officialNames[0], lang)
    : current.level.name;

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
            {/* One row: back, what the level step settled, and how far through
                — with the mark on the heading's own line below. Same shape as
                step 2, so the two read as one flow. */}
            <View
              style={{
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <BackButton fallback="/onboarding/level" />
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
                {/* What the level step settled, the way step 2's chip reports
                    step 1. It used to read "Subject for TGT" over a heading
                    reading "Choose Your TGT Subject" over a line reading
                    "Select the subject … in TGT level" — the same sentence
                    three times down one screen. */}
                {/* Named, not counted. "2 levels selected" makes the reader
                    work out which two from a screen that no longer shows
                    them; the names are shorter than the count's sentence
                    anyway. */}
                {hi
                  ? `बढ़िया! ${levels.map((l) => l.name).join(', ')} चुना गया 🎉`
                  : `Great! ${levels.map((l) => l.name).join(', ')} selected 🎉`}
              </Text>
              <StepProgress done={stepDone} total={stepTotal} width={72} />
            </View>

            {/* Named for the board as well as the level, because this screen
                comes round once per exam. "TGT Subject" twice in a row, once
                for CTET and once for HTET, is the same screen as far as the
                reader can tell. */}
            <StepHeader
              trailing={<BooksArt width={100} />}
              title={
                hi
                  ? `${current.exam.shortName} ${levelWord} विषय`
                  : `${current.exam.shortName} ${levelWord} Subject`
              }
            />

            {/* Only the exam this screen is asking about. The full strip named
                every exam the learner holds, on a screen that concerns one. */}
            <ChosenExams items={strip} />

            {/* The label sits over the thing it labels, the way "Select Level
                / Target" does on step 2. Over the exam strip it named a row
                nobody has to act on, and left the grid — the one question on
                the screen — with nothing over it at all. */}
            <Text
              style={{
                marginTop: 26,
                fontSize: 14,
                letterSpacing: 0.2,
                fontFamily: theme.family.displayBold,
                color: VIOLET,
              }}
            >
              {hi ? 'विषय चुनें' : 'Select Subject'}
            </Text>

            <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap }}>
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
              {/* Same correction as the level step: the control is "Change
                  Selections" on the home screen, not in a profile. */}
              {hi ? 'बाद में होम स्क्रीन से बदल सकते हैं।' : 'You can change this later from Home.'}
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
