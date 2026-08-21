'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { getSubject, getTopic, listQuestions, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeSession } from '@/components/PracticeSession';
import { AsyncSection } from '@/components/ui';

export default function TopicPracticePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = use(params);
  const { lang } = useStore();

  // Topics themselves are structure, not content: they come from the taxonomy
  // and are needed to render a title before any question arrives.
  const topic = getTopic(topicId);
  if (!topic) notFound();
  const subject = getSubject(topic.subjectId);

  // Questions come through the repository, so this screen shows imported
  // database content and bundled content identically — and never a draft.
  const state = useAsync(() => listQuestions({ topicId }), [topicId]);

  return (
    <AsyncSection
      state={state}
      lang={lang}
      empty={{
        icon: '✍️',
        title: lang === 'hi' ? 'अभी प्रश्न नहीं' : 'No questions yet',
        body:
          lang === 'hi'
            ? `${t(topic.name, lang)} के लिए अभी कोई प्रश्न प्रकाशित नहीं हुआ है।`
            : `No questions have been published for ${t(topic.name, 'en')} yet.`,
      }}
    >
      {(questions) => (
        <PracticeSession
          questions={questions}
          title={t(topic.name, lang)}
          backHref={`/practice/subject/${topic.subjectId}`}
        />
      )}
    </AsyncSection>
  );
}
