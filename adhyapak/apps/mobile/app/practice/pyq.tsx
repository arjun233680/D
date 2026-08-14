import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { listPyqYears, listQuestions, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeRunner } from '@/components/PracticeRunner';
import { AsyncSection, Chip, s } from '@/components/ui';

/**
 * Previous-year practice.
 *
 * The year chips come from `pyq_year` in the database, so they appear once real
 * papers are imported and stay absent until then. Nothing here parses the legacy
 * prose provenance — a year has to mean the year the paper was sat.
 */
export default function PyqScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const [year, setYear] = useState<number | null>(null);

  const years = useAsync(() => listPyqYears(user.goalExamId), [user.goalExamId]);
  const state = useAsync(
    () => listQuestions({ pyqOnly: true, examId: user.goalExamId, year: year ?? undefined }),
    [user.goalExamId, year],
  );

  return (
    <View style={s.screen}>
      {years.data && years.data.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ padding: theme.space.lg }}
        >
          <Chip label={hi ? 'सभी वर्ष' : 'All years'} active={year === null} onPress={() => setYear(null)} />
          {years.data.map((y) => (
            <Chip key={y} label={String(y)} active={year === y} onPress={() => setYear(y)} />
          ))}
        </ScrollView>
      ) : null}

      <View style={{ flex: 1, padding: theme.space.lg }}>
        <AsyncSection
          state={state}
          lang={lang}
          empty={{
            icon: '📜',
            title: hi ? 'विगत वर्ष प्रश्न नहीं' : 'No previous-year questions',
            body: year
              ? hi
                ? `${year} के पेपर से कोई प्रश्न अभी उपलब्ध नहीं है।`
                : `No questions from the ${year} paper are available yet.`
              : hi
                ? 'इस परीक्षा के लिए विगत वर्ष प्रश्न अभी जोड़े नहीं गए हैं।'
                : 'Previous-year questions for this exam have not been added yet.',
          }}
        >
          {(questions) => (
            <PracticeRunner
              questions={questions}
              title={hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
              subtitle={
                year
                  ? hi
                    ? `${year} का पेपर · ${questions.length} प्रश्न`
                    : `${year} paper · ${questions.length} questions`
                  : hi
                    ? 'वास्तविक पेपरों से, टैग सहित'
                    : 'Straight from real papers, tagged'
              }
            />
          )}
        </AsyncSection>
      </View>
    </View>
  );
}
