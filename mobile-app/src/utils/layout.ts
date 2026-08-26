import { Dimensions } from 'react-native';

/**
 * Responsive layout helpers for iPad / large screens.
 *
 * DICE's screens are iPhone-width designs. On iPad we (a) let the content use a
 * generous centred width instead of a narrow phone column, and (b) lay list /
 * card content out in MULTIPLE COLUMNS so the width is used, not stretched into
 * sparse full-width rows. Phone widths are unaffected (the cap only engages
 * above phone sizes, and grids fall back to a single column).
 */
export const CONTENT_MAX = 900;

/** Current window width. */
export const screenWidth = (): number => Dimensions.get('window').width;

/** True on tablet-class widths. */
export const isTablet = (): boolean => Dimensions.get('window').width >= 768;

/** Width to compute layout against — the content column, capped on tablet. */
export const contentWidth = (): number => Math.min(Dimensions.get('window').width, CONTENT_MAX);

/** Centre a content block into the capped column. */
export const centeredContent = { width: '100%' as const, maxWidth: CONTENT_MAX, alignSelf: 'center' as const };

/**
 * Column count for a responsive card/list grid.
 * phone → 1, tablet → 2, large tablet → `max` (default 2).
 */
export const gridColumns = (max = 2): number => {
  const w = Dimensions.get('window').width;
  if (w >= 1000) return max;
  if (w >= 768) return 2;
  return 1;
};

/** Per-item width (in px) for a wrapping grid inside the content column. */
export const gridItemWidth = (cols: number, gap: number, horizontalPadding: number): number => {
  const col = Math.min(screenWidth(), CONTENT_MAX) - horizontalPadding * 2;
  return (col - gap * (cols - 1)) / cols;
};
