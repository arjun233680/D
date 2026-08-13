/**
 * One design system, two runtimes.
 *
 * Plain values only — no CSS strings, no RN StyleSheet — so the web app can
 * project them into CSS custom properties and the mobile app can consume them
 * directly in StyleSheet objects. Change a token here and both apps move.
 */
export const theme = {
  color: {
    /* Brand: deep ink surfaces with a confident green call to action, the
       visual language Indian exam-prep learners already recognise. */
    ink: '#0B1120',
    inkSoft: '#111C31',
    primary: '#0F9D58',
    primaryDark: '#0B7C45',
    primaryLight: '#E7F6EE',
    accent: '#4F46E5',
    accentLight: '#EEF0FE',
    saffron: '#F97316',
    saffronLight: '#FFF2E6',

    /* Semantic */
    success: '#16A34A',
    successLight: '#E8F7EE',
    danger: '#DC2626',
    dangerLight: '#FDECEC',
    warning: '#D97706',
    warningLight: '#FEF3E2',
    info: '#0284C7',
    infoLight: '#E4F2FB',

    /* Neutrals */
    bg: '#F4F6FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F9FC',
    border: '#E4E7EF',
    borderStrong: '#CBD2E1',
    text: '#0F172A',
    textMuted: '#59637A',
    textFaint: '#8A93A6',
    white: '#FFFFFF',

    /* Test-player palette — fixed meanings, never re-themed */
    answered: '#16A34A',
    notAnswered: '#DC2626',
    notVisited: '#CBD2E1',
    marked: '#7C3AED',
    answeredMarked: '#7C3AED',
  },
  radius: { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 },
  /* 4pt grid. Screens use these rather than ad-hoc numbers so rhythm holds. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  /**
   * Type scale.
   *
   * Sized for Devanagari, which needs more room than Latin: body sits at 16
   * rather than the 14 a Latin-only app could use, because matras above and
   * below the line lose definition below that. Line heights run 1.5-1.7 for the
   * same reason — the `line` values below are absolute pixels, already
   * multiplied, so a screen never has to compute them.
   */
  font: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 22,
    xl: 26,
    xxl: 32,
    xxxl: 40,
  },
  line: {
    xs: 18,
    sm: 22,
    base: 26,
    md: 28,
    lg: 30,
    xl: 34,
    xxl: 40,
    xxxl: 48,
  },
  /**
   * Two families, both carrying Latin and Devanagari so a bilingual string
   * never falls back mid-sentence:
   *   display — Poppins, one of the few geometric sans faces with genuine
   *             Devanagari coverage. Headings and numbers.
   *   body    — Hind, drawn for Indian-language digital text and legible at
   *             small sizes where Poppins gets tight.
   * Weights stop at 500 for body: 100-200 lose definition on the mid-range
   * Android screens most aspirants use.
   */
  family: {
    display: 'Poppins_600SemiBold',
    displayBold: 'Poppins_700Bold',
    displayMedium: 'Poppins_500Medium',
    body: 'Hind_400Regular',
    bodyMedium: 'Hind_500Medium',
    bodySemi: 'Hind_600SemiBold',
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '800' },
  /** Icon sizes. Touch targets stay at 44+ per platform guidance. */
  icon: { sm: 20, md: 26, lg: 34, xl: 44, xxl: 56 },
} as const;

export type Theme = typeof theme;

/**
 * Per-exam accent.
 *
 * The learner picks a goal during onboarding and the app takes that exam's
 * colour as its accent, so a CTET aspirant and an HTET aspirant open visually
 * different apps built from the same code. Surfaces stay neutral — only the
 * accent moves, which keeps contrast predictable across fifteen palettes.
 */
export interface ExamTheme {
  accent: string;
  accentSoft: string;
  onAccent: string;
  gradientFrom: string;
  gradientTo: string;
}

/** Mixes a hex colour with white by `amount` (0-1) for tint backgrounds. */
const tint = (hex: string, amount: number): string => {
  const value = hex.replace('#', '');
  const num = parseInt(
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value,
    16,
  );
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
};

export const examTheme = (accent: string | undefined): ExamTheme => {
  const base = accent && /^#[0-9a-fA-F]{3,8}$/.test(accent) ? accent : theme.color.primary;
  return {
    accent: base,
    accentSoft: tint(base, 0.9),
    onAccent: '#FFFFFF',
    gradientFrom: base,
    gradientTo: theme.color.ink,
  };
};
