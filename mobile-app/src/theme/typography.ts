import { TextStyle } from 'react-native';

export const FontSizes = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
};

export const FontWeights = {
  thin: '100' as TextStyle['fontWeight'],
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

export const LineHeights = {
  xs: 14,
  sm: 16,
  base: 20,
  md: 22,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 44,
};

export const Typography = {
  h1: {
    fontSize: FontSizes['4xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights['4xl'],
    letterSpacing: -0.5,
  } as TextStyle,
  h2: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    lineHeight: LineHeights['3xl'],
    letterSpacing: -0.3,
  } as TextStyle,
  h3: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights['2xl'],
    letterSpacing: -0.2,
  } as TextStyle,
  h4: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.xl,
    letterSpacing: -0.1,
  } as TextStyle,
  h5: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.lg,
    letterSpacing: 0,
  } as TextStyle,
  body1: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.md,
    letterSpacing: 0.15,
  } as TextStyle,
  body2: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.base,
    letterSpacing: 0.2,
  } as TextStyle,
  caption: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.regular,
    lineHeight: LineHeights.sm,
    letterSpacing: 0.25,
  } as TextStyle,
  overline: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  } as TextStyle,
  button: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    lineHeight: LineHeights.base,
    letterSpacing: 0.3,
  } as TextStyle,
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: LineHeights.sm,
  } as TextStyle,
};

export default Typography;
