import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function PyqScreen() {
  const { lang, user } = useStore();
  const scoped = buildPracticeSet({ pyqOnly: true, examId: user.goalExamId });
  const questions = scoped.length ? scoped : buildPracticeSet({ pyqOnly: true });

  return (
    <PracticeRunner
      questions={questions}
      title={lang === 'hi' ? 'विगत वर्ष प्रश्न' : 'Previous year questions'}
      subtitle={
        lang === 'hi' ? 'वास्तविक पेपरों से, टैग सहित' : 'Straight from real papers, tagged'
      }
    />
  );
}
