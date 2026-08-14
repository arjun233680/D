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
  t,
  testQuestionIds,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, EmptyState, ProgressBar, Stat } from '@/components/ui';

type Tab = 'summary' | 'sections' | 'solutions';

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, results, attempts, user, toggleBookmark } = useStore();
  const [tab, setTab] = useState<Tab>('summary');
  const [onlyWrong, setOnlyWrong] = useState(true);

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
      const selectedIndex = attempt?.answers[qid]?.selectedIndex ?? null;
      return {
        question,
        selectedIndex,
        correct: selectedIndex === question.correctIndex,
        timeSpentMs: attempt?.answers[qid]?.timeSpentMs ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const visibleRows = onlyWrong ? rows.filter((r) => !r.correct) : rows;

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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t(UI.rank, lang)} value={`#${formatCount(result.rank)}`} tone="accent" />
        <Stat label={t(UI.percentile, lang)} value={String(result.percentile)} tone="brand" />
        <Stat label={t(UI.accuracy, lang)} value={`${result.accuracy}%`} />
        <Stat
          label={lang === 'hi' ? 'कुल समय' : 'Time taken'}
          value={formatClock(result.totalTimeMs)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t(UI.correct, lang)} value={String(result.correct)} tone="success" />
        <Stat label={t(UI.incorrect, lang)} value={String(result.incorrect)} tone="danger" />
        <Stat label={t(UI.skipped, lang)} value={String(result.skipped)} />
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
                    ⏭ {t(UI.skipped, lang)}: <b>{s.skipped}</b>
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
          <label className="flex items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              checked={onlyWrong}
              onChange={(e) => setOnlyWrong(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            {lang === 'hi' ? 'केवल गलत/छोड़े गए प्रश्न' : 'Only incorrect & skipped'}
          </label>

          {visibleRows.length ? (
            visibleRows.map((row, i) => {
              const bookmarked = user.bookmarkedQuestionIds.includes(row.question.id);
              return (
                <article key={row.question.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-extrabold">Q{i + 1}</span>
                    <Badge tone={row.correct ? 'success' : row.selectedIndex === null ? 'neutral' : 'danger'}>
                      {row.correct
                        ? t(UI.correct, lang)
                        : row.selectedIndex === null
                          ? t(UI.skipped, lang)
                          : t(UI.incorrect, lang)}
                    </Badge>
                    {row.question.previousYear ? (
                      <Badge tone="info">{row.question.previousYear}</Badge>
                    ) : null}
                    <div className="flex-1" />
                    <button type="button" onClick={() => toggleBookmark(row.question.id)}>
                      {bookmarked ? '🔖' : '📑'}
                    </button>
                  </div>

                  <p className="mt-2 text-[14px] leading-relaxed font-semibold">
                    {t(row.question.text, lang)}
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {row.question.options.map((opt, oi) => {
                      const isCorrect = oi === row.question.correctIndex;
                      const isChosen = oi === row.selectedIndex;
                      return (
                        <li
                          key={oi}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] ${
                            isCorrect
                              ? 'border-[var(--color-success)] bg-[var(--color-success-light)]'
                              : isChosen
                                ? 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
                                : 'border-[var(--color-line)]'
                          }`}
                        >
                          <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                          <span className="flex-1">{t(opt, lang)}</span>
                          {isCorrect ? <span>✅</span> : isChosen ? <span>❌</span> : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 rounded-xl bg-[var(--color-surface-alt)] p-3">
                    <p className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
                      {t(UI.explanation, lang)}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed">
                      {t(row.question.explanation, lang)}
                    </p>
                  </div>

                  <p className="mt-2 text-[11px] text-[var(--color-faint)]">
                    {lang === 'hi' ? 'आपका समय' : 'Your time'}: {Math.round(row.timeSpentMs / 1000)}s ·{' '}
                    {lang === 'hi' ? 'औसत' : 'avg'} {row.question.avgTimeSeconds}s ·{' '}
                    {Math.round(row.question.accuracy * 100)}%{' '}
                    {lang === 'hi' ? 'ने सही किया' : 'got it right'}
                  </p>
                </article>
              );
            })
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
