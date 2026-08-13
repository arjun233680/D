import { useLocalSearchParams } from 'expo-router';
import { buildPracticeSet, getSubject, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function SubjectPracticeScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const { lang } = useStore();
  const subject = getSubject(String(subjectId));

  return (
    <PracticeRunner
      questions={buildPracticeSet({ subjectId: String(subjectId) })}
      title={subject ? t(subject.name, lang) : 'Practice'}
      subtitle={subject ? t(subject.description, lang) : undefined}
    />
  );
}
