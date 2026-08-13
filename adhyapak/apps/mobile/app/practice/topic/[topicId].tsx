import { useLocalSearchParams } from 'expo-router';
import { buildPracticeSet, getSubject, getTopic, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function TopicPracticeScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { lang } = useStore();
  const topic = getTopic(String(topicId));
  const subject = topic ? getSubject(topic.subjectId) : undefined;

  return (
    <PracticeRunner
      questions={buildPracticeSet({ topicId: String(topicId) })}
      title={topic ? t(topic.name, lang) : 'Practice'}
      subtitle={subject ? `${subject.icon} ${t(subject.name, lang)}` : undefined}
    />
  );
}
