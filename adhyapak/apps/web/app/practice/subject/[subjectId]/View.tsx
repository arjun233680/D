'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound, useSearchParams } from 'next/navigation';
import { formatCount, getSubject, listQuestions, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { AsyncSection, Badge, ProgressBar, SectionHeader } from '@/components/ui';
import { PracticeRunner } from '@/components/PracticeRunner';

/**
 * A subject page is a topic index plus a "practise everything" runner, so the
 * learner can either drill one topic or sweep the whole subject.
 */
export default function SubjectPracticePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  // Read on the client rather than as a server prop: the site is a static
  // export, so a page that awaits searchParams cannot be prerendered at all.
  const all = useSearchParams().get('all');
  const { lang } = useStore();
  const subject = getSubject(subjectId);
  if (!subject) notFound();

  // One call serves both modes: the runner when ?all is set, and the topic index
  // otherwise, which needs the same set to count questions per topic.
  const state = useAsync(() => listQuestions({ subjectId }), [subjectId]);
  const questions = state.data ?? [];

  if (all) {
    return (
      <AsyncSection
        state={state}
        lang={lang}
        empty={{
          icon: '✍️',
          title: lang === 'hi' ? 'अभी प्रश्न नहीं' : 'No questions yet',
          body:
            lang === 'hi'
              ? 'इस विषय के लिए अभी कोई प्रश्न प्रकाशित नहीं हुआ है।'
              : 'No questions have been published for this subject yet.',
        }}
      >
        {(list) => (
          <PracticeRunner
            questions={list}
            title={t(subject.name, lang)}
            subtitle={lang === 'hi' ? 'पूरा विषय अभ्यास' : 'Full subject practice'}
            backHref={`/practice/subject/${subject.id}`}
          />
        )}
      </AsyncSection>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-4 pb-8 sm:px-0 sm:pt-6">
      <Link href="/practice" className="text-[13px] font-semibold text-[var(--color-muted)]">
        ← {lang === 'hi' ? 'अभ्यास' : 'Practice'}
      </Link>

      <header className="card flex gap-4 p-5">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl"
          style={{ background: `${subject.color}1a` }}
        >
          {subject.icon}
        </span>
        <div>
          <h1 className="text-xl font-extrabold">{t(subject.name, lang)}</h1>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">{t(subject.description, lang)}</p>
        </div>
      </header>

      {questions.length ? (
        <Link
          href={`/practice/subject/${subject.id}?all=1`}
          className="block rounded-xl bg-[var(--color-brand)] px-4 py-3 text-center text-[14px] font-bold text-white"
        >
          {lang === 'hi'
            ? `पूरा विषय अभ्यास करें (${questions.length} प्रश्न)`
            : `Practise all ${questions.length} questions`}
        </Link>
      ) : null}

      <section>
        <SectionHeader
          title={lang === 'hi' ? 'टॉपिक' : 'Topics'}
          subtitle={
            lang === 'hi'
              ? 'भार के अनुसार क्रमबद्ध — ऊपर वाले पहले करें'
              : 'Ordered by exam weightage — start at the top'
          }
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {[...subject.topics]
            .sort((a, b) => (b.weightage ?? -1) - (a.weightage ?? -1))
            .map((topic) => {
              // The only count on this card, and it is real: the published
              // questions actually fetched for this subject, counted per topic
              // from the same set so the index never issues a request per topic.
              const ready = questions.filter((q) => q.topicId === topic.id).length;
              return (
                <Link
                  key={topic.id}
                  href={`/practice/topic/${topic.id}`}
                  className="card flex items-center gap-3 p-3 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{t(topic.name, lang)}</p>
                    {topic.weightage !== undefined ? (
                      <div className="mt-1.5">
                        <ProgressBar value={topic.weightage * 3} color={subject.color} />
                      </div>
                    ) : null}
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                      {topic.weightage !== undefined
                        ? `${lang === 'hi' ? 'भार' : 'Weightage'} ${topic.weightage}% · `
                        : ''}
                      {formatCount(ready)}{' '}
                      {lang === 'hi' ? 'प्रश्न उपलब्ध' : ready === 1 ? 'question' : 'questions'}
                    </p>
                  </div>
                  {(topic.weightage ?? 0) >= 15 ? (
                    <Badge tone="danger">{lang === 'hi' ? 'अति महत्वपूर्ण' : 'High yield'}</Badge>
                  ) : null}
                </Link>
              );
            })}
        </div>
      </section>
    </div>
  );
}
