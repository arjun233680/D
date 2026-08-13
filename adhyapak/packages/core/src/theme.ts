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
    bg: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFC',
    border: '#E4E7EF',
    borderStrong: '#CBD2E1',
    text: '#0F172A',
    textMuted: '#5A6478',
    textFaint: '#8A93A6',
    white: '#FFFFFF',

    /* Test-player palette — fixed meanings, never re-themed */
    answered: '#16A34A',
    notAnswered: '#DC2626',
    notVisited: '#CBD2E1',
    marked: '#7C3AED',
    answeredMarked: '#7C3AED',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  font: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 38,
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '800' },
} as const;

export type Theme = typeof theme;
