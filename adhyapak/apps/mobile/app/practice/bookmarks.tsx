import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeSession } from '@/components/PracticeSession';

export default function BookmarksScreen() {
  const { lang, user } = useStore();

  return (
    <PracticeSession
      questions={buildPracticeSet({ ids: user.bookmarkedQuestionIds })}
      title={lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
    />
  );
}
