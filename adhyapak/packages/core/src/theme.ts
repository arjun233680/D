/**
 * One design system, two runtimes.
 *
 * Plain values only — no CSS strings, no RN StyleSheet — so the web app can
 * project them into CSS custom properties and the mobile app can consume them
 * directly in StyleSheet objects. Change a token here and both apps move.
 */
export const theme = {
  color: {
    /* Brand: deep indigo ink with a violet call to action — the palette the
       login, onboarding and preparation screens are drawn in. It was green
       until those screens landed; leaving it green meant every older screen
       stayed a different product from the one a learner had just walked
       through. Both apps read these, so the phone moves with the website. */
    ink: '#071243',
    inkSoft: '#2A2560',
    primary: '#6B19F3',
    primaryDark: '#5A12D6',
    primaryLight: '#F2EBFF',
    accent: '#4F46E5',
    accentLight: '#EEF0FE',
    saffron: '#FF7B0A',
    saffronLight: '#FFF2E6',

    /* Semantic */
    success: '#15B95E',
    successLight: '#E8F7EE',
    danger: '#DC2626',
    dangerLight: '#FDECEC',
    warning: '#D97706',
    warningLight: '#FEF3E2',
    info: '#1687F6',
    infoLight: '#E4F2FB',

    /* Neutrals.

       These are the same values apps/web/app/globals.css declares as
       --color-canvas, --color-surface-alt and --color-muted. Three of them had
       drifted — bg was #F4F6FA against the website's #FAF9FF, surfaceAlt
       #F7F9FC against #F9FAFC, textMuted a slate #59637A against the website's
       grey #6B7280 — which is most of why the phone read as a different
       product on screens whose code already matched. The header of this file
       and of globals.css both claimed the two mirrored one another; neither
       noticed, because the website never imports this object. If you change a
       neutral here, change it there too. */
    bg: '#FBFAFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFC',
    border: '#E8E4F4',
    borderStrong: '#D8D3EE',
    text: '#071243',
    textMuted: '#58617F',
    textFaint: '#8B91AD',
    white: '#FFFFFF',

    /* Test-player palette — fixed meanings, never re-themed */
    answered: '#16A34A',
    notAnswered: '#DC2626',
    notVisited: '#D8D3EE',
    marked: '#7C3AED',
    answeredMarked: '#7C3AED',
  },
  /* `card` is the website's --radius-card. It sits between md and lg rather
     than replacing either, because 14 and 18 are both still in use elsewhere
     and rounding every one of them to 16 would move more than the cards. */
  radius: { sm: 10, md: 14, card: 18, lg: 18, xl: 24, pill: 999 },
  /* 4pt grid. Screens use these rather than ad-hoc numbers so rhythm holds. */
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },

  /**
   * Depth.
   *
   * Cards were a flat white rectangle inside a 1pt border, which is what a
   * wireframe looks like. Two layers do the work: a tight one that seats the
   * card on the page, and a wide soft one that lifts it off. Both are cast in
   * the ink colour rather than black — a grey shadow over a violet-tinted
   * canvas reads as dirt.
   *
   * `raised` is the colour a control casts in its own hue. A violet button
   * over a violet shadow is the detail that separates a considered UI from an
   * assembled one; grey under a saturated control always looks like a mistake.
   *
   * React Native wants these as `shadowColor`/`shadowOffset`/`shadowOpacity`/
   * `shadowRadius`, so they are kept as parts rather than a CSS string.
   */
  shadow: {
    card: {
      shadowColor: '#1E1B4B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 2,
    },
    picked: {
      shadowColor: '#6D4AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 4,
    },
    raised: {
      shadowColor: '#6D4AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
      elevation: 6,
    },
  },

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
