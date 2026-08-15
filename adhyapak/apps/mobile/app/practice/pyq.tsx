import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  countQuestions,
  defaultPyqSelection,
  isBackendConfigured,
  listPyqYears,
  listQuestions,
  pyqEmptyReason,
  pyqFilterModel,
  pyqTruncation,
  t,
  theme,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeRunner } from '@/components/PracticeRunner';
import { AsyncSection, Chip, s } from '@/components/ui';

/**
 * Previous-year practice.
 *
 * The same funnel as the website — exam → post → subject → year — driven by the
 * same `pyqFilterModel`, so the two apps cannot offer different subjects for
 * the same paper. Posts read PRT / TGT / PGT, the way the bank is categorised,
 * and every subject a paper can test is offered, electives included.
 *
 * Deep links carry the selection on web; here the state is local and seeded
 * from the profile, because there is no address bar to share.
 */

/** See the website's copy of this: a paper's worth, with truncation admitted. */
const SCREEN_LIMIT = 300;

export default function PyqScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';

  // Null until the learner touches a chip, so the view tracks the profile until
  // then. Seeding state from `user` once would freeze whatever the store held
  // before it finished reading AsyncStorage — which is the demo profile, not
  // theirs, so someone preparing for PGT would open on PRT.
  const [chosen, setChosen] = useState<PyqSelection | null>(null);
  const selection = chosen ?? defaultPyqSelection(user);

  const model = useMemo(() => pyqFilterModel(selection), [selection]);
  const filterKey = JSON.stringify(model.filter);

  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  const total = useAsync(() => countQuestions(model.filter), [filterKey]);
  const questions = useAsync(
    () => listQuestions({ ...model.filter, limit: SCREEN_LIMIT }),
    [filterKey],
  );

  const truncated = pyqTruncation(total.data, questions.data?.length ?? 0, SCREEN_LIMIT);
  const reason = pyqEmptyReason(selection, model);
  const update = (patch: Partial<PyqSelection>) => setChosen({ ...selection, ...patch });

  // See the website's copy: offline the bundled sample carries no teaching
  // level, so the paper filter is dropped and the paper's name must not be
  // printed beside a count that was never narrowed by it.
  const byPaper = isBackendConfigured();

  return (
    <View style={s.screen}>
      <ScrollView
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg }}
      >
        <Row label={hi ? 'पद' : 'Post'}>
          <Chip
            label={hi ? 'सभी' : 'All'}
            active={!selection.paperId}
            onPress={() => update({ paperId: undefined, subjectId: undefined })}
          />
          {model.paperOptions.map((o) => (
            <Chip
              key={o.value}
              label={hi ? o.labelHi : o.labelEn}
              active={selection.paperId === o.value}
              onPress={() => update({ paperId: o.value, subjectId: undefined })}
            />
          ))}
        </Row>

        {model.subjectOptions.length > 0 ? (
          <Row label={hi ? 'विषय' : 'Subject'}>
            <Chip
              label={hi ? 'सभी' : 'All'}
              active={!model.filter.subjectId}
              onPress={() => update({ subjectId: undefined })}
            />
            {model.subjectOptions.map((o) => (
              <Chip
                key={o.value}
                label={hi ? o.labelHi : o.labelEn}
                active={model.filter.subjectId === o.value}
                onPress={() => update({ subjectId: o.value })}
              />
            ))}
          </Row>
        ) : null}

        {(years.data ?? []).length > 0 ? (
          <Row label={hi ? 'वर्ष' : 'Year'}>
            <Chip
              label={hi ? 'सभी' : 'All'}
              active={selection.year === undefined}
              onPress={() => update({ year: undefined })}
            />
            {(years.data ?? []).map((y) => (
              <Chip
                key={y}
                label={String(y)}
                active={selection.year === y}
                onPress={() => update({ year: y })}
              />
            ))}
          </Row>
        ) : null}

      </ScrollView>

      {/* The filter's real size, from the database — not the length of what
          this screen managed to fetch. */}
      <View
        style={{
          paddingHorizontal: theme.space.lg,
          paddingBottom: theme.space.sm,
        }}
      >
        <Text style={s.muted}>
          {total.loading
            ? hi
              ? 'गिन रहे हैं…'
              : 'Counting…'
            : `${total.data ?? 0} ${hi ? 'प्रश्न' : total.data === 1 ? 'question' : 'questions'}${
                byPaper && model.paper ? ` · ${t(model.paper.name, lang)}` : ''
              }`}
        </Text>
        {!byPaper ? (
          <Text style={[s.faint, { marginTop: 4 }]}>
            {hi
              ? 'ऑफ़लाइन — नमूने में पेपर की जानकारी नहीं है, पद से छँटाई नहीं हो सकती।'
              : 'Offline — the bundled sample has no paper information to filter by post.'}
          </Text>
        ) : null}
        {truncated ? (
          <Text style={[s.faint, { marginTop: 4, color: theme.color.warning }]}>
            {hi
              ? `${truncated.total} में से पहले ${truncated.shown} दिखाए जा रहे हैं — विषय या वर्ष चुनें।`
              : `Showing the first ${truncated.shown} of ${truncated.total} — choose a subject or year.`}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingHorizontal: theme.space.lg }}>
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
            <PracticeRunner
              questions={list}
              title={hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
              subtitle={
                byPaper && model.paper
                  ? `${t(model.paper.name, lang)}${selection.year ? ` · ${selection.year}` : ''}`
                  : hi
                    ? 'वास्तविक पेपरों से'
                    : 'Straight from real papers'
              }
            />
          )}
        </AsyncSection>
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: theme.space.md }}>
      <Text style={[s.faint, { marginBottom: 6 }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}
