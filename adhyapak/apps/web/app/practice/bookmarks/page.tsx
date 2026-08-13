'use client';

import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeRunner } from '@/components/PracticeRunner';

export default function BookmarksPracticePage() {
  const { lang, user } = useStore();

  return (
    <PracticeRunner
      questions={buildPracticeSet({ ids: user.bookmarkedQuestionIds })}
      title={lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
      subtitle={
        lang === 'hi' ? 'वे प्रश्न जिन्हें आपने सहेजा है' : 'The questions you saved for later'
      }
    />
  );
}
