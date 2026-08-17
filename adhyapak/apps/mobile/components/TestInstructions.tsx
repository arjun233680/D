import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { t, testBriefing, theme, type SolutionMode, type Test } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { s } from '@/components/ui';

/**
 * What a candidate reads before the clock starts.
 *
 * Deliberately the same content as the website's version, down to the figures,
 * because both read `testBriefing` off the test rather than stating a duration
 * of their own. This is the page somebody plans their afternoon around.
 *
 * It also carries the choice it exists for: a paper sat as a measurement, with
 * nothing revealed until submission, or sat as practice, with each answer
 * marked as it is chosen. `exam` is the default — somebody who wanted guidance
 * can sit the paper again, and somebody shown the key cannot un-see it.
 */
export function TestInstructions({
  test,
  onStart,
}: {
  test: Test;
  onStart: (mode: SolutionMode) => void;
}) {
  const { lang, setLang } = useStore();
  const hi = lang === 'hi';
  const brief = testBriefing(test);
  const [mode, setMode] = useState<SolutionMode>('exam');
  const [agreed, setAgreed] = useState(false);

  const rules = [
    hi
      ? `इस पेपर में ${brief.sections.length} खंड और कुल ${brief.questionCount} प्रश्न हैं।`
      : `This paper has ${brief.sections.length} sections and ${brief.questionCount} questions in all.`,
    hi
      ? 'हर प्रश्न के चार विकल्प हैं, जिनमें से केवल एक सही है।'
      : 'Every question has four options, of which only one is correct.',
    hi
      ? `पेपर ${brief.durationMinutes} मिनट में पूरा करना है। समय समाप्त होते ही यह स्वयं जमा हो जाएगा।`
      : `You have ${brief.durationMinutes} minutes. The paper submits itself when the time runs out.`,
    brief.negativeMarking > 0
      ? hi
        ? `हर सही उत्तर पर ${brief.marksPerQuestion} अंक, हर ग़लत उत्तर पर ${brief.negativeMarking} अंक की कटौती।`
        : `${brief.marksPerQuestion} mark for a correct answer, ${brief.negativeMarking} deducted for a wrong one.`
      : hi
        ? `हर सही उत्तर पर ${brief.marksPerQuestion} अंक। कोई ऋणात्मक अंकन नहीं।`
        : `${brief.marksPerQuestion} mark for a correct answer. There is no negative marking.`,
    hi
      ? 'बीच में छोड़ने पर पेपर वहीं सहेजा जाता है और आप उसी जगह से लौट सकते हैं।'
      : 'Leaving mid-paper saves it where you left off, and you can return to the same place.',
  ];

  const modes = [
    {
      id: 'exam' as const,
      icon: '🎯',
      title: hi ? 'असली परीक्षा जैसा' : 'Like the real exam',
      body: hi
        ? 'जमा करने तक न उत्तर दिखेगा, न व्याख्या। पूरा हल परिणाम के साथ मिलेगा।'
        : 'No answer and no explanation until you submit. The full solution comes with your result.',
    },
    {
      id: 'guided' as const,
      icon: '💡',
      title: hi ? 'समाधान के साथ' : 'With solutions',
      body: hi
        ? 'हर उत्तर चुनते ही सही/ग़लत और व्याख्या दिखेगी। अभ्यास के लिए।'
        : 'Each answer is marked as you choose it, with the explanation. For practice.',
    },
  ];

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: theme.space.lg, paddingBottom: 40 }}>
      <Text style={[s.h1, { textAlign: 'center' }]}>{t(test.title, lang)}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.space.xl, marginTop: 10 }}>
        <Text style={s.muted}>
          {hi ? 'अवधि' : 'Duration'}:{' '}
          <Text style={{ fontWeight: '700', color: theme.color.text }}>
            {brief.durationMinutes} {hi ? 'मिनट' : 'min'}
          </Text>
        </Text>
        <Text style={s.muted}>
          {hi ? 'पूर्णांक' : 'Max marks'}:{' '}
          <Text style={{ fontWeight: '700', color: theme.color.text }}>{brief.maxMarks}</Text>
        </Text>
      </View>

      <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.lg, gap: 10 }]}>
        {rules.map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={s.muted}>•</Text>
            <Text style={[s.muted, { flex: 1, lineHeight: 20 }]}>{r}</Text>
          </View>
        ))}
      </View>

      {brief.sections.length > 1 ? (
        <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.md, gap: 8 }]}>
          <Text style={[s.faint, { fontWeight: '700' }]}>{hi ? 'खंड' : 'Sections'}</Text>
          {brief.sections.map((sec) => (
            <View key={sec.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>
                {t(sec.name, lang)}
              </Text>
              <Text style={s.muted}>
                {sec.questionCount} {hi ? 'प्रश्न' : 'Qs'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.md, gap: 10 }]}>
        <Text style={[s.faint, { fontWeight: '700' }]}>
          {hi ? 'पेपर कैसे देना है' : 'How to sit this paper'}
        </Text>
        {modes.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => setMode(o.id)}
            style={{
              borderWidth: 1,
              borderColor: mode === o.id ? theme.color.primary : theme.color.border,
              backgroundColor: mode === o.id ? theme.color.primaryLight : theme.color.surface,
              borderRadius: theme.radius.md,
              padding: theme.space.lg,
            }}
          >
            <Text style={{ fontSize: 18 }}>{o.icon}</Text>
            <Text style={[s.title, { marginTop: 4 }]}>{o.title}</Text>
            <Text style={[s.muted, { marginTop: 3, lineHeight: 19 }]}>{o.body}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.card, { padding: theme.space.lg, marginTop: theme.space.md, gap: 8 }]}>
        <Text style={[s.faint, { fontWeight: '700' }]}>{hi ? 'पेपर की भाषा' : 'Paper language'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['hi', 'en'] as const).map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={{
                flex: 1,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: lang === l ? 'transparent' : theme.color.border,
                backgroundColor: lang === l ? theme.color.primary : theme.color.surface,
                borderRadius: theme.radius.md,
                paddingVertical: 11,
              }}
            >
              <Text style={{ fontWeight: '700', color: lang === l ? '#fff' : theme.color.textMuted }}>
                {l === 'hi' ? 'हिंदी' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => setAgreed((a) => !a)}
        style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: theme.space.lg }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: agreed ? theme.color.primary : theme.color.border,
            backgroundColor: agreed ? theme.color.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {agreed ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
        </View>
        <Text style={[s.muted, { flex: 1, lineHeight: 20 }]}>
          {hi
            ? 'मैंने सभी निर्देश ध्यान से पढ़ लिए हैं और समझ लिए हैं।'
            : 'I have read all the instructions carefully and understood them.'}
        </Text>
      </Pressable>

      <Pressable
        disabled={!agreed}
        onPress={() => onStart(mode)}
        style={{
          marginTop: theme.space.lg,
          backgroundColor: agreed ? theme.color.primary : theme.color.border,
          borderRadius: theme.radius.pill,
          paddingVertical: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: agreed ? '#fff' : theme.color.textFaint, fontWeight: '700' }}>
          {hi ? 'सहमत हूँ, पेपर शुरू करें' : 'Agree and start the paper'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
