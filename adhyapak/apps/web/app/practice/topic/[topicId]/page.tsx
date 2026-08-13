'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { buildPracticeSet, getSubject, getTopic, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function TopicPracticePage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = use(params);
  const { lang } = useStore();
  const topic = getTopic(topicId);
  if (!topic) notFound();
  const subject = getSubject(topic.subjectId);

  return (
    <PracticeRunner
      questions={buildPracticeSet({ topicId })}
      title={t(topic.name, lang)}
      subtitle={subject ? `${subject.icon} ${t(subject.name, lang)}` : undefined}
      backHref={`/practice/subject/${topic.subjectId}`}
    />
  );
}
