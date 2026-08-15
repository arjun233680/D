import { useLocalSearchParams } from 'expo-router';
import { buildPracticeSet, getSubject, t } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeSession } from '@/components/PracticeSession';

export default function SubjectPracticeScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  const { lang } = useStore();
  const subject = getSubject(String(subjectId));

  return (
    <PracticeSession
      questions={buildPracticeSet({ subjectId: String(subjectId) })}
      title={subject ? t(subject.name, lang) : 'Practice'}
    />
  );
}
