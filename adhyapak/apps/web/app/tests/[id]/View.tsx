'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatCount,
  getExam,
  getSubject,
  getTest,
  t,
  testQuestionCount,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { AccessBadge, Badge, Stat } from '@/components/ui';

export default function TestIntroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { lang, attempts, results } = useStore();
  const test = getTest(id);
  if (!test) notFound();

  const exam = getExam(test.examId);
  const saved = attempts[test.id];
  const inProgress = saved && !saved.submittedAt && saved.remainingMs > 0;
  const result = results[test.id];
  const count = testQuestionCount(test);

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href="/tests" className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {t(UI.tests, lang)}
      </Link>

      <header className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{exam?.shortName}</Badge>
          <AccessBadge access={test.access} lang={lang} />
          {test.negativeMarking > 0 ? (
            <Badge tone="danger">
              −{test.negativeMarking} {lang === 'hi' ? 'प्रति गलत उत्तर' : 'per wrong answer'}
            </Badge>
          ) : (
            <Badge tone="success">
              {lang === 'hi' ? 'कोई ऋणात्मक अंकन नहीं' : 'No negative marking'}
            </Badge>
          )}
        </div>
        <h1 className="mt-3 text-xl font-extrabold sm:text-2xl">{t(test.title, lang)}</h1>

        {/* Three facts about the paper, all of them checkable from it. The
            fourth used to be "Attempts", counted from a number in the bundle
            that no database had ever been asked for. */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={lang === 'hi' ? 'प्रश्न' : 'Questions'} value={String(count)} />
          <Stat label={lang === 'hi' ? 'अंक' : 'Marks'} value={String(count * test.marksPerQuestion)} />
          <Stat label={lang === 'hi' ? 'अवधि' : 'Duration'} value={`${test.durationMinutes}m`} />
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-[15px] font-bold">
          {lang === 'hi' ? 'खंड' : 'Sections'} ({test.sections.length})
        </h2>
        <ul className="mt-3 divide-y divide-[var(--color-line)]">
          {test.sections.map((s) => {
            const subject = getSubject(s.subjectId);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
                  style={{ background: `${subject?.color ?? '#4F46E5'}1a` }}
                >
                  {subject?.icon ?? '📘'}
                </span>
                <span className="flex-1 text-[13px] font-semibold">{t(s.name, lang)}</span>
                <span className="text-[12px] text-[var(--color-muted)] tabular-nums">
                  {s.questionIds.length} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-[15px] font-bold">
          {lang === 'hi' ? 'निर्देश' : 'Instructions'}
        </h2>
        <ol className="mt-3 space-y-2">
          {test.instructions.map((ins, i) => (
            <li key={ins.en} className="flex gap-2.5 text-[13px] leading-relaxed">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-surface-alt)] text-[11px] font-bold text-[var(--color-muted)]">
                {i + 1}
              </span>
              <span>{t(ins, lang)}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl bg-[var(--color-surface-alt)] p-3">
          <p className="text-[12px] font-bold text-[var(--color-muted)]">
            {lang === 'hi' ? 'प्रश्न पैलेट के रंग' : 'Question palette legend'}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold">
            {[
              { color: 'var(--color-success)', label: t(UI.answered, lang) },
              { color: 'var(--color-danger)', label: t(UI.notAnswered, lang) },
              { color: 'var(--color-line-strong)', label: t(UI.notVisited, lang) },
              { color: '#7C3AED', label: t(UI.marked, lang) },
            ].map((x) => (
              <span key={x.label} className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded" style={{ background: x.color }} />
                {x.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {result ? (
        <section className="card p-5">
          <h2 className="text-[15px] font-bold">
            {lang === 'hi' ? 'आपका पिछला परिणाम' : 'Your last result'}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label={t(UI.score, lang)}
              value={`${result.score}/${result.maxScore}`}
              tone={result.qualified ? 'success' : 'danger'}
            />
            <Stat label={t(UI.accuracy, lang)} value={`${result.accuracy}%`} />
            {result.rank !== undefined ? (
              <Stat label={t(UI.rank, lang)} value={`#${formatCount(result.rank)}`} tone="accent" />
            ) : null}
            {result.percentile !== undefined ? (
              <Stat label={t(UI.percentile, lang)} value={`${result.percentile}`} tone="brand" />
            ) : null}
          </div>
          <Link
            href={`/tests/${test.id}/result`}
            className="mt-3 block rounded-xl border border-[var(--color-line)] px-4 py-2.5 text-center text-[13px] font-bold"
          >
            {lang === 'hi' ? 'पूरा विश्लेषण देखें' : 'View full analysis'}
          </Link>
        </section>
      ) : null}

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <Link
          href={`/tests/${test.id}/attempt`}
          className="block rounded-xl bg-[var(--color-brand)] px-4 py-3.5 text-center text-[15px] font-bold text-white shadow-lg"
        >
          {inProgress ? t(UI.resumeTest, lang) : t(UI.startTest, lang)}
        </Link>
      </div>
    </div>
  );
}
