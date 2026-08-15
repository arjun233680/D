import { Pressable, ScrollView, Text } from 'react-native';
import {
  theme,
  type Lang,
  type SolutionFilter,
  type SolutionFilterOption,
} from '@adhyapak/core';

/**
 * All / Correct / Incorrect / Unattempted, with a count on each.
 *
 * The mobile twin of the website's chips, driven by the same options and the
 * same counts. A chip with nothing behind it is dimmed rather than hidden:
 * "Incorrect 0" is a result worth seeing, and a chip that vanished would move
 * the others under the reader's thumb between one sitting and the next.
 */

const TONE: Record<SolutionFilter, string> = {
  all: theme.color.ink,
  correct: theme.color.success,
  incorrect: theme.color.danger,
  unattempted: theme.color.textMuted,
};

export function SolutionFilterChips({
  options,
  value,
  onChange,
  lang,
}: {
  options: SolutionFilterOption[];
  value: SolutionFilter;
  onChange: (filter: SolutionFilter) => void;
  lang: Lang;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {options.map((option) => {
        const active = option.value === value;
        const empty = option.count === 0;
        return (
          <Pressable
            key={option.value}
            disabled={empty}
            onPress={() => onChange(option.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: active ? TONE[option.value] : theme.color.surface,
              borderColor: active ? 'transparent' : theme.color.border,
              borderWidth: 1,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginRight: theme.space.sm,
              opacity: empty ? 0.4 : 1,
            }}
          >
            <Text
              style={{
                color: active ? '#fff' : theme.color.textMuted,
                fontFamily: theme.family.bodyMedium,
                fontSize: theme.font.sm,
              }}
            >
              {lang === 'hi' ? option.labelHi : option.labelEn}
            </Text>
            <Text
              style={{
                color: active ? '#fff' : TONE[option.value],
                fontFamily: theme.family.bodySemi,
                fontSize: theme.font.sm,
                fontVariant: ['tabular-nums'],
              }}
            >
              {option.count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
