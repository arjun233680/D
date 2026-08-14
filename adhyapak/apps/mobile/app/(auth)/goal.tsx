import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  examTheme,
  getExam,
  getSubject,
  groupedExams,
  t,
  theme,
  type Exam,
} from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { useSession } from '@/lib/session';
import { useResponsive } from '@/lib/responsive';

/**
 * Goal selection.
 *
 * Asked once, immediately after sign-in, because the answer reshapes the entire
 * app: accent colour, subjects, batches, mock tests and the cut-off every score
 * is measured against. Two steps — exam, then which paper of it — since a CTET
 * Paper 1 aspirant and a Paper 2 aspirant study different subjects.
 */
export default function GoalScreen() {
  const { lang, user } = useStore();
  const { chooseGoal } = useSession();
  const [examId, setExamId] = useState<string | null>(user.onboarded ? user.goalExamId : null);
  const groups = useMemo(() => groupedExams(), []);
  const r = useResponsive();
  const hi = lang === 'hi';

  const selected = examId ? getExam(examId) : undefined;
  const palette = examTheme(selected?.color);

  // Step 2 only makes sense for exams that run more than one paper.
  const needsPaper = Boolean(selected && selected.papers.length > 1);
  const [paperId, setPaperId] = useState<string | null>(null);

  const confirm = () => {
    if (!selected) return;
    chooseGoal(selected.id, paperId ?? selected.papers[0]?.id);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: r.gutter,
            paddingTop: theme.space.lg,
            width: '100%',
            maxWidth: r.maxWidth,
            alignSelf: 'center',
          }}
        >
          <Text
            style={{
              fontSize: theme.font.xxl,
              lineHeight: theme.line.xxl,
              fontFamily: theme.family.displayBold,
              color: theme.color.text,
            }}
          >
            {hi ? 'आप कौन-सी परीक्षा दे रहे हैं?' : 'Which exam are you preparing for?'}
          </Text>
          <Text
            style={{
              fontSize: theme.font.base,
              lineHeight: theme.line.base,
              fontFamily: theme.family.body,
              color: theme.color.textMuted,
              marginTop: theme.space.sm,
            }}
          >
            {hi
              ? 'पूरा ऐप आपके लक्ष्य के अनुसार बदल जाएगा — विषय, बैच, मॉक टेस्ट और कट-ऑफ।'
              : 'The whole app reshapes around your goal — subjects, batches, mock tests and cut-off.'}
          </Text>
        </View>

        {groups.map(({ group, exams }) => (
          <View key={group.id} style={{ marginTop: theme.space.xxl }}>
            <View
              style={{
                paddingHorizontal: r.gutter,
                width: '100%',
                maxWidth: r.maxWidth,
                alignSelf: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: theme.font.md,
                  fontFamily: theme.family.display,
                  color: theme.color.text,
                }}
              >
                {t(group.title, lang)}
              </Text>
              <Text
                style={{
                  fontSize: theme.font.sm,
                  lineHeight: theme.line.sm,
                  fontFamily: theme.family.body,
                  color: theme.color.textFaint,
                  marginTop: 2,
                }}
              >
                {t(group.subtitle, lang)}
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: r.gutter,
                marginTop: theme.space.lg,
                gap: theme.space.md,
                flexDirection: r.isPhone ? 'column' : 'row',
                flexWrap: 'wrap',
                width: '100%',
                maxWidth: r.maxWidth,
                alignSelf: 'center',
              }}
            >
              {exams.map((exam) => (
                <ExamOption
                  width={r.isPhone ? '100%' : r.isDesktop ? '32%' : '48%'}
                  key={exam.id}
                  exam={exam}
                  lang={lang}
                  selected={examId === exam.id}
                  onPress={() => {
                    setExamId(exam.id);
                    setPaperId(null);
                  }}
                />
              ))}
            </View>
          </View>
        ))}

        {needsPaper && selected ? (
          <View
            style={{
              marginTop: theme.space.xxl,
              paddingHorizontal: r.gutter,
              width: '100%',
              maxWidth: r.maxWidth,
              alignSelf: 'center',
            }}
          >
            <Text
              style={{
                fontSize: theme.font.md,
                fontFamily: theme.family.display,
                color: theme.color.text,
              }}
            >
              {hi ? 'कौन-सा पेपर?' : 'Which paper?'}
            </Text>
            <View style={{ marginTop: theme.space.lg, gap: theme.space.md }}>
              {selected.papers.map((paper) => {
                const on = (paperId ?? selected.papers[0]?.id) === paper.id;
                // Elective sections contribute no icon: the subject is not
                // known until the candidate picks one.
                const subjects = paper.sections
                  .map((sec) => (sec.subjectId ? getSubject(sec.subjectId) : undefined))
                  .filter(Boolean)
                  .map((sub) => sub!.icon)
                  .join(' ');
                return (
                  <Pressable
                    key={paper.id}
                    onPress={() => setPaperId(paper.id)}
                    style={{
                      backgroundColor: theme.color.surface,
                      borderRadius: theme.radius.lg,
                      borderWidth: 2,
                      borderColor: on ? palette.accent : theme.color.border,
                      padding: theme.space.lg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: theme.font.base,
                        lineHeight: theme.line.base,
                        fontFamily: theme.family.bodySemi,
                        color: theme.color.text,
                      }}
                    >
                      {t(paper.name, lang)}
                    </Text>
                    <Text
                      style={{
                        fontSize: theme.font.sm,
                        fontFamily: theme.family.body,
                        color: theme.color.textMuted,
                        marginTop: 4,
                      }}
                    >
                      {subjects}  ·  {paper.totalQuestions} {hi ? 'प्रश्न' : 'questions'}  ·  {paper.durationMinutes} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {selected ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: theme.space.xl,
            paddingBottom: theme.space.xxl,
            backgroundColor: theme.color.surface,
            borderTopWidth: 1,
            borderTopColor: theme.color.border,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={confirm}
            style={{
              backgroundColor: palette.accent,
              borderRadius: theme.radius.md,
              paddingVertical: 17,
              alignItems: 'center',
              width: '100%',
              maxWidth: 460,
            }}
          >
            <Text
              style={{ color: '#fff', fontSize: theme.font.base, fontFamily: theme.family.display }}
            >
              {hi
                ? `${selected.shortName} की तैयारी शुरू करें`
                : `Start preparing for ${selected.shortName}`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ExamOption({
  exam,
  lang,
  selected,
  onPress,
  width = '100%',
}: {
  exam: Exam;
  lang: 'en' | 'hi';
  selected: boolean;
  onPress: () => void;
  width?: number | string;
}) {
  const palette = examTheme(exam.color);
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: width as never,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.lg,
        backgroundColor: selected ? palette.accentSoft : theme.color.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        borderColor: selected ? palette.accent : theme.color.border,
        padding: theme.space.lg,
      }}
    >
      <View
        style={{
          width: theme.icon.xxl,
          height: theme.icon.xxl,
          borderRadius: theme.radius.md,
          backgroundColor: selected ? palette.accent : `${exam.color}1a`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: theme.icon.md }}>{exam.emoji}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: theme.font.base,
            lineHeight: theme.line.base,
            fontFamily: theme.family.displayMedium,
            color: theme.color.text,
          }}
        >
          {exam.shortName}
        </Text>
        <Text
          style={{
            fontSize: theme.font.sm,
            lineHeight: theme.line.sm,
            fontFamily: theme.family.body,
            color: theme.color.textMuted,
          }}
          numberOfLines={1}
        >
          {exam.state ? t(exam.state, lang) : t(exam.authority, lang)}
        </Text>
        <Text
          style={{
            fontSize: theme.font.xs,
            fontFamily: theme.family.body,
            color: theme.color.textFaint,
            marginTop: 2,
          }}
        >
          {exam.vacancies
            ? `  ·  ${exam.vacancies.toLocaleString('en-IN')} ${lang === 'hi' ? 'पद' : 'posts'}`
            : ''}
        </Text>
      </View>

      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 2,
          borderColor: selected ? palette.accent : theme.color.borderStrong,
          backgroundColor: selected ? palette.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}
