export const Colors = {
  // Primary palette
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4D45CC',

  // Secondary
  secondary: '#00D4FF',
  secondaryLight: '#33DDFF',
  secondaryDark: '#0099CC',

  // Accent
  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  accentDark: '#FF4757',

  // Semantic
  success: '#00C896',
  successLight: '#00E5AD',
  successDark: '#00A07A',
  warning: '#FFB347',
  warningLight: '#FFC570',
  warningDark: '#FF9500',
  error: '#FF4757',
  errorLight: '#FF6B7A',
  errorDark: '#CC3344',
  info: '#00D4FF',

  // Backgrounds
  bgDark: '#0A0B0F',
  bgCard: '#12141A',
  bgCardLight: '#1E2130',
  bgOverlay: 'rgba(10,11,15,0.85)',
  bgModal: 'rgba(10,11,15,0.95)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8B92A5',
  textTertiary: '#5A6075',
  textDisabled: '#3D4255',
  textInverse: '#0A0B0F',

  // Borders
  border: '#2A2D3E',
  borderLight: '#3D4255',
  borderFocus: '#6C63FF',

  // Gradients
  gradientPrimary: ['#6C63FF', '#9B59B6'] as [string, string],
  gradientSecondary: ['#00D4FF', '#0099CC'] as [string, string],
  gradientAccent: ['#FF6B6B', '#FF4757'] as [string, string],
  gradientSuccess: ['#00C896', '#00A07A'] as [string, string],
  gradientWarning: ['#FFB347', '#FF9500'] as [string, string],
  gradientDark: ['#1E2130', '#12141A'] as [string, string],
  gradientCard: ['#1A1D2E', '#12141A'] as [string, string],
  gradientHero: ['#6C63FF', '#00D4FF'] as [string, string],

  // Special
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Status badges
  statusPending: '#FFB347',
  statusActive: '#00C896',
  statusRejected: '#FF4757',
  statusCompleted: '#6C63FF',
  statusInReview: '#00D4FF',
};

export type ColorKey = keyof typeof Colors;
export default Colors;
