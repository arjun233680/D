'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatClock,
  formatCount,
  getQuestion,
  getSubject,
  getTest,
  getTopic,
  matchesSolutionFilter,
  solutionFilterOptions,
  solutionOutcome,
  t,
  testQuestionIds,
  UI,
  type SolutionFilter,
} from '@adhyapak/core';
import { isCorrectAnswer, OPTION_LABELS, inLang } from '@adhyapak/core';
import type { OptionLabel } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, ProgressBar, Stat } from '@/components/ui';
import { QuestionSolution } from '@/components/QuestionSolution';
import { SolutionFilterChips } from '@/components/SolutionFilterChips';

type Tab = 'summary' | 'sections' | 'solutions';

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, results, attempts, user, toggleBookmark } = useStore();
  const [tab, setTab] = useState<Tab>('summary');
  // The whole set, in order, is what a learner opens the solutions for: they
  // want to walk the paper. Narrowing to one outcome is one click away, and is
  // a second pass rather than the first thing they are shown.
  const [filter, setFilter] = useState<SolutionFilter>('all');

  const test = getTest(id);
  if (!test) notFound();

  const result = results[test.id];
  const attempt = attempts[test.id];

  if (!result) {
    return (
      <div className="px-4 pt-6 sm:px-0">
        <EmptyState
          icon="📊"
          title={lang === 'hi' ? 'अभी कोई परिणाम नहीं' : 'No result yet'}
          body={
            lang === 'hi'
              ? 'यह टेस्ट पूरा करने पर आपका स्कोर, रैंक और विश्लेषण यहाँ दिखेगा।'
              : 'Finish this test and your score, rank and analysis will appear here.'
          }
        />
        <Link
          href={`/tests/${test.id}`}
          className="mt-4 block rounded-xl bg-[var(--color-brand)] px-4 py-3 text-center text-[14px] font-bold text-white"
        >
          {t(UI.startTest, lang)}
        </Link>
      </div>
    );
  }

  const rows = testQuestionIds(test)
    .map((qid) => {
      const question = getQuestion(qid);
      if (!question) return null;
      const selectedOption = attempt?.answers[qid]?.selectedOption ?? null;
      return {
        question,
        selectedOption,
        correct: isCorrectAnswer(selectedOption, question),
        timeSpentMs: attempt?.answers[qid]?.timeSpentMs ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  // Numbered by position in the paper, not position in the filtered list: under
  // "Incorrect" the third wrong answer is still Q17, and renumbering it Q3
  // would send a learner to the wrong question when they go back to it.
  const numbered = rows.map((row, i) => ({
    ...row,
    number: i + 1,
    outcome: solutionOutcome(row.selectedOption, row.question),
  }));
  const filterOptions = solutionFilterOptions(numbered.map((r) => r.outcome));
  const visibleRows = numbered.filter((r) => matchesSolutionFilter(r.outcome, filter));

  const tabs: { id: Tab; label: { en: string; hi: string } }[] = [
    { id: 'summary', label: { en: 'Summary', hi: 'सारांश' } },
    { id: 'sections', label: { en: 'Section analysis', hi: 'खंड विश्लेषण' } },
    { id: 'solutions', label: { en: 'Solutions', hi: 'हल' } },
  ];

  return (
    <div className="space-y-5 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      {/* Score header */}
      <div
        className="rounded-2xl px-5 py-6 text-white"
        style={{
          background: result.qualified
            ? 'linear-gradient(135deg, #0F9D58 0%, #0B1120 175%)'
            : 'linear-gradient(135deg, #DC2626 0%, #0B1120 175%)',
        }}
      >
        <p className="text-[13px] text-white/75">{t(test.title, lang)}</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[42px] leading-none font-black tabular-nums">{result.score}</span>
          <span className="pb-1 text-[16px] font-bold text-white/70">/ {result.maxScore}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-[12px] font-bold ${
              result.qualified ? 'bg-white text-[var(--color-brand-dark)]' : 'bg-white/20 text-white'
            }`}
          >
            {result.qualified ? t(UI.qualified, lang) : t(UI.notQualified, lang)} ·{' '}
            {lang === 'hi' ? 'कट-ऑफ' : 'cut-off'} {result.cutoff}%
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-bold">
            {result.percentage}%
          </span>
        </div>
      </div>

      {/* The rank and percentile only exist when the database graded this
          sitting. Sat offline or signed out there is no cohort, so the two
          tiles are dropped rather than filled with a simulation. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {result.rank !== undefined ? (
          <Stat label={t(UI.rank, lang)} value={`#${formatCount(result.rank)}`} tone="accent" />
        ) : null}
        {result.percentile !== undefined ? (
          <Stat label={t(UI.percentile, lang)} value={String(result.percentile)} tone="brand" />
        ) : null}
        <Stat label={t(UI.accuracy, lang)} value={`${result.accuracy}%`} />
        <Stat
          label={lang === 'hi' ? 'कुल समय' : 'Time taken'}
          value={formatClock(result.totalTimeMs)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t(UI.correct, lang)} value={String(result.correct)} tone="success" />
        <Stat label={t(UI.incorrect, lang)} value={String(result.incorrect)} tone="danger" />
        <Stat label={t(UI.unattempted, lang)} value={String(result.skipped)} />
      </div>

      <div className="rail flex gap-2">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
              tab === x.id
                ? 'border-transparent bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
            }`}
          >
            {t(x.label, lang)}
          </button>
        ))}
      </div>

      {tab === 'summary' ? (
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-[15px] font-bold">
              {lang === 'hi' ? 'आपके कमजोर टॉपिक' : 'Your weak topics'}
            </h2>
            {result.weakTopics.length ? (
              <ul className="mt-3 space-y-3">
                {result.weakTopics.map((tp) => {
                  const topic = getTopic(tp.topicId);
                  const subject = getSubject(tp.subjectId);
                  return (
                    <li key={tp.topicId}>
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="truncate font-semibold">
                          {subject?.icon} {topic ? t(topic.name, lang) : tp.topicId}
                        </span>
                        <span className="shrink-0 font-bold text-[var(--color-danger)] tabular-nums">
                          {tp.accuracy}%
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <ProgressBar value={tp.accuracy} color="var(--color-danger)" />
                      </div>
                      <Link
                        href={`/practice/topic/${tp.topicId}`}
                        className="mt-1.5 inline-block text-[11px] font-bold text-[var(--color-brand)]"
                      >
                        {lang === 'hi' ? 'इस टॉपिक का अभ्यास करें →' : 'Practise this topic →'}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                {lang === 'hi'
                  ? 'कोई कमजोर टॉपिक नहीं मिला — सभी टॉपिक 60% से ऊपर हैं।'
                  : 'No weak topics — everything you attempted is above 60%.'}
              </p>
            )}
          </div>

          {result.strongTopics.length ? (
            <div className="card p-4">
              <h2 className="text-[15px] font-bold">
                {lang === 'hi' ? 'आपकी मजबूत पकड़' : 'Your strong topics'}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.strongTopics.map((tp) => {
                  const topic = getTopic(tp.topicId);
                  return (
                    <Badge key={tp.topicId} tone="success">
                      {topic ? t(topic.name, lang) : tp.topicId} · {tp.accuracy}%
                    </Badge>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Nothing stands in for this panel when the numbers are missing.
              "Where you stand" with no cohort behind it was the sentence that
              made a simulated rank read as a real one. */}
          {result.rank !== undefined &&
          result.percentile !== undefined &&
          result.totalCandidates !== undefined ? (
            <div className="card p-4">
              <h2 className="text-[15px] font-bold">
                {lang === 'hi' ? 'कोहॉर्ट में आपकी स्थिति' : 'Where you stand'}
              </h2>
              <p className="mt-2 text-[13px] text-[var(--color-muted)]">
                {lang === 'hi'
                  ? `${formatCount(result.totalCandidates)} अभ्यर्थियों में आपकी रैंक #${formatCount(result.rank)} है, अर्थात् आप ${result.percentile} पर्सेंटाइल पर हैं।`
                  : `You are ranked #${formatCount(result.rank)} of ${formatCount(result.totalCandidates)} candidates, placing you at the ${result.percentile} percentile.`}
              </p>
              <div className="mt-3">
                <ProgressBar value={result.percentile} color="var(--color-accent)" />
              </div>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Link
              href={`/tests/${test.id}/attempt`}
              className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-3 text-center text-[13px] font-bold"
            >
              {t(UI.reattempt, lang)}
            </Link>
            <button
              type="button"
              onClick={() => setTab('solutions')}
              className="flex-1 rounded-xl bg-[var(--color-brand)] py-3 text-center text-[13px] font-bold text-white"
            >
              {t(UI.viewSolutions, lang)}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'sections' ? (
        <div className="card divide-y divide-[var(--color-line)]">
          {result.subjectScores.map((s) => {
            const subject = getSubject(s.subjectId);
            const pct = s.maxScore ? Math.round((s.score / s.maxScore) * 100) : 0;
            return (
              <div key={s.subjectId} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{subject?.icon}</span>
                  <span className="flex-1 text-[14px] font-bold">
                    {subject ? t(subject.name, lang) : s.subjectId}
                  </span>
                  <span className="text-[14px] font-extrabold tabular-nums">
                    {s.score}/{s.maxScore}
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={pct} color={subject?.color ?? 'var(--color-brand)'} />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--color-muted)]">
                  <span>
                    ✅ {t(UI.correct, lang)}: <b>{s.correct}</b>
                  </span>
                  <span>
                    ❌ {t(UI.incorrect, lang)}: <b>{s.incorrect}</b>
                  </span>
                  <span>
                    ⏭ {t(UI.unattempted, lang)}: <b>{s.skipped}</b>
                  </span>
                  <span>
                    🎯 {t(UI.accuracy, lang)}: <b>{s.accuracy}%</b>
                  </span>
                  <span>
                    ⏱ <b>{formatClock(s.timeSpentMs)}</b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'solutions' ? (
        <div className="space-y-3">
          <SolutionFilterChips
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            lang={lang}
          />

          {visibleRows.length ? (
            visibleRows.map((row) => (
              <QuestionSolution
                key={row.question.id}
                question={row.question}
                number={row.number}
                selectedOption={row.selectedOption}
                lang={lang}
                footer={
                  /* Only the learner's own time, which was actually measured.
                     The cohort average and "% got it right" beside it were seed
                     values. */
                  <p className="mt-2 text-[11px] text-[var(--color-faint)]">
                    {lang === 'hi' ? 'आपका समय' : 'Your time'}:{' '}
                    {Math.round(row.timeSpentMs / 1000)}s
                  </p>
                }
              />
            ))
          ) : (
            <EmptyState
              icon="🎉"
              title={lang === 'hi' ? 'सब सही!' : 'All correct!'}
              body={
                lang === 'hi'
                  ? 'इस टेस्ट में कोई गलत उत्तर नहीं। सभी प्रश्न देखने हेतु ऊपर का चेकबॉक्स हटाएँ।'
                  : 'No wrong answers in this test. Uncheck the box above to see every question.'
              }
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
