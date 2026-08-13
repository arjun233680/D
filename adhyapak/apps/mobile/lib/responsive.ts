import { useWindowDimensions } from 'react-native';
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

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();

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
