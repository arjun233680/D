'use client';

import Link from 'next/link';
import {
  QUESTIONS,
  SUBJECTS,
  currentStreak,
  formatCount,
  getExam,
  getPaper,
  previousYearQuestions,
  recommendedTopics,
  t,
  UI,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, ProgressBar, SectionHeader, Stat } from '@/components/ui';

export default function PracticeHubPage() {
  const { lang, user } = useStore();
  const exam = getExam(user.goalExamId);
  const paper = user.targetPaperId ? getPaper(user.targetPaperId)?.paper : exam?.papers[0];
  const paperSubjects = paper ? paper.sections.map((s) => s.subjectId) : SUBJECTS.map((s) => s.id);
  const recommended = recommendedTopics(paperSubjects, 8);
  const streak = currentStreak(user.activeDates);
  const pyqCount = previousYearQuestions().length;

  return (
    <div className="space-y-7 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <div>
        <h1 className="text-2xl font-extrabold">{t(UI.practice, lang)}</h1>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          {lang === 'hi'
            ? 'उत्तर देते ही व्याख्या — यही अभ्यास का सही तरीका है।'
            : 'Answer, see the explanation immediately, move on.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={lang === 'hi' ? 'दिन की श्रृंखला' : 'Day streak'} value={`🔥 ${streak}`} tone="brand" />
        <Stat
          label={lang === 'hi' ? 'बुकमार्क' : 'Bookmarked'}
          value={String(user.bookmarkedQuestionIds.length)}
          tone="accent"
        />
        <Stat
          label={lang === 'hi' ? 'कुल प्रश्न' : 'Questions'}
          value={formatCount(QUESTIONS.length)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/practice/pyq"
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-info-light)] text-xl">
            📜
          </span>
          <div>
            <p className="text-[14px] font-bold">
              {lang === 'hi' ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {pyqCount} {lang === 'hi' ? 'प्रश्न' : 'questions'}
            </p>
          </div>
        </Link>

        <Link
          href="/practice/bookmarks"
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-warning-light)] text-xl">
            🔖
          </span>
          <div>
            <p className="text-[14px] font-bold">
              {lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
            </p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {user.bookmarkedQuestionIds.length} {lang === 'hi' ? 'सहेजे गए' : 'saved'}
            </p>
          </div>
        </Link>

        <Link
          href="/tests/test-daily-quiz"
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-brand-light)] text-xl">
            ⚡
          </span>
          <div>
            <p className="text-[14px] font-bold">{lang === 'hi' ? 'आज की क्विज़' : "Today's quiz"}</p>
            <p className="text-[11px] text-[var(--color-muted)]">
              {lang === 'hi' ? '10 प्रश्न · 10 मिनट' : '10 questions · 10 min'}
            </p>
          </div>
        </Link>
      </div>

      <section>
        <SectionHeader
          title={lang === 'hi' ? 'आपके पेपर के अनुसार सुझाव' : 'Recommended for your paper'}
          subtitle={paper ? t(paper.name, lang) : undefined}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {recommended.map((topic) => (
            <Link
              key={topic.id}
              href={`/practice/topic/${topic.id}`}
              className="card flex items-center gap-3 p-3 transition-shadow hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold">{t(topic.name, lang)}</p>
                <div className="mt-1.5">
                  <ProgressBar value={topic.weightage * 3} />
                </div>
                <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                  {lang === 'hi' ? 'भार' : 'Weightage'} {topic.weightage}% ·{' '}
                  {formatCount(topic.questionCount)} {lang === 'hi' ? 'प्रश्न' : 'Qs'}
                </p>
              </div>
              {topic.weightage >= 15 ? (
                <Badge tone="danger">{lang === 'hi' ? 'अति महत्वपूर्ण' : 'High yield'}</Badge>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={lang === 'hi' ? 'सभी विषय' : 'All subjects'} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((s) => {
            const available = QUESTIONS.filter((q) => q.subjectId === s.id).length;
            return (
              <Link
                key={s.id}
                href={`/practice/subject/${s.id}`}
                className="card flex gap-3 p-4 transition-shadow hover:shadow-md"
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
                  style={{ background: `${s.color}1a` }}
                >
                  {s.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold">{t(s.name, lang)}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    {s.topics.length} {lang === 'hi' ? 'टॉपिक' : 'topics'} · {available}{' '}
                    {lang === 'hi' ? 'प्रश्न उपलब्ध' : 'questions ready'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
