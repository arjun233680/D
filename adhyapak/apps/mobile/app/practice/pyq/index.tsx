import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  PYQ_MODES,
  countQuestions,
  getPaper,
  defaultPyqSelection,
  isBackendConfigured,
  listPyqYears,
  pyqModeEmptyReason,
  pyqModeLabel,
  pyqModeModel,
  pyqSelectionToParams,
  t,
  theme,
  type PyqMode,
  type PyqSelection,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Screen } from '@/components/prep';
import { useAsync } from '@/lib/useAsync';
import { Button, Chip, s } from '@/components/ui';

/**
 * Choosing a previous-year set.
 *
 * Three tabs, because a learner arrives with one of three questions and they
 * are not the same question:
 *
 *   Full Papers    — "HTET TGT 2024, all of it". A rehearsal, in printed order.
 *   Section-wise   — "CDP from 2024". One block of one sitting.
 *   Topic Practice — "every Piaget question there has ever been". No year at
 *                    all: mixing them is the point.
 *
 * This used to be one screen of filter rows — post, subject, year, all
 * independent — which could express all three and made none of them obvious. A
 * learner wanting to sit a full paper had to know to leave subject on "All",
 * and one wanting topic practice had to know to leave year on "All", with
 * nothing on screen saying so.
 *
 * The exam and paper come from the learner's goal and are not asked again. They
 * can still be changed here, because a TGT candidate looking at last year's PRT
 * paper is a reasonable thing to want, and the switch carries across all three
 * tabs.
 */
export default function PyqScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';

  const [mode, setMode] = useState<PyqMode>('full-paper');
  // Null until the learner touches something, so the view tracks the profile
  // until then. Seeding from `user` once would freeze whatever the store held
  // before AsyncStorage was read — the demo profile, not theirs.
  const [chosen, setChosen] = useState<PyqSelection | null>(null);
  const selection = chosen ?? defaultPyqSelection(user);

  const model = pyqModeModel(mode, selection, user.electiveSubjectId);
  const years = useAsync(() => listPyqYears(selection.examId), [selection.examId]);
  const total = useAsync(() => countQuestions(model.filter), [JSON.stringify(model.filter)]);

  const reason = pyqModeEmptyReason(model, selection);

  /*
   * The screen is two screens.
   *
   * Which paper and which subject are one question — "whose paper am I
   * looking at" — and the three modes are a different one, asked of that
   * paper. Showing the modes first put the second question above the first,
   * so the tabs changed what was counted before anything had said what was
   * being counted.
   *
   * Settled means both halves are answered. After onboarding they always are,
   * so the common case opens straight on the modes with a line saying which
   * paper they belong to.
   */
  const settled =
    Boolean(selection.paperId) &&
    (model.electiveOptions.length === 0 || Boolean(model.electiveSubjectId));
  const [editing, setEditing] = useState(false);
  const choosing = editing || !settled;

  const chosenPaper = selection.paperId ? getPaper(selection.paperId)?.paper : undefined;
  const chosenSubject = model.electiveSubjectId
    ? model.electiveOptions.find((o) => o.value === model.electiveSubjectId)
    : undefined;
  const update = (patch: Partial<PyqSelection>) =>
    setChosen({ ...selection, ...patch });

  const ready = !reason && total.data !== undefined && total.data > 0;

  // Switching tab keeps the paper and year but drops what the other tab was
  // narrowing by: a topic id means nothing in Full Papers, and a section means
  // nothing in Topic Practice.
  const switchMode = (next: PyqMode) => {
    setMode(next);
    setChosen({ ...selection, subjectId: undefined, topicId: undefined });
  };

  return (
    <Screen
      title="PYQ"
      subtitle={hi ? 'विगत वर्ष प्रश्न' : 'Previous Year Questions'}
      lang={lang}
      back
    >

      {/* Which paper this is about, and a way back to change it. Shown only
          once the question below it has an owner. */}
      {!choosing ? (
        <Pressable
          onPress={() => setEditing(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.sm,
            paddingHorizontal: theme.space.lg,
            paddingVertical: 11,
            backgroundColor: theme.color.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.color.border,
          }}
        >
          <Text style={[s.body, { flex: 1, fontFamily: theme.family.bodySemi }]} numberOfLines={1}>
            {[chosenPaper ? t(chosenPaper.name, lang) : null, chosenSubject ? (hi ? chosenSubject.labelHi : chosenSubject.labelEn) : null]
              .filter(Boolean)
              .join('  ·  ')}
          </Text>
          <Text style={s.faint}>{hi ? 'बदलें' : 'Change'}</Text>
          <Text style={{ color: theme.color.textMuted }}>✏️</Text>
        </Pressable>
      ) : null}

      {/* The three questions, as three tabs — only once there is a paper for
          them to be about. */}
      {!choosing ? (
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.color.border,
            backgroundColor: theme.color.surface,
          }}
        >
          {PYQ_MODES.map((m) => {
            const on = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: on ? theme.color.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: theme.font.sm,
                    fontFamily: on ? theme.family.bodySemi : theme.family.body,
                    color: on ? theme.color.primary : theme.color.textMuted,
                  }}
                >
                  {t(pyqModeLabel(m), lang)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: theme.space.lg, paddingBottom: theme.space.xl }}>
        {/*
          Step A. Level cards, not a chip row: this is the first question the
          screen asks and its answer decides everything under it, so it gets the
          room. The level from onboarding arrives already chosen — the profile is
          the default — and can be changed here without going back through it.
        */}
        {choosing && model.paperOptions.length > 1 ? (
          <View style={{ gap: theme.space.md, marginBottom: theme.space.lg }}>
            <Text style={[s.faint, { fontFamily: theme.family.bodySemi }]}>
              {hi ? 'कौन-सा स्तर?' : 'Which level?'}
            </Text>
            {model.paperOptions.map((o) => {
              const paper = getPaper(o.value)?.paper;
              const on = selection.paperId === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() =>
                    update({
                      paperId: o.value,
                      electiveSubjectId: undefined,
                      subjectId: undefined,
                      topicId: undefined,
                    })
                  }
                  style={{
                    backgroundColor: theme.color.surface,
                    borderRadius: theme.radius.md,
                    borderWidth: 2,
                    borderColor: on ? theme.color.primary : theme.color.border,
                    padding: theme.space.lg,
                  }}
                >
                  <Text style={s.h2}>{hi ? o.labelHi : o.labelEn}</Text>
                  {paper ? (
                    <Text style={[s.faint, { marginTop: 2 }]} numberOfLines={1}>
                      {t(paper.name, lang)}  ·  {paper.totalQuestions} {hi ? 'प्रश्न' : 'questions'}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Step B. Only for levels that offer a subject choice. A grid rather
            than a row: twelve TGT subjects and twenty-one PGT ones scrolling
            sideways hide most of themselves off the right edge. */}
        {choosing && model.electiveOptions.length > 0 ? (
          <View style={{ marginBottom: theme.space.md }}>
            <Text style={[s.faint, { marginBottom: 6, fontFamily: theme.family.bodySemi }]}>
              {hi ? 'कौन-सा विषय?' : 'Which subject?'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
              {model.electiveOptions.map((o) => {
                const on = model.electiveSubjectId === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() =>
                      update({ electiveSubjectId: o.value, subjectId: undefined, topicId: undefined })
                    }
                    style={{
                      flexGrow: 1,
                      flexBasis: '45%',
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.space.md,
                      paddingVertical: 10,
                      backgroundColor: on ? theme.color.primaryLight : theme.color.surfaceAlt,
                      borderWidth: 2,
                      borderColor: on ? theme.color.primary : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontFamily: theme.family.bodySemi,
                        color: theme.color.text,
                      }}
                      numberOfLines={2}
                    >
                      {hi ? o.labelHi : o.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Years — the first two tabs only. Topic practice mixes them. */}
        {!model.needsElective && model.showYears && (years.data ?? []).length > 0 ? (
          <Row label={hi ? 'वर्ष' : 'Year'}>
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

        {/* Section cards: the paper's own blocks, with the learner's elective
            already resolved, so a TGT Science candidate sees Science and not
            all twelve options. */}
        {mode === 'section' && !model.needsElective && selection.year ? (
          <View style={{ gap: theme.space.md }}>
            {model.sections.map((sec) => {
              const on = selection.subjectId === sec.subjectId;
              return (
                <Pressable
                  key={sec.subjectId}
                  onPress={() => update({ subjectId: sec.subjectId })}
                  style={{
                    backgroundColor: theme.color.surface,
                    borderRadius: theme.radius.md,
                    borderWidth: 2,
                    borderColor: on ? theme.color.primary : theme.color.border,
                    padding: theme.space.lg,
                  }}
                >
                  <Text style={s.h2}>
                    {hi ? sec.labelHi : sec.labelEn}
                    {sec.elective ? (
                      <Text style={s.faint}>{hi ? '  · आपका विषय' : '  · your subject'}</Text>
                    ) : null}
                  </Text>
                  <Text style={[s.faint, { marginTop: 2 }]}>
                    {sec.questions} {hi ? 'प्रश्न इस पेपर में' : 'questions in this paper'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Topic practice: subject tabs carry no counts — a number on a tab
            invites comparing subjects, which is not what the tab is for — and
            topic cards carry them, because that is the number being chosen. */}
        {mode === 'topic' && !model.needsElective ? (
          <>
            <Row label={hi ? 'विषय' : 'Subject'}>
              {model.subjectTabs.map((o) => (
                <Chip
                  key={o.value}
                  label={hi ? o.labelHi : o.labelEn}
                  active={(selection.subjectId ?? model.subjectTabs[0]?.value) === o.value}
                  onPress={() => update({ subjectId: o.value, topicId: undefined })}
                />
              ))}
            </Row>
            <View style={{ gap: theme.space.md }}>
              {model.topics.map((topic) => (
                <TopicCard
                  key={topic.topicId}
                  topicId={topic.topicId}
                  label={hi ? topic.labelHi : topic.labelEn}
                  examId={selection.examId}
                  active={selection.topicId === topic.topicId}
                  onPress={() => update({ topicId: topic.topicId })}
                />
              ))}
            </View>
          </>
        ) : null}

        {!isBackendConfigured() ? (
          <Text style={[s.faint, { marginTop: theme.space.lg }]}>
            {hi
              ? 'ऑफ़लाइन — इस बिल्ड में कोई प्रश्न बैंक नहीं है।'
              : 'Offline — this build has no question bank.'}
          </Text>
        ) : null}
      </ScrollView>

      {/* Choosing: one button that closes the two steps. Counting anything
          here would be counting a paper nobody has named yet. */}
      {choosing ? (
        <View
          style={{
            padding: theme.space.lg,
            borderTopWidth: 1,
            borderTopColor: theme.color.border,
            backgroundColor: theme.color.surface,
          }}
        >
          <Button
            label={hi ? 'आगे बढ़ें' : 'Continue'}
            disabled={!settled}
            onPress={() => setEditing(false)}
          />
        </View>
      ) : (
        /* Step C: what is about to start, at its real size, from the database. */
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
                {reason ? (hi ? reason.hi : reason.en) : t(pyqModeLabel(mode), lang)}
              </Text>
            </>
          )}

          <Button
            label={
              mode === 'full-paper'
                ? hi
                  ? 'पूरा टेस्ट शुरू करें'
                  : 'Start full test'
                : hi
                  ? 'अभ्यास शुरू करें'
                  : 'Start practice'
            }
            disabled={!ready}
            onPress={() =>
              router.push({
                pathname: '/practice/pyq/attempt',
                params: { ...pyqSelectionToParams(selection), mode },
              })
            }
            style={{ marginTop: theme.space.md }}
          />
        </View>
      )}
    </Screen>
  );
}

/**
 * A topic card with the number of questions behind it.
 *
 * The count is asked for per card rather than in one query because it is the
 * number the learner is choosing between — "Piaget 84, Learning 31" is the
 * whole decision — and a card that showed a blank until some aggregate landed
 * would make the cheap-looking topics look empty.
 */
function TopicCard({
  topicId,
  label,
  examId,
  active,
  onPress,
}: {
  topicId: string;
  label: string;
  examId?: string;
  active: boolean;
  onPress: () => void;
}) {
  const count = useAsync(() => countQuestions({ pyqOnly: true, topicId, examId }), [topicId, examId]);
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.md,
        borderWidth: 2,
        borderColor: active ? theme.color.primary : theme.color.border,
        padding: theme.space.lg,
      }}
    >
      <Text style={[s.h2, { flex: 1 }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[s.muted, { fontVariant: ['tabular-nums'] }]}>
        {count.data === undefined ? '—' : count.data}
      </Text>
    </Pressable>
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
