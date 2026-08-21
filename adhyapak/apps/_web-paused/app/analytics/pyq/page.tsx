'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  EXAMS,
  SUBJECTS,
  getSubject,
  getTopic,
  listPyqYearCounts,
  listTopicFrequency,
  t,
  type TopicFrequency,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { AsyncSection } from '@/components/ui';

/**
 * Previous-year analysis.
 *
 * Every number on this screen is counted from questions that carry structured
 * PYQ metadata. Nothing is estimated, weighted or editorialised: a topic is
 * described as "18 questions in this dataset", never as "important". The
 * difference matters, because an aspirant plans months of study around it.
 *
 * A year with no questions is absent from the trend rather than drawn as zero.
 * Missing data means the paper has not been collected, and a zero would claim
 * the topic was not asked.
 */
export default function PyqAnalyticsPage() {
  const { lang, user } = useStore();
  const hi = lang === 'hi';

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
    return subjectId ? all.filter((r) => r.subjectId === subjectId) : all;
  }, [frequency.data, subjectId]);

  // Thresholds come from the data, not from a guess about what "high" means.
  // The top third of the observed range is high, the bottom third low — and the
  // rule is stated on screen so the label can be checked rather than believed.
  const bands = useMemo(() => {
    const counts = rows.map((r) => r.questionCount);
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
  const totalQuestions = rows.reduce((n, r) => n + r.questionCount, 0);

  return (
    <div className="space-y-6 px-4 pt-4 pb-10 sm:px-0 sm:pt-6">
      <header>
        <h1 className="text-2xl font-extrabold">
          {hi ? 'विगत वर्ष विश्लेषण' : 'Previous-year analysis'}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {hi
            ? 'ये सभी संख्याएँ लाइब्रेरी में मौजूद वास्तविक पेपरों से गिनी गई हैं। कोई अनुमान नहीं।'
            : 'Every number here is counted from real papers in the library. Nothing is estimated.'}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Picker
          label={hi ? 'परीक्षा' : 'Exam'}
          value={examId}
          onChange={(v) => {
            setExamId(v);
            setTopicId('');
          }}
          options={EXAMS.map((e) => ({ value: e.id, label: e.shortName }))}
        />
        <Picker
          label={hi ? 'विषय' : 'Subject'}
          value={subjectId}
          onChange={(v) => {
            setSubjectId(v);
            setTopicId('');
          }}
          options={[
            { value: '', label: hi ? 'सभी विषय' : 'All subjects' },
            ...SUBJECTS.map((s) => ({ value: s.id, label: t(s.name, lang) })),
          ]}
        />
        <Picker
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
        />
      </div>

      <section>
        <h2 className="mb-3 text-[17px] font-bold">
          {hi ? 'वर्ष के अनुसार प्रश्न' : 'Questions by year'}
        </h2>
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
            <div className="card p-5">
              <ul className="space-y-2">
                {byYear.map(([year, count]) => (
                  <li key={year} className="flex items-center gap-3 text-[13px]">
                    <span className="w-12 shrink-0 font-bold tabular-nums">{year}</span>
                    <span className="h-4 flex-1 overflow-hidden rounded bg-[var(--color-surface-alt)]">
                      <span
                        className="block h-full rounded bg-[var(--color-brand)]"
                        style={{ width: `${peak ? (count / peak) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums">
                      {count} {hi ? 'प्रश्न' : count === 1 ? 'question' : 'questions'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] text-[var(--color-muted)]">
                {hi
                  ? 'जिन वर्षों का डेटा नहीं है वे सूची में नहीं हैं — इसका अर्थ है वह पेपर अभी जोड़ा नहीं गया, यह नहीं कि उस वर्ष प्रश्न नहीं आया।'
                  : 'Years with no data are absent from this list. That means the paper has not been added yet — not that the topic was not asked.'}
              </p>
            </div>
          )}
        </AsyncSection>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-bold">{hi ? 'टॉपिक आवृत्ति' : 'Topic frequency'}</h2>
          {totalQuestions ? (
            <span className="text-[12px] text-[var(--color-muted)]">
              {totalQuestions} {hi ? 'प्रश्न · ' : 'questions · '}
              {rows.length} {hi ? 'टॉपिक' : 'topics'}
            </span>
          ) : null}
        </div>

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
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead className="bg-[var(--color-surface-alt)] text-left text-[11px] font-bold uppercase text-[var(--color-muted)]">
                  <tr>
                    <th className="px-4 py-2">{hi ? 'टॉपिक' : 'Topic'}</th>
                    <th className="px-4 py-2">{hi ? 'प्रश्न' : 'Questions'}</th>
                    <th className="px-4 py-2">{hi ? 'वर्ष' : 'Years'}</th>
                    <th className="px-4 py-2">{hi ? 'पहला' : 'First'}</th>
                    <th className="px-4 py-2">{hi ? 'नवीनतम' : 'Latest'}</th>
                    <th className="px-4 py-2">{hi ? 'आवृत्ति' : 'Frequency'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...list]
                    .sort((a, b) => b.questionCount - a.questionCount)
                    .map((row: TopicFrequency) => {
                      const topic = getTopic(row.topicId);
                      const band = bandOf(row.questionCount);
                      return (
                        <tr key={row.topicId} className="border-t border-[var(--color-line)]">
                          <td className="px-4 py-2 font-semibold">
                            <Link
                              href={`/practice/topic/${row.topicId}`}
                              className="hover:underline"
                            >
                              {topic ? t(topic.name, lang) : row.topicId}
                            </Link>
                          </td>
                          <td className="px-4 py-2 tabular-nums">{row.questionCount}</td>
                          <td className="px-4 py-2 tabular-nums">{row.yearsSeen}</td>
                          <td className="px-4 py-2 tabular-nums">{row.firstSeen}</td>
                          <td className="px-4 py-2 tabular-nums">{row.lastSeen}</td>
                          <td className="px-4 py-2">
                            {/* Word first, colour second — the band has to read on a
                                greyscale screen. */}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                band === 'high'
                                  ? 'bg-[var(--color-brand-light)] text-[var(--color-brand-dark)]'
                                  : band === 'medium'
                                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                                    : 'bg-[var(--color-surface-alt)] text-[var(--color-muted)]'
                              }`}
                            >
                              {band === 'high'
                                ? hi
                                  ? 'उच्च'
                                  : 'High'
                                : band === 'medium'
                                  ? hi
                                    ? 'मध्यम'
                                    : 'Medium'
                                  : hi
                                    ? 'निम्न'
                                    : 'Low'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {bands ? (
                <p className="border-t border-[var(--color-line)] px-4 py-3 text-[11px] text-[var(--color-muted)]">
                  {hi
                    ? `आवृत्ति इसी चयन से निकाली गई है: ${bands.min}–${bands.max} प्रश्न। ऊपरी एक-तिहाई "उच्च", निचली एक-तिहाई "निम्न"।`
                    : `Bands are derived from this selection, which ranges ${bands.min}–${bands.max} questions: the top third is High, the bottom third Low.`}
                </p>
              ) : null}
            </div>
          )}
        </AsyncSection>
      </section>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold text-[var(--color-muted)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-[14px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
