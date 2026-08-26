import { Dimensions } from 'react-native';

/**
 * Responsive layout helpers for iPad / large screens.
 *
 * DICE's screens are iPhone-width designs. On iPad the full window width is
 * ~1000pt+, which stretches cards, spreads rows edge-to-edge, and leaves large
 * empty space. We cap the readable content to a phone-like column and centre
 * it, and expose a clamped width so width-derived sizing (2-col grids, carousel
 * cards) is computed against the column, not the whole iPad.
 */
export const CONTENT_MAX = 720;

/** Current window width. */
export const screenWidth = (): number => Dimensions.get('window').width;

/** True on tablet-class widths. */
export const isTablet = (): boolean => Dimensions.get('window').width >= 768;

/** Width to compute layout against — the phone-like column, capped on tablet. */
export const contentWidth = (): number => Math.min(Dimensions.get('window').width, CONTENT_MAX);

/** Centre a content block into the capped column (spread onto a container/contentContainerStyle). */
export const centeredContent = { width: '100%' as const, maxWidth: CONTENT_MAX, alignSelf: 'center' as const };
