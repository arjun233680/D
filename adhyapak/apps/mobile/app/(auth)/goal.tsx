import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  electivesForPaper,
  examPickerGroups,
  electivePickerItems,
  examTheme,
  getExam,
  getSubject,
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
  const [query, setQuery] = useState('');
  const examGroups = useMemo(() => examPickerGroups(query, lang), [query, lang]);
  const r = useResponsive();
  const hi = lang === 'hi';

  const selected = examId ? getExam(examId) : undefined;
  const palette = examTheme(selected?.color);

  // Step 2 only makes sense for exams that run more than one paper.
  const needsPaper = Boolean(selected && selected.papers.length > 1);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const pickExam = (id: string) => {
    setExamId(id);
    setPaperId(null);
    setSubjectId(null);
  };

  const chosenPaperId = paperId ?? selected?.papers[0]?.id;

  /*
   * Step 3: the subject, for the papers that make the candidate choose one.
   *
   * There is no single "TGT paper" — there are twelve, and they differ only in
   * this block. Until it is answered the app does not know which sixty marks of
   * a hundred and fifty belong to this learner, so the paper cannot be shown,
   * a mock cannot be assembled, and topic practice would offer somebody else's
   * subject. That is why this step exists and why Continue waits for it.
   */
  const group = electivesForPaper(chosenPaperId)[0];
  const needsSubject = Boolean(group);

  // A paper change invalidates the subject: HTET TGT's twelve and CTET Paper
  // 2's two share no options, so carrying the old choice over would leave a
  // subject the new paper does not offer.
  const pickPaper = (id: string) => {
    setPaperId(id);
    setSubjectId(null);
  };

  const ready = Boolean(selected) && (!needsSubject || Boolean(subjectId));

  const confirm = () => {
    if (!selected || !ready) return;
    chooseGoal(selected.id, chosenPaperId, subjectId ?? undefined);
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

        {/*
          Twenty-eight exams: a search box and two groups. A grid of cards this
          long means scrolling past twenty-three state tests to reach the one
          you came for, and most people came for one they can name.
        */}
        <View
          style={{
            paddingHorizontal: r.gutter,
            width: '100%',
            maxWidth: r.maxWidth,
            alignSelf: 'center',
            marginTop: theme.space.xl,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={hi ? 'परीक्षा खोजें…' : 'Search exams…'}
            placeholderTextColor={theme.color.textFaint}
            autoCorrect={false}
            style={{
              backgroundColor: theme.color.surfaceAlt,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.space.lg,
              paddingVertical: 12,
              fontSize: theme.font.base,
              fontFamily: theme.family.body,
              color: theme.color.text,
            }}
          />
        </View>

        {examGroups.length === 0 ? (
          <Text
            style={{
              paddingHorizontal: r.gutter,
              marginTop: theme.space.lg,
              color: theme.color.textMuted,
              fontFamily: theme.family.body,
              fontSize: theme.font.sm,
            }}
          >
            {hi ? 'कोई परीक्षा नहीं मिली।' : 'No exam matches that.'}
          </Text>
        ) : null}

        {examGroups.map((group) => (
          <View key={group.title.en} style={{ marginTop: theme.space.xl }}>
            <Text
              style={{
                paddingHorizontal: r.gutter,
                width: '100%',
                maxWidth: r.maxWidth,
                alignSelf: 'center',
                fontSize: theme.font.sm,
                fontFamily: theme.family.bodySemi,
                letterSpacing: 0.6,
                color: theme.color.textMuted,
                marginBottom: theme.space.md,
              }}
            >
              {t(group.title, lang).toUpperCase()}
            </Text>
            <View
              style={{
                paddingHorizontal: r.gutter,
                width: '100%',
                maxWidth: r.maxWidth,
                alignSelf: 'center',
                gap: theme.space.sm,
              }}
            >
              {group.items.map((item) => {
                const on = examId === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => pickExam(item.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.space.md,
                      borderRadius: theme.radius.md,
                      paddingHorizontal: theme.space.md,
                      paddingVertical: 12,
                      backgroundColor: on ? theme.color.primaryLight : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontSize: theme.font.base,
                          fontFamily: theme.family.bodySemi,
                          color: theme.color.text,
                        }}
                        numberOfLines={1}
                      >
                        {hi ? item.labelHi : item.labelEn}
                      </Text>
                      <Text
                        style={{
                          fontSize: theme.font.xs,
                          fontFamily: theme.family.body,
                          color: theme.color.textMuted,
                        }}
                        numberOfLines={1}
                      >
                        {hi ? item.hintHi : item.hintEn}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
                    onPress={() => pickPaper(paper.id)}
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

        {needsSubject && group ? (
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
              {t(group.name, lang)}?
            </Text>
            <Text
              style={{
                fontSize: theme.font.sm,
                lineHeight: theme.line.sm,
                fontFamily: theme.family.body,
                color: theme.color.textMuted,
                marginTop: 4,
              }}
            >
              {hi
                ? 'यही तय करता है कि पेपर का कौन-सा भाग आपका है। बाद में बदला जा सकता है।'
                : 'This decides which part of the paper is yours. It can be changed later.'}
            </Text>
            {/*
              A wrapping grid, not a row of chips. Twelve TGT subjects and
              twenty-one PGT ones do not fit a row, and one that scrolls
              sideways hides most of them off the right edge with no sign of how
              many are there — somebody looking for Sanskrit had to drag the
              list to find out whether it was even offered.
            */}
            <View
              style={{
                marginTop: theme.space.lg,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.space.sm,
              }}
            >
              {electivePickerItems(group.choices, selected?.id).map((item) => {
                const on = subjectId === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setSubjectId(item.value)}
                    style={{
                      // Two per row on a phone, three where there is room. A
                      // fixed basis rather than a column count so a long name
                      // wraps inside its own tile instead of stretching it.
                      flexGrow: 1,
                      flexBasis: '45%',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.space.sm,
                      backgroundColor: on ? palette.accentSoft : theme.color.surfaceAlt,
                      borderRadius: theme.radius.md,
                      borderWidth: 2,
                      borderColor: on ? palette.accent : 'transparent',
                      paddingHorizontal: theme.space.md,
                      paddingVertical: 11,
                    }}
                  >
                    <Text style={{ fontSize: theme.font.base }}>{item.icon}</Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: theme.font.sm,
                        fontFamily: theme.family.bodySemi,
                        color: theme.color.text,
                      }}
                      numberOfLines={2}
                    >
                      {hi ? item.labelHi : item.labelEn}
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
          {/*
            Disabled until the subject is picked, rather than defaulting to the
            first one. A default here is a guess about what somebody teaches,
            and it decides sixty of their hundred and fifty marks.
          */}
          <Pressable
            onPress={confirm}
            disabled={!ready}
            style={{
              backgroundColor: ready ? palette.accent : theme.color.border,
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
