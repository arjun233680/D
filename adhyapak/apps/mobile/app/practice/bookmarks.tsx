import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function BookmarksScreen() {
  const { lang, user } = useStore();

  return (
    <PracticeRunner
      questions={buildPracticeSet({ ids: user.bookmarkedQuestionIds })}
      title={lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
      subtitle={lang === 'hi' ? 'आपके सहेजे प्रश्न' : 'The questions you saved'}
    />
  );
}
