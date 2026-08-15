import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  countQuestions,
  defaultPyqSelection,
  isBackendConfigured,
  listPyqYears,
  pyqEmptyReason,
  pyqFilterModel,
  pyqSelectionToParams,
  t,
  theme,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { Button, Chip, s } from '@/components/ui';

/**
 * Choosing a previous-year set.
 *
 * The same funnel as the website — exam → post → subject → year — driven by the
 * same `pyqFilterModel`, so the two apps cannot offer different subjects for
 * the same paper. Posts read PRT / TGT / PGT, the way the bank is categorised,
 * and every subject a paper can test is offered, electives included.
 *
 * The questions open on their own screen. Filters sitting above a live runner
 * meant a stray tap on a chip could swap out the paper a learner was part-way
 * through, and there was no moment where they decided they were starting.
 */

export default function PyqScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';

  // Null until the learner touches a chip, so the view tracks the profile until
  // then. Seeding state from `user` once would freeze whatever the store held
  // before it finished reading AsyncStorage — which is the demo profile, not
  // theirs, so someone preparing for PGT would open on PRT.
  const [chosen, setChosen] = useState<PyqSelection | null>(null);
  const selection = chosen ?? defaultPyqSelection(user);
  const model = pyqFilterModel(selection);

  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  const total = useAsync(() => countQuestions(model.filter), [JSON.stringify(model.filter)]);

  const reason = pyqEmptyReason(selection, model);
  const update = (patch: Partial<PyqSelection>) => setChosen({ ...selection, ...patch });

  // See the website's copy: offline the bundled sample carries no teaching
  // level, so the paper filter is dropped and the paper's name must not be
  // printed beside a count that was never narrowed by it.
  const byPaper = isBackendConfigured();
  const ready = total.data !== undefined && total.data > 0;

  const subjectLabel = model.filter.subjectId
    ? model.subjectOptions.find((o) => o.value === model.filter.subjectId)?.[
        hi ? 'labelHi' : 'labelEn'
      ]
    : hi
      ? 'सभी विषय'
      : 'All subjects';

  return (
    <View style={s.screen}>
      {/* The runner used to supply this screen's header title; now that the
          questions live on their own route, the chooser has to name itself or
          the stack falls back to printing the route path. */}
      <Stack.Screen options={{ title: hi ? 'विगत वर्ष प्रश्न' : 'Previous year questions' }} />
      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.xl }}>
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

        {!byPaper ? (
          <Text style={[s.faint, { marginTop: theme.space.sm }]}>
            {hi
              ? 'ऑफ़लाइन — नमूने में पेपर की जानकारी नहीं है, पद से छँटाई नहीं हो सकती।'
              : 'Offline — the bundled sample has no paper information to filter by post.'}
          </Text>
        ) : null}
      </ScrollView>

      {/* What is about to start: the filter's real size, from the database. */}
      <View
        style={{
          padding: theme.space.lg,
          borderTopWidth: 1,
          borderTopColor: theme.color.border,
          backgroundColor: theme.color.surface,
        }}
      >
        {total.loading ? (
          <Text style={s.muted}>{hi ? 'गिन रहे हैं…' : 'Counting…'}</Text>
        ) : (
          <>
            <Text style={[s.h2, { fontVariant: ['tabular-nums'] }]}>
              {total.data ?? 0}{' '}
              <Text style={s.muted}>
                {hi ? 'प्रश्न' : total.data === 1 ? 'question' : 'questions'}
              </Text>
            </Text>
            <Text style={[s.faint, { marginTop: 4 }]}>
              {ready
                ? [
                    byPaper && model.paper ? t(model.paper.name, lang) : null,
                    subjectLabel,
                    selection.year ?? (hi ? 'सभी वर्ष' : 'All years'),
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : hi
                  ? reason.hi
                  : reason.en}
            </Text>
          </>
        )}

        <Button
          label={hi ? 'टेस्ट शुरू करें' : 'Start test'}
          disabled={!ready}
          onPress={() =>
            router.push({
              pathname: '/practice/pyq/attempt',
              params: pyqSelectionToParams(selection),
            })
          }
          style={{ marginTop: theme.space.md }}
        />
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
