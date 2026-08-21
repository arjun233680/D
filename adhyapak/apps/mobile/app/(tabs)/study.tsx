import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listPrepSections,
  listSubjectParts,
  listTopicFrequency,
  listTopicsForSubject,
  listTopicsForSubjectTree,
  t,
  theme,
  type Bilingual,
  type PrepSection,
  type SubjectPart,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Icon, subjectIcon } from '@/components/icons';
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
 * Notes, by section and then by chapter — the Study tab.
 *
 * This is apps/web/app/prep/notes/page.tsx. On the website it is a page inside
 * the preparation section; here it is a destination in its own right, because
 * the design's bottom bar puts Study second and a tab has to point somewhere.
 * The content and the queries behind it are identical.
 *
 * WHAT A "CHAPTER" IS HERE
 *
 * The design shows a chapter list — "बाल विकास की अवधारणा", "6 Topics · ~32
 * Pages" — under each section. `units`, the table that would hold chapters, is
 * empty and no topic carries a `unit_id`, so there is no chapter layer in the
 * data to render. What exists is the syllabus topic list, which at this level
 * of the syllabus *is* the chapter list: the design's own chapter titles are
 * word for word the CDP topics.
 *
 * So topics are listed as chapters. When `units` is populated they group under
 * it and this screen reads the group instead.
 *
 * The page count is deliberately absent. "~32 Pages" is a claim about notes
 * that have not been written; there is no column for it and no way to count it.
 * What can be counted is how many questions the bank holds for that topic, and
 * that is a more useful number to a candidate deciding where to start.
 */
export default function StudyScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  const { selection, selections, loading } = useSelection();
  const askedFor = useLocalSearchParams<{ level?: string }>().level;

  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ id: string; name: Bilingual }[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [parts, setParts] = useState<SubjectPart[]>([]);
  const [all, setAll] = useState(false);
  /*
   * Which order the chapters are in.
   *
   * The design puts a Sort control beside the heading. Syllabus order is the
   * default because that is the order a candidate is taught in; the other
   * choice is by how much the bank actually holds, which is what somebody
   * deciding where to start next wants. Both orders come from data already on
   * screen, so neither invents a ranking.
   */
  const [sort, setSort] = useState<'syllabus' | 'questions'>('syllabus');

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [secs, freq] = await Promise.all([
        listPrepSections(examId, level, electiveId),
        listTopicFrequency(examId),
      ]);
      if (!live) return;
      setSections(secs);
      setActive((a) => a ?? secs[0]?.subjectId ?? null);
      const map: Record<string, number> = {};
      for (const row of freq) map[row.topicId] = row.questionCount;
      setCounts(map);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  useEffect(() => {
    let live = true;
    if (!active) return;
    void (async () => {
      const children = await listSubjectParts(active);
      if (!live) return;
      setParts(children);
      // A composite section — Science — lists every part's chapters together.
      const list =
        children.length > 0
          ? await listTopicsForSubjectTree(active)
          : await listTopicsForSubject(active);
      if (!live) return;
      setTopics(list);
      setAll(false);
    })();
    return () => {
      live = false;
    };
  }, [active]);

  const chosen = useMemo(
    () => sections.find((sec) => sec.subjectId === active),
    [sections, active],
  );

  if (loading || !selection) {
    return <PrepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;

  /* A learner with more than one selection is asked which one, rather than
     being shown the first silently. */
  if (!askedFor && selections.length > 1) {
    return (
      <PrepShell lang={lang}>
        {(openMenu) => (
          <View style={{ flex: 1, backgroundColor: CANVAS }}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                <PrepHeader
                  title={hi ? 'नोट्स' : 'Notes'}
                  subtitle={hi ? 'बेहतर पढ़ाई, बेहतर अंक' : 'Study Smart, Score Better'}
                  onMenu={openMenu}
                  lang={lang}
                />
                <SelectionPicker
                  title={hi ? 'नोट्स देखने हेतु परीक्षा चुनें' : 'Select an Exam to View Notes'}
                  subtitle={
                    hi
                      ? 'नोट्स केवल उन्हीं परीक्षाओं के दिखेंगे जो आपने चुनी हैं।'
                      : 'Notes will be shown only for the exams you selected.'
                  }
                  items={selections.map((sel) => ({
                    key: sel.level.id,
                    examShort: sel.exam?.shortName ?? '',
                    levelName: sel.level.name,
                    subjectName: sel.subject ? t(sel.subject.name, lang) : undefined,
                    icon: sel.subject?.icon ?? sel.level.icon,
                    color: sel.subject?.color ?? sel.level.color,
                  }))}
                  hrefFor={(key) => `/(tabs)/study?level=${key}`}
                />
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </PrepShell>
    );
  }

  const ordered =
    sort === 'questions'
      ? [...topics].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
      : topics;
  const shown = all ? ordered : ordered.slice(0, 12);

  return (
    <PrepShell lang={lang}>
      {(openMenu) => (
        <View style={{ flex: 1, backgroundColor: CANVAS }}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              <PrepHeader
                title={hi ? 'नोट्स' : 'Notes'}
                subtitle={selectionTitle(selection, subjectName)}
                onMenu={openMenu}
                lang={lang}
              />

              {/* The selection, restated. The header says it too, but the
                  design repeats it here as a row because this screen's whole
                  content depends on it and the header truncates. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 12,
                  marginHorizontal: r.gutter,
                  borderRadius: theme.radius.card,
                  backgroundColor: theme.color.primaryLight,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                }}
              >
                <Icon name="bookmark" size={18} color={theme.color.primary} />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontSize: 13.5,
                    fontFamily: theme.family.displayBold,
                    color: INK,
                  }}
                >
                  {selectionTitle(selection, subjectName)}
                </Text>
                <View
                  style={{
                    borderRadius: 7,
                    backgroundColor: '#ffffffcc',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: theme.family.displayBold,
                      color: theme.color.primary,
                    }}
                  >
                    {selection.level.name}
                  </Text>
                </View>
              </View>

              {/* --------------------------------------------- section rail */}
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#eeebf8', paddingBottom: 12 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 12 }}
                  contentContainerStyle={{ gap: 16, paddingHorizontal: r.gutter }}
                >
                  {sections.map((sec) => {
                    const on = sec.subjectId === active;
                    return (
                      <Pressable
                        key={sec.subjectId}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        onPress={() => setActive(sec.subjectId)}
                        style={{ width: 74, alignItems: 'center', gap: 6 }}
                      >
                        <View
                          style={{
                            height: 46,
                            width: 46,
                            borderRadius: 23,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: `${sec.color}1a`,
                          }}
                        >
                          {/* The drawing comes from the subject id, not from
                              `sec.icon`: that column holds an emoji, which
                              cannot take the subject's colour and renders as a
                              different picture on every platform. */}
                          <Icon name={subjectIcon(sec.subjectId)} size={22} color={sec.color} />
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
              </View>

              {/* ------------------------------------------------- chapters */}
              <View
                style={{
                  width: '100%',
                  maxWidth: r.maxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: r.gutter,
                  paddingTop: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                    <View
                      style={{
                        height: 30,
                        width: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.color.primaryLight,
                      }}
                    >
                      <Icon name="book" size={18} color={theme.color.primary} />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 17,
                        fontFamily: theme.family.displayBold,
                        color: INK,
                      }}
                    >
                      {chosen ? `${chosen.shortName} — ` : ''}
                      {hi ? 'अध्याय' : 'Chapters'}
                      {parts.length > 0 ? ` (${parts.length})` : ''}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSort((v) => (v === 'syllabus' ? 'questions' : 'syllabus'))}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 40,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.color.border,
                      backgroundColor: theme.color.surface,
                      paddingHorizontal: 11,
                    }}
                  >
                    <Icon name="chart" size={15} color={theme.color.primary} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: theme.family.displayBold,
                        color: theme.color.primary,
                      }}
                    >
                      {sort === 'syllabus'
                        ? hi
                          ? 'क्रम'
                          : 'Syllabus'
                        : hi
                          ? 'प्रश्न'
                          : 'Questions'}
                    </Text>
                  </Pressable>
                </View>

                {topics.length === 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <EmptyNote>
                      {hi
                        ? 'इस अनुभाग के अध्याय अभी नहीं जोड़े गए।'
                        : 'Chapters for this section have not been added yet.'}
                    </EmptyNote>
                  </View>
                ) : (
                  <>
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {shown.map((topic, i) => {
                        const n = counts[topic.id] ?? 0;
                        return (
                          <Pressable
                            key={topic.id}
                            accessibilityRole="link"
                            onPress={() => router.push(`/practice/topic/${topic.id}`)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              borderRadius: 16,
                              backgroundColor: '#fff',
                              padding: 14,
                            }}
                          >
                            <View
                              style={{
                                height: 40,
                                width: 40,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: `${chosen?.color ?? VIOLET}1a`,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 15,
                                  fontFamily: theme.family.displayBold,
                                  color: chosen?.color ?? VIOLET,
                                }}
                              >
                                {i + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text
                                style={{
                                  fontSize: 14.5,
                                  lineHeight: 19,
                                  fontFamily: theme.family.displayBold,
                                  color: INK,
                                }}
                              >
                                {t(topic.name, lang)}
                              </Text>
                              {/* Questions in the bank, not a page count — see
                                  the note at the head of this file. */}
                              <Text
                                style={{
                                  marginTop: 2,
                                  fontSize: 12,
                                  fontFamily: theme.family.body,
                                  color: MUTED,
                                }}
                              >
                                {hi ? `${n} प्रश्न` : `${n} question${n === 1 ? '' : 's'}`}
                              </Text>
                            </View>
                            <Text style={{ color: '#c4bfda', fontSize: 18 }}>›</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {topics.length > 12 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setAll((v) => !v)}
                        style={{
                          marginTop: 12,
                          borderRadius: 16,
                          backgroundColor: '#f1eefc',
                          paddingVertical: 14,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: theme.family.displayBold,
                            color: VIOLET,
                          }}
                        >
                          {all
                            ? hi
                              ? 'कम दिखाएँ'
                              : 'Show fewer'
                            : hi
                              ? `सभी अध्याय देखें (${topics.length})`
                              : `View All Chapters (${topics.length})`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </PrepShell>
  );
}
