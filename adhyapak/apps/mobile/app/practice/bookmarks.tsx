import { buildPracticeSet } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { PracticeSession } from '@/components/PracticeSession';

export default function BookmarksScreen() {
  const { lang, user } = useStore();

  return (
    <PracticeSession
      questions={buildPracticeSet({ ids: user.bookmarkedQuestionIds })}
      title={lang === 'hi' ? 'बुकमार्क किए प्रश्न' : 'Bookmarked questions'}
      empty={
        lang === 'hi'
          ? {
              title: 'अभी कोई बुकमार्क नहीं',
              body: 'किसी भी प्रश्न पर 🔖 दबाइए — वह यहाँ जुड़ जाएगा, और आप उन्हें एक साथ दोबारा हल कर सकेंगे।',
            }
          : {
              title: 'No bookmarks yet',
              body: 'Tap 🔖 on any question and it lands here, ready to be practised as a set.',
            }
      }
    />
  );
}
