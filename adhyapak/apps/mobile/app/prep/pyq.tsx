import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listPrepSections,
  listPyqSessions,
  listSubjectParts,
  listTopicsForSubject,
  listTopicsForSubjectTree,
  pyqSelectionToParams,
  t,
  theme,
  type Bilingual,
  type Lang,
  type PrepSection,
  type PyqSession,
  type SubjectPart,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useResponsive } from '@/lib/responsive';
import { selectionTitle, useSelection } from '@/lib/useSelection';
import {
  CANVAS,
  EmptyNote,
  INK,
  MUTED,
  PrepHeader,
  PrepLoading,
  PrepShell,
  SelectionPicker,
  VIOLET,
} from '@/components/prep';

/**
 * Previous year questions, three ways.
 *
 * Full Test    — a whole paper as it was sat, one card per year.
 * Section Wise — one block of the paper across every year: all the CDP ever
 *                asked, by year, with an "all years at once" set on top.
 * Topic Wise   — narrower still, down to "Venn Diagrams" or "मुहावरे".
 *
 * The sections are the paper's own blueprint from `paper_sections`, with the
 * 60-mark elective resolved to the learner's chosen subject — so an HTET TGT
 * Science candidate sees seven named sections and a Maths candidate sees the
 * same six plus Maths, without either list being written down here.
 *
 * WHY EVERY YEAR IS LISTED EVEN AT ZERO
 *
 * The years come from `pyq_years` — when the board actually held the exam —
 * and the counts from the bank. Those are different facts and the screen used
 * to conflate them: it built its year list out of `questions`, so an empty bank
 * showed an empty screen, and an aspirant saw nothing where seven papers exist.
 * Now 2018 to 2024 always appear, and a year we hold none of says zero.
 *
 * Ported from apps/web/app/prep/pyq/page.tsx.
 */

type Tab = 'full' | 'section' | 'topic';

const TABS: { id: Tab; icon: string; label: Bilingual }[] = [
  { id: 'full', icon: '📄', label: { en: 'Full Test', hi: 'पूर्ण टेस्ट' } },
  { id: 'section', icon: '🥧', label: { en: 'Section Wise', hi: 'अनुभाग अनुसार' } },
  { id: 'topic', icon: '☰', label: { en: 'Topic Wise', hi: 'टॉपिक अनुसार' } },
];

/**
 * Where a card opens.
 *
 * The player already exists at /practice/pyq/attempt — the exam window, the
 * grader, the solutions and the "nothing matched" message are all there and
 * are what a mock test uses. These cards were the only thing not wired to it.
 *
 * The selection travels as query parameters through the same encoder the older
 * PYQ screen uses, so a link from here and a link from the website mean the
 * same thing, and either can be shared or reopened.
 */
const playerHref = (sel: {
  examId?: string;
  year?: number;
  subjectId?: string;
  topicId?: string;
  electiveSubjectId?: string;
}): string => {
  const params = pyqSelectionToParams(sel);
  const query = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `/practice/pyq/attempt?${query}`;
};

/** Card tints, cycled so a column of years does not read as one grey block. */
const TINTS = ['#f1eefc', '#e8f7ee', '#fff3e6', '#fdeaf3', '#e6f0fd', '#f6efff', '#e9f7f3'];

export default function PyqBrowserScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  const { selection, selections, loading } = useSelection();
  const askedFor = useLocalSearchParams<{ level?: string }>().level;

  const [tab, setTab] = useState<Tab>('full');
  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [paperYears, setPaperYears] = useState<PyqSession[]>([]);
  const [sectionYears, setSectionYears] = useState<PyqSession[]>([]);
  const [topics, setTopics] = useState<{ id: string; name: Bilingual }[]>([]);
  const [parts, setParts] = useState<SubjectPart[]>([]);
  /** Which part of a composite section is open — null means "All". */
  const [part, setPart] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [list, sessions] = await Promise.all([
        listPrepSections(examId, level, electiveId),
        listPyqSessions(examId),
      ]);
      if (!live) return;
      setSections(list);
      setActive((a) => a ?? list[0]?.subjectId ?? null);
      setPaperYears(sessions);
      setBusy(false);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  // The section and topic tabs both hang off the selected chip, so they load
  // together rather than each keeping its own idea of which section is open.
  useEffect(() => {
    let live = true;
    if (!examId || !active) return;
    void (async () => {
      const [sessions, children] = await Promise.all([
        listPyqSessions(examId, active),
        listSubjectParts(active),
      ]);
      if (!live) return;
      setSectionYears(sessions);
      setParts(children);
      setPart(null);
      // "All" spans the section and its parts; a part tab is just that subject.
      const list =
        children.length > 0
          ? await listTopicsForSubjectTree(active)
          : await listTopicsForSubject(active);
      if (!live) return;
      setTopics(list);
    })();
    return () => {
      live = false;
    };
  }, [examId, active]);

  // A part tab narrows the topic list to that subject; "All" spans the tree.
  useEffect(() => {
    let live = true;
    if (!active || parts.length === 0) return;
    void (async () => {
      const list = part
        ? await listTopicsForSubject(part)
        : await listTopicsForSubjectTree(active);
      if (live) setTopics(list);
    })();
    return () => {
      live = false;
    };
  }, [part, active, parts.length]);

  const chosen = useMemo(
    () => sections.find((sec) => sec.subjectId === active),
    [sections, active],
  );

  if (loading || !selection) {
    return <PrepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;

  /*
   * Landing on PYQ without naming a level, while sitting more than one, means
   * the screen has no way to know which half of the learner's preparation they
   * came for. Ask, rather than opening the first one and looking broken.
   */
  if (!askedFor && selections.length > 1) {
    return (
      <PrepShell lang={lang}>
        {(openMenu) => (
          <View style={{ flex: 1, backgroundColor: CANVAS }}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                <PrepHeader
                  title="PYQ"
                  subtitle={hi ? 'विगत वर्ष प्रश्न' : 'Previous Year Questions'}
                  onMenu={openMenu}
                  back
                  lang={lang}
                />
                <SelectionPicker
                  title={hi ? 'PYQ देखने हेतु परीक्षा चुनें' : 'Select an Exam to View PYQs'}
                  subtitle={
                    hi
                      ? 'PYQ केवल उन्हीं परीक्षाओं के दिखेंगे जो आपने चुनी हैं।'
                      : 'PYQs will be shown only for the exams you selected.'
                  }
                  items={selections.map((sel) => ({
                    key: sel.level.id,
                    examShort: sel.exam?.shortName ?? '',
                    levelName: sel.level.name,
                    subjectName: sel.subject ? t(sel.subject.name, lang) : undefined,
                    icon: sel.subject?.icon ?? sel.level.icon,
                    color: sel.subject?.color ?? sel.level.color,
                  }))}
                  hrefFor={(key) => `/prep/pyq?level=${key}`}
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </PrepShell>
    );
  }

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <PrepHeader
                title="PYQ"
                subtitle={selectionTitle(selection, subjectName)}
                onMenu={openMenu}
                back
                lang={lang}
              />

              {/* ------------------------------------------------------ tabs */}
              <View
                style={{
                  marginTop: 16,
                  flexDirection: 'row',
                  borderBottomWidth: 1,
                  borderBottomColor: '#eeebf8',
                }}
              >
                {TABS.map((item) => {
                  const on = tab === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setTab(item.id)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 14,
                        borderBottomWidth: 2,
                        borderBottomColor: on ? VIOLET : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 13.5 }}>{item.icon}</Text>
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontFamily: theme.family.bodySemi,
                          color: on ? VIOLET : MUTED,
                        }}
                      >
                        {t(item.label, lang)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {tab === 'full' ? (
                <View
                  style={{
                    width: '100%',
                    maxWidth: r.maxWidth,
                    alignSelf: 'center',
                    paddingHorizontal: r.gutter,
                    paddingTop: 20,
                  }}
                >
                  <FullTest
                    years={paperYears}
                    busy={busy}
                    hi={hi}
                    examId={examId}
                    electiveId={electiveId}
                  />
                </View>
              ) : (
                <>
                  <SectionChips
                    sections={sections}
                    active={active}
                    onPick={setActive}
                    gutter={r.gutter}
                  />

                  <View
                    style={{
                      width: '100%',
                      maxWidth: r.maxWidth,
                      alignSelf: 'center',
                      paddingHorizontal: r.gutter,
                    }}
                  >
                    {chosen ? (
                      <View
                        style={{
                          marginTop: 16,
                          borderRadius: 16,
                          backgroundColor: '#f4f1fd',
                          padding: 16,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View
                            style={{
                              height: 48,
                              width: 48,
                              borderRadius: 24,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: `${chosen.color}1a`,
                            }}
                          >
                            <Text style={{ fontSize: 21 }}>{chosen.icon}</Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={{
                                fontSize: 18,
                                fontFamily: theme.family.displayBold,
                                color: chosen.color,
                              }}
                            >
                              {chosen.shortName}
                            </Text>
                            {/* The syllabus wording under the chip's short one —
                                "CDP" over "(Child Development & Pedagogy)". */}
                            <Text
                              style={{
                                fontSize: 12.5,
                                fontFamily: theme.family.body,
                                color: MUTED,
                              }}
                            >
                              ({t(chosen.name, lang)})
                            </Text>
                            <Text
                              style={{
                                marginTop: 2,
                                fontSize: 12,
                                fontFamily: theme.family.body,
                                color: MUTED,
                              }}
                            >
                              {tab === 'topic'
                                ? parts.length > 0
                                  ? hi
                                    ? `कुल टॉपिक्स: ${parts.length} विषय, ${topics.length} टॉपिक्स`
                                    : `${parts.length} subjects, ${topics.length} topics`
                                  : hi
                                    ? `कुल टॉपिक्स: ${topics.length}`
                                    : `${topics.length} topics`
                                : hi
                                  ? 'विगत वर्ष प्रश्न — वर्ष अनुसार'
                                  : 'Practice PYQs Year Wise'}
                            </Text>
                          </View>
                        </View>

                        {/* A section that is several subjects offers them as
                            tabs. One that is not shows nothing here — a lone
                            "All" tab is a control with no choice in it. */}
                        {parts.length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginTop: 12 }}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            <PartTab
                              label={hi ? 'सभी' : 'All'}
                              on={part === null}
                              color={chosen.color}
                              onPress={() => setPart(null)}
                            />
                            {parts.map((p) => (
                              <PartTab
                                key={p.subjectId}
                                label={p.shortName}
                                on={part === p.subjectId}
                                color={chosen.color}
                                onPress={() => setPart(p.subjectId)}
                              />
                            ))}
                          </ScrollView>
                        ) : null}
                      </View>
                    ) : null}

                    {tab === 'section' ? (
                      <SectionWise
                        years={sectionYears}
                        hi={hi}
                        examId={examId}
                        subjectId={active}
                        electiveId={electiveId}
                      />
                    ) : (
                      <TopicWise
                        topics={topics}
                        lang={lang}
                        hi={hi}
                        examId={examId}
                        electiveId={electiveId}
                      />
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </PrepShell>
  );
}

/* ------------------------------------------------------------------ tabs */

function FullTest({
  years,
  busy,
  hi,
  examId,
  electiveId,
}: {
  years: PyqSession[];
  busy: boolean;
  hi: boolean;
  examId?: string;
  electiveId?: string;
}) {
  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          borderRadius: 16,
          backgroundColor: '#fff',
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 22 }}>📄</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, fontFamily: theme.family.displayBold, color: INK }}>
            {hi ? 'पूर्ण टेस्ट (वर्ष अनुसार)' : 'Full Test (Year Wise)'}
          </Text>
          <Text
            style={{ fontSize: 12.5, lineHeight: 17, fontFamily: theme.family.body, color: MUTED }}
          >
            {hi
              ? 'पूरे विगत वर्ष पेपर असली परीक्षा की तरह हल करें'
              : 'Solve complete previous year papers as a real exam'}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#ded9f3',
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontFamily: theme.family.displayBold, color: VIOLET }}>
            {hi ? 'पैटर्न' : 'Exam Pattern'}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        {busy ? null : years.length === 0 ? (
          <EmptyNote>
            {hi
              ? 'इस परीक्षा के लिए अभी कोई वर्ष दर्ज नहीं है।'
              : 'No years recorded for this exam yet.'}
          </EmptyNote>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {years.map((y, i) => (
              <View key={y.year} style={{ width: '48.5%' }}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    router.push(
                      playerHref({ examId, year: y.year, electiveSubjectId: electiveId }) as never,
                    )
                  }
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: TINTS[i % TINTS.length],
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🗓️</Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 23,
                      fontFamily: theme.family.displayBold,
                      color: INK,
                    }}
                  >
                    {y.year}
                  </Text>
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 11.5,
                      fontFamily: theme.family.body,
                      color: MUTED,
                    }}
                  >
                    {hi ? 'प्रश्नों की संख्या' : 'No. of Questions'}
                  </Text>
                  <Text
                    style={{ fontSize: 17, fontFamily: theme.family.displayBold, color: INK }}
                  >
                    {y.collected}
                    {/* A year we hold part of says so, rather than implying the
                        whole paper is here. */}
                    {y.paperQuestions && y.collected < y.paperQuestions ? (
                      <Text
                        style={{ fontSize: 12, fontFamily: theme.family.bodySemi, color: MUTED }}
                      >
                        {' '}
                        / {y.paperQuestions}
                      </Text>
                    ) : null}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}

function SectionWise({
  years,
  hi,
  examId,
  subjectId,
  electiveId,
}: {
  years: PyqSession[];
  hi: boolean;
  examId?: string;
  subjectId?: string | null;
  electiveId?: string;
}) {
  const total = years.reduce((sum, y) => sum + y.collected, 0);
  if (years.length === 0) {
    return (
      <View style={{ marginTop: 16 }}>
        <EmptyNote>
          {hi ? 'इस अनुभाग के लिए अभी कोई वर्ष नहीं है।' : 'No years for this section yet.'}
        </EmptyNote>
      </View>
    );
  }
  const first = years[years.length - 1]!.year;
  const last = years[0]!.year;
  return (
    <View style={{ marginTop: 16, gap: 10 }}>
      <Row
        href={playerHref({
          examId,
          subjectId: subjectId ?? undefined,
          electiveSubjectId: electiveId,
        })}
        title={
          hi ? `सभी वर्ष (${first}-${last}) एक साथ` : `All Years (${first}-${last}) at a Time`
        }
        note={hi ? `कुल प्रश्न: ${total}` : `Total questions: ${total}`}
        sub={hi ? 'संयुक्त PYQ' : 'Combined PYQs'}
      />
      {years.map((y) => (
        <Row
          key={y.year}
          href={playerHref({
            examId,
            subjectId: subjectId ?? undefined,
            year: y.year,
            electiveSubjectId: electiveId,
          })}
          title={String(y.year)}
          note={hi ? `कुल प्रश्न: ${y.collected}` : `Total questions: ${y.collected}`}
        />
      ))}
    </View>
  );
}

function TopicWise({
  topics,
  lang,
  hi,
  examId,
  electiveId,
}: {
  topics: { id: string; name: Bilingual }[];
  lang: Lang;
  hi: boolean;
  examId?: string;
  electiveId?: string;
}) {
  const [all, setAll] = useState(false);
  if (topics.length === 0) {
    return (
      <View style={{ marginTop: 16 }}>
        <EmptyNote>
          {hi
            ? 'इस अनुभाग के टॉपिक अभी नहीं जोड़े गए।'
            : 'Topics for this section are not added yet.'}
        </EmptyNote>
      </View>
    );
  }
  const shown = all ? topics : topics.slice(0, 16);
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' }}>
        {shown.map((topic, i) => (
          <Pressable
            key={topic.id}
            accessibilityRole="link"
            onPress={() =>
              router.push(
                playerHref({ examId, topicId: topic.id, electiveSubjectId: electiveId }) as never,
              )
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: '#f4f1fd',
            }}
          >
            <Text style={{ fontSize: 15 }}>📖</Text>
            <Text
              style={{ width: 24, fontSize: 13, fontFamily: theme.family.bodySemi, color: MUTED }}
            >
              {i + 1}.
            </Text>
            <Text
              style={{ flex: 1, minWidth: 0, fontSize: 14, fontFamily: theme.family.body, color: INK }}
            >
              {t(topic.name, lang)}
            </Text>
            <Text style={{ color: '#c4bfda', fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </View>
      {topics.length > 16 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAll((v) => !v)}
          style={{ marginTop: 12, paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, fontFamily: theme.family.bodySemi, color: VIOLET }}>
            {all
              ? hi
                ? 'कम दिखाएँ'
                : 'Show fewer'
              : hi
                ? `और देखें (कुल ${topics.length} टॉपिक्स)`
                : `Show all ${topics.length} topics`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------- fragments */

function SectionChips({
  sections,
  active,
  onPick,
  gutter,
}: {
  sections: PrepSection[];
  active: string | null;
  onPick: (id: string) => void;
  gutter: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 20 }}
      contentContainerStyle={{ gap: 16, paddingHorizontal: gutter }}
    >
      {sections.map((sec) => {
        const on = sec.subjectId === active;
        return (
          <Pressable
            key={sec.subjectId}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onPick(sec.subjectId)}
            style={{ width: 74, alignItems: 'center', gap: 6 }}
          >
            <View
              style={{
                height: 48,
                width: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${sec.color}1a`,
              }}
            >
              <Text style={{ fontSize: 20 }}>{sec.icon}</Text>
            </View>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 11,
                lineHeight: 14,
                fontFamily: theme.family.bodySemi,
                color: on ? sec.color : MUTED,
              }}
            >
              {sec.shortName}
            </Text>
            <View
              style={{
                height: 2,
                width: 32,
                borderRadius: 999,
                backgroundColor: on ? sec.color : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function PartTab({
  label,
  on,
  color,
  onPress,
}: {
  label: string;
  on: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        minHeight: 40,
        justifyContent: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderWidth: on ? 0 : 1,
        borderColor: '#e8e4f6',
        backgroundColor: on ? color : '#fff',
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: theme.family.bodySemi,
          color: on ? '#fff' : MUTED,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Row({
  title,
  note,
  sub,
  href,
}: {
  title: string;
  note: string;
  sub?: string;
  href: string;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(href as never)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1eefc',
        }}
      >
        <Text style={{ fontSize: 16 }}>🗓️</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14.5, fontFamily: theme.family.displayBold, color: INK }}>
          {title}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 11.5, fontFamily: theme.family.body, color: MUTED }}>
            {sub}
          </Text>
        ) : null}
        <Text style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}>{note}</Text>
      </View>
      <Text style={{ color: '#c4bfda', fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
