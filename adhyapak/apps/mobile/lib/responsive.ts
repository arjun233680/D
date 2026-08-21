import { Platform, useWindowDimensions } from 'react-native';
import { theme } from '@adhyapak/core';

/**
 * Responsive layout.
 *
 * The same code renders on a 360px Android phone and a 1920px desktop browser,
 * so nothing may assume phone width. Breakpoints follow content, not devices:
 * one column while a card needs the full width, two once cards can sit side by
 * side, three when they would otherwise stretch past a comfortable line length.
 *
 * On wide screens the app is centred inside `maxWidth` rather than stretched —
 * a 1600px-wide row of exam cards is unreadable, and full-bleed text lines run
 * far past the 65-75 characters that stay easy to scan.
 */

export interface Responsive {
  width: number;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Horizontal page padding — grows with the viewport. */
  gutter: number;
  /** Content is centred inside this on wide screens. */
  maxWidth: number;
  /** Columns for card grids. */
  columns: number;
  /** Width of a card inside a horizontal rail. */
  railCardWidth: number;
  /** Scales headline sizes up a step on large screens. */
  displayScale: number;
}

const PHONE_MAX = 600;
const TABLET_MAX = 1024;

/**
 * How wide the app is ever drawn in a browser.
 *
 * This is a phone app. Its web build exists so the phone app can be looked at
 * on a desktop — not so it can become a website; the website is a separate
 * Next.js app at apps/web with its own layouts. Letting the Expo build spread
 * into a 1120pt three-column desktop layout meant that opening the link on a
 * laptop showed a wide layout no handset will ever render, which reads as "the
 * mobile app keeps turning into the web version".
 *
 * So on web the viewport is treated as a handset however large the window is,
 * and the app is drawn in a 420pt column down the middle. That is what the
 * design prototype does — `width: min(100%, 420px)` — and it is the honest
 * thing for a phone app's preview to do.
 *
 * Native is untouched: a real tablet still gets the tablet layout, because
 * there the extra width is a real device and not a desktop browser window.
 */
const WEB_PHONE_WIDTH = 420;

export function useResponsive(): Responsive {
  const { width: viewport } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(viewport, WEB_PHONE_WIDTH) : viewport;

  const isPhone = width < PHONE_MAX;
  const isTablet = width >= PHONE_MAX && width < TABLET_MAX;
  const isDesktop = width >= TABLET_MAX;

  const gutter = isPhone ? theme.space.lg : isTablet ? theme.space.xl : theme.space.xxl;
  const maxWidth = isDesktop ? 1120 : isTablet ? 760 : width;
  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  // Rail cards track the viewport on phones so a card never gets clipped at
  // 320px, and settle at a fixed comfortable size once there is room.
  const railCardWidth = isPhone ? Math.min(300, width * 0.78) : 300;

  return {
    width,
    isPhone,
    isTablet,
    isDesktop,
    gutter,
    maxWidth,
    columns,
    railCardWidth,
    displayScale: isDesktop ? 1.15 : 1,
  };
}

/** Style for a page's centred content column. */
export const contentStyle = (r: Responsive) => ({
  width: '100%' as const,
  maxWidth: r.maxWidth,
  alignSelf: 'center' as const,
});

/**
 * Width of one cell in a wrapping grid, in points.
 *
 * Percentages cannot do this. A two-column grid written as `width: '48.5%'`
 * with `gap: 12` asks for 97% of the row plus 12 points, which is wider than
 * the row by about two points on a 390pt phone — so the second card wrapped and
 * every grid on the app rendered as a single column with a column of empty
 * space beside it. The gap is in points and the columns have to be too.
 */
export const gridItemWidth = (r: Responsive, columns: number, gap = 12): number => {
  const available = Math.min(r.maxWidth, r.width) - r.gutter * 2;
  return Math.floor((available - gap * (columns - 1)) / columns);
};
