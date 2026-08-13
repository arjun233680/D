'use client';

import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function PyqPracticePage() {
  const { lang, user } = useStore();
  // Previous-year questions for the learner's goal, falling back to the full set
  // so a newly picked goal is never an empty screen.
  const scoped = buildPracticeSet({ pyqOnly: true, examId: user.goalExamId });
  const questions = scoped.length ? scoped : buildPracticeSet({ pyqOnly: true });

  return (
    <PracticeRunner
      questions={questions}
      title={lang === 'hi' ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
      subtitle={
        lang === 'hi'
          ? 'वास्तविक पेपरों से, वर्ष एवं पेपर के टैग सहित'
          : 'Straight from real papers, tagged by year and paper'
      }
    />
  );
}
