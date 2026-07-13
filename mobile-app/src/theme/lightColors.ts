const LightColors = {
  // Primary palette (same accents, they pop on light too)
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#4D45CC',

  secondary: '#00B5D8',
  secondaryLight: '#00D4FF',
  secondaryDark: '#0088A8',

  accent: '#FF6B6B',
  accentLight: '#FF8E8E',
  accentDark: '#FF4757',

  success: '#00A87A',
  successLight: '#00C896',
  successDark: '#007A58',
  warning: '#E6960A',
  warningLight: '#FFB347',
  warningDark: '#C07800',
  error: '#E53E3E',
  errorLight: '#FC8181',
  errorDark: '#C53030',
  info: '#00B5D8',

  // Backgrounds
  bgDark: '#F0F2F8',
  bgCard: '#FFFFFF',
  bgCardLight: '#F7F8FC',
  bgOverlay: 'rgba(240,242,248,0.92)',
  bgModal: 'rgba(255,255,255,0.98)',

  // Text
  textPrimary: '#0A0B1E',
  textSecondary: '#4A5568',
  textTertiary: '#8896AB',
  textDisabled: '#CBD5E0',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  borderLight: '#CBD5E0',
  borderFocus: '#6C63FF',

  // Gradients (kept vivid on light)
  gradientPrimary: ['#6C63FF', '#9B59B6'] as [string, string],
  gradientSecondary: ['#00B5D8', '#0088A8'] as [string, string],
  gradientAccent: ['#FF6B6B', '#FF4757'] as [string, string],
  gradientSuccess: ['#00A87A', '#007A58'] as [string, string],
  gradientWarning: ['#FFB347', '#E6960A'] as [string, string],
  gradientDark: ['#EEF0FF', '#F7F8FC'] as [string, string],
  gradientCard: ['#FFFFFF', '#F7F8FC'] as [string, string],
  gradientHero: ['#6C63FF', '#00B5D8'] as [string, string],

  // Special
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Status badges
  statusPending: '#E6960A',
  statusActive: '#00A87A',
  statusRejected: '#E53E3E',
  statusCompleted: '#6C63FF',
  statusInReview: '#00B5D8',
};

export default LightColors;
