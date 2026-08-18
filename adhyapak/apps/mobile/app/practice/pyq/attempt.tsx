import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  countQuestions,
  getPaper,
  isBackendConfigured,
  listQuestions,
  pyqModeEmptyReason,
  pyqModeModel,
  type PyqMode,
  pyqSelectionFromParams,
  pyqTruncation,
  PYQ_SCREEN_LIMIT,
  t,
  theme,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeSession } from '@/components/PracticeSession';
import { AsyncSection, s } from '@/components/ui';

/**
 * A previous-year set, being sat.
 *
 * The chooser is `./index` and this screen only runs what it picked, read back
 * out of the route params by the same parser the website's URL uses — so the
 * set cannot change under a learner mid-paper.
 */

export default function PyqAttemptScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const params = useLocalSearchParams<Record<string, string>>();

  // Route params are the whole selection: nothing falls back to the profile
  // here, because the chooser has already resolved it and passed it on.
  const selection = useMemo(
    () => pyqSelectionFromParams((key) => params[key] ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(params)],
  );
  // The mode the chooser started, not a filter re-derived here. A full paper
  // and a topic set are the same questions asked for differently — one is the
  // whole paper in printed order, the other is one topic across every year —
  // and rebuilding the filter without it would quietly run the wrong one.
  const pyqMode = ((typeof params.mode === 'string' ? params.mode : undefined) as PyqMode) ?? 'full-paper';
  const model = useMemo(
    () => pyqModeModel(pyqMode, selection, user.electiveSubjectId),
    [pyqMode, selection, user.electiveSubjectId],
  );
  const paper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;
  const filterKey = JSON.stringify(model.filter);

  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: PYQ_SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, PYQ_SCREEN_LIMIT);
  const reason = pyqModeEmptyReason(model, selection);
  const byPaper = isBackendConfigured();

  const subtitle =
    byPaper && paper
      ? `${t(paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
      : hi
        ? 'वास्तविक पेपरों से'
        : 'Straight from real papers';

  return (
    <View style={s.screen}>
      {truncated ? (
        <Text
          style={[
            s.faint,
            {
              color: theme.color.warning,
              paddingHorizontal: theme.space.lg,
              paddingTop: theme.space.md,
            },
          ]}
        >
          {hi
            ? `${truncated.total} में से पहले ${truncated.shown} दिखाए जा रहे हैं — विषय या वर्ष चुनें।`
            : `Showing the first ${truncated.shown} of ${truncated.total} — choose a subject or year.`}
        </Text>
      ) : null}

      <View style={{ flex: 1 }}>
        <AsyncSection
          state={questions}
          lang={lang}
          empty={{
            icon: '📜',
            title: hi ? 'कोई प्रश्न नहीं' : 'No questions',
            // A complete selection that still returns nothing means the bank
            // has no questions for it yet, which is a different thing from an
            // unfinished choice and worth saying rather than leaving blank.
            body:
              (hi ? reason?.hi : reason?.en) ??
              (hi
                ? 'इस चयन के लिए बैंक में अभी कोई प्रश्न नहीं है।'
                : 'The bank has no questions for this selection yet.'),
          }}
        >
          {(list) => (
            /* A previous-year paper is a paper: it gets the same choice a mock
               gets, rather than revealing the key as you go. */
            <PracticeSession questions={list} title={subtitle} examId={selection.examId} chooseMode />
          )}
        </AsyncSection>
      </View>
    </View>
  );
}
