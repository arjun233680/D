import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  EXAMS,
  SUBJECTS,
  getSubject,
  getTopic,
  listPyqYearCounts,
  listTopicFrequency,
  t,
  theme,
  type TopicFrequency,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { useResponsive } from '@/lib/responsive';
import { AsyncSection } from '@/components/ui';
import { CANVAS, INK, MUTED, VIOLET } from '@/components/prep';

/**
 * Previous-year analysis — the Performance tab.
 *
 * Every number on this screen is counted from questions that carry structured
 * PYQ metadata. Nothing is estimated, weighted or editorialised: a topic is
 * described as "18 questions in this dataset", never as "important". The
 * difference matters, because an aspirant plans months of study around it.
 *
 * A year with no questions is absent from the trend rather than drawn as zero.
 * Missing data means the paper has not been collected, and a zero would claim
 * the topic was not asked.
 *
 * Ported from apps/web/app/analytics/pyq/page.tsx, where two things exist that
 * a phone has no version of:
 *
 *   - Three `<select>` menus become three chip rails. A picker that covers the
 *     screen to choose between four exams is heavier than the choice deserves,
 *     and the rail shows the options rather than hiding them behind a tap.
 *   - The six-column frequency table becomes one card per topic. A 560px table
 *     on a 360px phone is a horizontal scroll nobody discovers, and the columns
 *     that matter — questions, years, band — fit a card comfortably.
 *
 * The counts, the sort order and the band arithmetic are unchanged.
 */
export default function PerformanceScreen() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';
  const r = useResponsive();

  const [examId, setExamId] = useState(user.goalExamId);
  const [subjectId, setSubjectId] = useState<string>('');
  const [topicId, setTopicId] = useState<string>('');

  const frequency = useAsync(() => listTopicFrequency(examId), [examId]);
  const trend = useAsync(
    () =>
      listPyqYearCounts({
        examId,
        subjectId: subjectId || undefined,
        topicId: topicId || undefined,
      }),
    [examId, subjectId, topicId],
  );

  const rows = useMemo(() => {
    const all = frequency.data ?? [];
    return subjectId ? all.filter((row) => row.subjectId === subjectId) : all;
  }, [frequency.data, subjectId]);

  // Thresholds come from the data, not from a guess about what "high" means.
  // The top third of the observed range is high, the bottom third low — and the
  // rule is stated on screen so the label can be checked rather than believed.
  const bands = useMemo(() => {
    const counts = rows.map((row) => row.questionCount);
    if (counts.length === 0) return null;
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const span = max - min;
    return { min, max, high: min + (span * 2) / 3, medium: min + span / 3 };
  }, [rows]);

  const bandOf = (count: number): 'high' | 'medium' | 'low' => {
    if (!bands || bands.max === bands.min) return 'medium';
    if (count >= bands.high) return 'high';
    if (count >= bands.medium) return 'medium';
    return 'low';
  };

  // Trend rows are per topic and year; collapse to one count per year.
  const byYear = useMemo(() => {
    const totals = new Map<number, number>();
    for (const row of trend.data ?? []) {
      totals.set(row.year, (totals.get(row.year) ?? 0) + row.questionCount);
    }
    return [...totals.entries()].sort((a, b) => a[0] - b[0]);
  }, [trend.data]);

  const peak = byYear.reduce((n, [, count]) => Math.max(n, count), 0);
  const totalQuestions = rows.reduce((n, row) => n + row.questionCount, 0);

  const gutter = r.gutter;

  return (
    <View style={{ flex: 1, backgroundColor: CANVAS }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View
            style={{
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
              paddingTop: 16,
            }}
          >
            <View style={{ paddingHorizontal: gutter }}>
              <Text style={{ fontSize: 24, fontFamily: theme.family.displayBold, color: INK }}>
                {hi ? 'विगत वर्ष विश्लेषण' : 'Previous-year analysis'}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: 19,
                  fontFamily: theme.family.body,
                  color: MUTED,
                }}
              >
                {hi
                  ? 'ये सभी संख्याएँ लाइब्रेरी में मौजूद वास्तविक पेपरों से गिनी गई हैं। कोई अनुमान नहीं।'
                  : 'Every number here is counted from real papers in the library. Nothing is estimated.'}
              </Text>
            </View>

            {/* ------------------------------------------------------ filters */}
            <ChipRail
              label={hi ? 'परीक्षा' : 'Exam'}
              value={examId}
              onChange={(v) => {
                setExamId(v);
                setTopicId('');
              }}
              options={EXAMS.map((e) => ({ value: e.id, label: e.shortName }))}
              gutter={gutter}
            />
            <ChipRail
              label={hi ? 'विषय' : 'Subject'}
              value={subjectId}
              onChange={(v) => {
                setSubjectId(v);
                setTopicId('');
              }}
              options={[
                { value: '', label: hi ? 'सभी विषय' : 'All subjects' },
                ...SUBJECTS.map((sub) => ({ value: sub.id, label: t(sub.name, lang) })),
              ]}
              gutter={gutter}
            />
            <ChipRail
              label={hi ? 'टॉपिक' : 'Topic'}
              value={topicId}
              onChange={setTopicId}
              options={[
                { value: '', label: hi ? 'सभी टॉपिक' : 'All topics' },
                ...(subjectId ? (getSubject(subjectId)?.topics ?? []) : []).map((tp) => ({
                  value: tp.id,
                  label: t(tp.name, lang),
                })),
              ]}
              gutter={gutter}
            />

            {/* -------------------------------------------- questions by year */}
            <View style={{ marginTop: 28, paddingHorizontal: gutter }}>
              <Text
                style={{
                  marginBottom: 12,
                  fontSize: 17,
                  fontFamily: theme.family.displayBold,
                  color: INK,
                }}
              >
                {hi ? 'वर्ष के अनुसार प्रश्न' : 'Questions by year'}
              </Text>
              <AsyncSection
                state={trend}
                lang={lang}
                empty={{
                  icon: '📊',
                  title: hi ? 'अभी कोई विगत वर्ष डेटा नहीं' : 'No previous-year data yet',
                  body: hi
                    ? 'जैसे ही वर्ष सहित प्रश्न आयात होंगे, यहाँ रुझान दिखेगा।'
                    : 'Import questions tagged with a year and the trend appears here.',
                }}
              >
                {() => (
                  <View
                    style={{
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#eceaf6',
                      backgroundColor: '#fff',
                      padding: 20,
                    }}
                  >
                    <View style={{ gap: 8 }}>
                      {byYear.map(([year, count]) => (
                        <View
                          key={year}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        >
                          <Text
                            style={{
                              width: 44,
                              fontSize: 13,
                              fontFamily: theme.family.displayBold,
                              fontVariant: ['tabular-nums'],
                              color: INK,
                            }}
                          >
                            {year}
                          </Text>
                          <View
                            style={{
                              flex: 1,
                              height: 16,
                              borderRadius: 4,
                              overflow: 'hidden',
                              backgroundColor: '#f7f9fc',
                            }}
                          >
                            <View
                              style={{
                                height: '100%',
                                borderRadius: 4,
                                backgroundColor: VIOLET,
                                width: `${peak ? (count / peak) * 100 : 0}%`,
                              }}
                            />
                          </View>
                          <Text
                            style={{
                              width: 74,
                              textAlign: 'right',
                              fontSize: 13,
                              fontFamily: theme.family.body,
                              fontVariant: ['tabular-nums'],
                              color: INK,
                            }}
                          >
                            {count} {hi ? 'प्रश्न' : count === 1 ? 'question' : 'questions'}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text
                      style={{
                        marginTop: 16,
                        fontSize: 12,
                        lineHeight: 16,
                        fontFamily: theme.family.body,
                        color: MUTED,
                      }}
                    >
                      {hi
                        ? 'जिन वर्षों का डेटा नहीं है वे सूची में नहीं हैं — इसका अर्थ है वह पेपर अभी जोड़ा नहीं गया, यह नहीं कि उस वर्ष प्रश्न नहीं आया।'
                        : 'Years with no data are absent from this list. That means the paper has not been added yet — not that the topic was not asked.'}
                    </Text>
                  </View>
                )}
              </AsyncSection>
            </View>

            {/* ------------------------------------------- topic frequency */}
            <View style={{ marginTop: 28, paddingHorizontal: gutter }}>
              <View
                style={{
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 17, fontFamily: theme.family.displayBold, color: INK }}>
                  {hi ? 'टॉपिक आवृत्ति' : 'Topic frequency'}
                </Text>
                {totalQuestions ? (
                  <Text style={{ fontSize: 12, fontFamily: theme.family.body, color: MUTED }}>
                    {totalQuestions}
                    {hi ? ' प्रश्न · ' : ' questions · '}
                    {rows.length} {hi ? 'टॉपिक' : 'topics'}
                  </Text>
                ) : null}
              </View>

              <AsyncSection
                state={{ ...frequency, data: rows }}
                lang={lang}
                empty={{
                  icon: '📚',
                  title: hi ? 'अभी कोई आवृत्ति डेटा नहीं' : 'No frequency data yet',
                  body: hi
                    ? 'यह तालिका उन्हीं प्रश्नों से बनती है जिनमें वर्ष एवं पेपर दर्ज है।'
                    : 'This table is built from questions that carry a year and a paper.',
                }}
              >
                {(list) => (
                  <View style={{ gap: 10 }}>
                    {[...list]
                      .sort((a, b) => b.questionCount - a.questionCount)
                      .map((row: TopicFrequency) => {
                        const topic = getTopic(row.topicId);
                        const band = bandOf(row.questionCount);
                        return (
                          <Pressable
                            key={row.topicId}
                            accessibilityRole="link"
                            onPress={() => router.push(`/practice/topic/${row.topicId}`)}
                            style={{
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: '#eceaf6',
                              backgroundColor: '#fff',
                              padding: 14,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 12,
                              }}
                            >
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: 14.5,
                                  lineHeight: 19,
                                  fontFamily: theme.family.bodySemi,
                                  color: INK,
                                }}
                              >
                                {topic ? t(topic.name, lang) : row.topicId}
                              </Text>
                              <BandPill band={band} hi={hi} />
                            </View>

                            {/* The table's five numeric columns, as labelled
                                pairs — the only shape that survives 360px. */}
                            <View
                              style={{
                                marginTop: 10,
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 16,
                              }}
                            >
                              <Metric
                                label={hi ? 'प्रश्न' : 'Questions'}
                                value={row.questionCount}
                              />
                              <Metric label={hi ? 'वर्ष' : 'Years'} value={row.yearsSeen} />
                              <Metric label={hi ? 'पहला' : 'First'} value={row.firstSeen} />
                              <Metric label={hi ? 'नवीनतम' : 'Latest'} value={row.lastSeen} />
                            </View>
                          </Pressable>
                        );
                      })}

                    {bands ? (
                      <Text
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          lineHeight: 16,
                          fontFamily: theme.family.body,
                          color: MUTED,
                        }}
                      >
                        {hi
                          ? `आवृत्ति इसी चयन से निकाली गई है: ${bands.min}–${bands.max} प्रश्न। ऊपरी एक-तिहाई "उच्च", निचली एक-तिहाई "निम्न"।`
                          : `Bands are derived from this selection, which ranges ${bands.min}–${bands.max} questions: the top third is High, the bottom third Low.`}
                      </Text>
                    ) : null}
                  </View>
                )}
              </AsyncSection>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* --------------------------------------------------------------- fragments */

/**
 * One filter, as a rail of chips.
 *
 * The rail is deliberately allowed to bleed to both screen edges — a filter
 * that stops at the gutter looks like it has run out of options.
 */
function ChipRail({
  label,
  value,
  onChange,
  options,
  gutter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  gutter: number;
}) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text
        style={{
          marginBottom: 8,
          paddingHorizontal: gutter,
          fontSize: 12,
          fontFamily: theme.family.displayBold,
          color: MUTED,
        }}
      >
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: gutter }}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value || 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={{
                minHeight: 40,
                justifyContent: 'center',
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderColor: on ? 'transparent' : '#eceaf6',
                backgroundColor: on ? VIOLET : '#fff',
              }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontFamily: theme.family.bodyMedium,
                  color: on ? '#fff' : MUTED,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          letterSpacing: 0.4,
          fontFamily: theme.family.bodySemi,
          color: MUTED,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontFamily: theme.family.displayBold,
          fontVariant: ['tabular-nums'],
          color: INK,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** Word first, colour second — the band has to read on a greyscale screen. */
function BandPill({ band, hi }: { band: 'high' | 'medium' | 'low'; hi: boolean }) {
  const look =
    band === 'high'
      ? { bg: '#f1eefc', fg: '#5b3ce0' }
      : band === 'medium'
        ? { bg: '#eef0fe', fg: '#4f46e5' }
        : { bg: '#f7f9fc', fg: MUTED };
  const label =
    band === 'high'
      ? hi
        ? 'उच्च'
        : 'High'
      : band === 'medium'
        ? hi
          ? 'मध्यम'
          : 'Medium'
        : hi
          ? 'निम्न'
          : 'Low';
  return (
    <View
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: look.bg,
      }}
    >
      <Text style={{ fontSize: 12, fontFamily: theme.family.displayBold, color: look.fg }}>
        {label}
      </Text>
    </View>
  );
}
