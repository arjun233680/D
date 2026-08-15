import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t, theme, UI, type Lang, type Question } from '@adhyapak/core';
import { useStore } from '@/lib/store';
import { Badge, s } from '@/components/ui';

/**
 * One question, reviewed: what was asked, what the learner picked, what was
 * right, and why. The mobile twin of the website's QuestionSolution.
 *
 * Shared by the mock result and by practice, because they are the same thing
 * seen after two different kinds of sitting. The two differ only in what they
 * append underneath, which is what `footer` is for.
 */
export function QuestionSolution({
  question,
  number,
  selectedIndex,
  lang,
  footer,
}: {
  question: Question;
  /** Position in the set the learner just sat, not an id. */
  number: number;
  /**
   * null when no option was marked — shown as Unattempted, which is a real
   * outcome and not the same as getting it wrong.
   */
  selectedIndex: number | null;
  lang: Lang;
  footer?: ReactNode;
}) {
  const { user, toggleBookmark } = useStore();
  const correct = selectedIndex === question.correctIndex;
  const bookmarked = user.bookmarkedQuestionIds.includes(question.id);

  return (
    <View style={[s.card, { padding: theme.space.lg }]}>
      <View style={[s.row, { gap: 8 }]}>
        <Text style={{ fontWeight: '800', fontSize: theme.font.sm }}>Q{number}</Text>
        <Badge tone={correct ? 'success' : selectedIndex === null ? 'neutral' : 'danger'}>
          {correct
            ? t(UI.correct, lang)
            : selectedIndex === null
              ? t(UI.unattempted, lang)
              : t(UI.incorrect, lang)}
        </Badge>
        {question.previousYear ? <Badge tone="info">{question.previousYear}</Badge> : null}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => toggleBookmark(question.id)}>
          <Text style={{ fontSize: 16 }}>{bookmarked ? '🔖' : '📑'}</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: theme.font.base, fontWeight: '600', lineHeight: 23, marginTop: 8 }}>
        {t(question.text, lang)}
      </Text>

      <View style={{ marginTop: 10, gap: 6 }}>
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === selectedIndex;
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1,
                borderRadius: theme.radius.sm,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderColor: isCorrect
                  ? theme.color.success
                  : isChosen
                    ? theme.color.danger
                    : theme.color.border,
                backgroundColor: isCorrect
                  ? theme.color.successLight
                  : isChosen
                    ? theme.color.dangerLight
                    : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: theme.font.sm }}>
                {String.fromCharCode(65 + i)}.
              </Text>
              <Text style={{ flex: 1, fontSize: theme.font.sm, lineHeight: 20 }}>
                {t(opt, lang)}
              </Text>
              {isCorrect ? <Text>✅</Text> : isChosen ? <Text>❌</Text> : null}
            </View>
          );
        })}
      </View>

      <View
        style={{
          marginTop: 10,
          backgroundColor: theme.color.surfaceAlt,
          borderRadius: theme.radius.md,
          padding: 12,
        }}
      >
        <Text style={[s.faint, { fontWeight: '800' }]}>
          {t(UI.explanation, lang).toUpperCase()}
        </Text>
        <Text style={{ fontSize: theme.font.sm, lineHeight: 21, marginTop: 4 }}>
          {t(question.explanation, lang)}
        </Text>
      </View>

      {footer}
    </View>
  );
}
