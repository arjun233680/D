import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getTopic, listQuestions, t, theme } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useAsync } from '@/lib/useAsync';
import { PracticeSession } from '@/components/PracticeSession';
import { AsyncSection, s } from '@/components/ui';

export default function TopicPracticeScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const { lang } = useStore();
  const id = String(topicId);

  // The topic is taxonomy and is available immediately; its questions come
  // through the repository, published only.
  const topic = getTopic(id);
  const state = useAsync(() => listQuestions({ topicId: id }), [id]);

  return (
    <View style={[s.screen, { padding: theme.space.lg }]}>
      <AsyncSection
        state={state}
        lang={lang}
        empty={{
          icon: '✍️',
          title: lang === 'hi' ? 'अभी प्रश्न नहीं' : 'No questions yet',
          body:
            lang === 'hi'
              ? 'इस टॉपिक के लिए अभी कोई प्रश्न प्रकाशित नहीं हुआ है।'
              : 'No questions have been published for this topic yet.',
        }}
      >
        {(questions) => (
          <PracticeSession
            questions={questions}
            title={topic ? t(topic.name, lang) : 'Practice'}
          />
        )}
      </AsyncSection>
    </View>
  );
}
