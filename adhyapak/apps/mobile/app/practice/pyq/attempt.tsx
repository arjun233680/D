import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  countQuestions,
  isBackendConfigured,
  listQuestions,
  pyqEmptyReason,
  pyqFilterModel,
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
  const { lang } = useStore();
  const hi = lang === 'hi';
  const params = useLocalSearchParams<Record<string, string>>();

  // Route params are the whole selection: nothing falls back to the profile
  // here, because the chooser has already resolved it and passed it on.
  const selection = useMemo(
    () => pyqSelectionFromParams((key) => params[key] ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(params)],
  );
  const model = useMemo(() => pyqFilterModel(selection), [selection]);
  const filterKey = JSON.stringify(model.filter);

  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: PYQ_SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, PYQ_SCREEN_LIMIT);
  const reason = pyqEmptyReason(selection, model);
  const byPaper = isBackendConfigured();

  const subtitle =
    byPaper && model.paper
      ? `${t(model.paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
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
            body: hi ? reason.hi : reason.en,
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
