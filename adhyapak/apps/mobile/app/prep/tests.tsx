import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  listPrepSections,
  listTests,
  t,
  testMaxMarks,
  testQuestionCount,
  theme,
  type Lang,
  type PrepSection,
  type Test,
  type TestType,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Icon, subjectIcon, type IconName } from '@/components/icons';
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
 * Test Series for one selection.
 *
 * Every figure on a card is counted from the paper itself — questions from its
 * sections, marks from questions times marks-per-question, minutes from its own
 * duration. The design shows "150 Questions · 150 Marks · 2:30 Hrs" against
 * every row, which is what a full mock looks like; a fifteen-question sectional
 * says fifteen, because that is what sitting it involves.
 *
 * `attempts` is deliberately absent. `Test` carries a comment explaining why:
 * the bundle used to declare "184.6K attempts" for papers nobody had sat. It
 * comes back when it can be counted.
 *
 * Ported from apps/web/app/prep/tests/page.tsx.
 */

type Tab = 'all' | 'subject' | 'mine';

const TABS: { id: Tab; icon: IconName; label: { en: string; hi: string } }[] = [
  { id: 'all', icon: 'test', label: { en: 'All Tests', hi: 'सभी टेस्ट' } },
  { id: 'subject', icon: 'book', label: { en: 'Subject Wise', hi: 'विषय अनुसार' } },
  { id: 'mine', icon: 'bookmark', label: { en: 'My Tests', hi: 'मेरे टेस्ट' } },
];

const BADGE: Record<TestType, { en: string; hi: string; tint: string; color: string }> = {
  mock: { en: 'Full Syllabus', hi: 'पूर्ण पाठ्यक्रम', tint: '#e8f7ee', color: '#16a34a' },
  pyq: { en: 'PYQ', hi: 'विगत वर्ष', tint: '#f1eefc', color: '#6d4aed' },
  sectional: { en: 'Sectional', hi: 'अनुभागीय', tint: '#fff3e6', color: '#ea580c' },
  'daily-quiz': { en: 'Daily Quiz', hi: 'दैनिक क्विज़', tint: '#e6f0fd', color: '#2563eb' },
};

const hoursLabel = (minutes: number, hi: boolean): string => {
  if (minutes < 60) return hi ? `${minutes} मिनट` : `${minutes} Min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const clock = m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`;
  return hi ? `${clock} घंटे` : `${clock} Hrs`;
};

export default function TestSeriesScreen() {
  const { lang } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();
  const { selection, selections, loading } = useSelection();
  const askedFor = useLocalSearchParams<{ level?: string }>().level;

  const [tab, setTab] = useState<Tab>('all');
  const [tests, setTests] = useState<Test[] | null>(null);
  const [sections, setSections] = useState<PrepSection[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const examId = selection?.exam?.id;
  const level = selection?.level;
  const electiveId = selection?.subject?.subjectId;

  useEffect(() => {
    let live = true;
    if (!examId || !level) return;
    void (async () => {
      const [list, secs] = await Promise.all([
        listTests(examId),
        listPrepSections(examId, level, electiveId),
      ]);
      if (!live) return;
      setTests(list);
      setSections(secs);
      setActive((a) => a ?? secs[0]?.subjectId ?? null);
    })();
    return () => {
      live = false;
    };
  }, [examId, level, electiveId]);

  /*
   * Subject Wise filters to papers that actually examine the chosen section. A
   * test with no section for that subject is not "not yet attempted" — it is a
   * different paper, and listing it under the wrong heading is what makes a
   * filter untrustworthy.
   */
  const visible = useMemo(() => {
    if (!tests) return [];
    if (tab === 'subject' && active) {
      return tests.filter((x) => x.sections.some((sec) => sec.subjectId === active));
    }
    return tests;
  }, [tests, tab, active]);

  if (loading || !selection) {
    return <PrepLoading label={hi ? 'लाया जा रहा है…' : 'Loading…'} />;
  }

  const subjectName = selection.subject ? t(selection.subject.name, lang) : undefined;

  if (!askedFor && selections.length > 1) {
    return (
      <PrepShell lang={lang}>
        {(openMenu) => (
          <View style={{ flex: 1, backgroundColor: CANVAS }}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
                <PrepHeader
                  title={hi ? 'टेस्ट सीरीज़' : 'Test Series'}
                  subtitle={hi ? 'अधिक अभ्यास, बेहतर अंक' : 'Practice More, Score Higher'}
                  onMenu={openMenu}
                  back
                  lang={lang}
                />
                <SelectionPicker
                  title={hi ? 'टेस्ट देखने हेतु परीक्षा चुनें' : 'Select an Exam to View Tests'}
                  subtitle={
                    hi
                      ? 'टेस्ट केवल उन्हीं परीक्षाओं के दिखेंगे जो आपने चुनी हैं।'
                      : 'Tests will be shown only for the exams you selected.'
                  }
                  items={selections.map((sel) => ({
                    key: sel.level.id,
                    examShort: sel.exam?.shortName ?? '',
                    levelName: sel.level.name,
                    subjectName: sel.subject ? t(sel.subject.name, lang) : undefined,
                    icon: sel.subject?.icon ?? sel.level.icon,
                    color: sel.subject?.color ?? sel.level.color,
                  }))}
                  hrefFor={(key) => `/prep/tests?level=${key}`}
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
                title={hi ? 'टेस्ट सीरीज़' : 'Test Series'}
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
                      <Icon name={item.icon} size={16} color={on ? VIOLET : MUTED} />
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

              {/* ------------------------------------------- section rail */}
              {tab === 'subject' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 20 }}
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
              ) : null}

              {/* ------------------------------------------------------ list */}
              <View
                style={{
                  width: '100%',
                  maxWidth: r.maxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: r.gutter,
                  paddingTop: 20,
                }}
              >
                {tests === null ? null : tab === 'mine' ? (
                  <EmptyNote>
                    {hi
                      ? 'आपने अभी कोई टेस्ट नहीं दिया। जो टेस्ट आप देंगे वे यहाँ आ जाएँगे।'
                      : 'You have not sat a test yet. The ones you take will collect here.'}
                  </EmptyNote>
                ) : visible.length === 0 ? (
                  <EmptyNote>
                    {hi
                      ? 'इस चयन के लिए अभी कोई टेस्ट नहीं बना है।'
                      : 'No tests have been built for this selection yet.'}
                  </EmptyNote>
                ) : (
                  <View style={{ gap: 10 }}>
                    {visible.map((x) => (
                      <TestCard key={x.id} test={x} lang={lang} hi={hi} />
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </PrepShell>
  );
}

function TestCard({ test, lang, hi }: { test: Test; lang: Lang; hi: boolean }) {
  const badge = BADGE[test.type];
  const questions = testQuestionCount(test);
  const marks = testMaxMarks(test);

  return (
    <View style={{ borderRadius: 16, backgroundColor: '#fff', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
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
          <Icon name="calendar" size={19} color={theme.color.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
          >
            <Text style={{ fontSize: 15, fontFamily: theme.family.displayBold, color: INK }}>
              {t(test.title, lang)}
            </Text>
            <View
              style={{
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 2,
                backgroundColor: badge.tint,
              }}
            >
              <Text
                style={{ fontSize: 11, fontFamily: theme.family.displayBold, color: badge.color }}
              >
                {hi ? badge.hi : badge.en}
              </Text>
            </View>
          </View>
          {/* Counted from the paper, never declared: an empty section list reads
              as zero rather than as a number nobody measured. */}
          <Text
            style={{ marginTop: 4, fontSize: 12, fontFamily: theme.family.body, color: MUTED }}
          >
            {hi
              ? `${questions} प्रश्न · ${marks} अंक · ${hoursLabel(test.durationMinutes, true)}`
              : `${questions} Questions · ${marks} Marks · ${hoursLabel(test.durationMinutes, false)}`}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/test/${test.id}`)}
        style={{
          marginTop: 12,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: VIOLET,
        }}
      >
        <Text style={{ fontSize: 14, fontFamily: theme.family.displayBold, color: '#fff' }}>
          {hi ? 'टेस्ट शुरू करें' : 'Start Test'}
        </Text>
      </Pressable>
    </View>
  );
}
