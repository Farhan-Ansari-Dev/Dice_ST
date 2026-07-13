import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { useTheme, Typography, BorderRadius } from '../../theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary' | 'default';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  dot?: boolean;
}

const SIZE_STYLES: Record<BadgeSize, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: 2, paddingH: 7, fontSize: 10 },
  md: { paddingV: 4, paddingH: 10, fontSize: 12 },
  lg: { paddingV: 6, paddingH: 14, fontSize: 13 },
};

const statusVariantMap: Record<string, BadgeVariant> = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  pending: 'warning',
  in_review: 'info',
  under_review: 'info',
  rejected: 'error',
  expired: 'error',
  draft: 'default',
  submitted: 'primary',
  additional_docs_required: 'warning',
};

export const getStatusVariant = (status: string): BadgeVariant =>
  statusVariantMap[status.toLowerCase()] ?? 'default';

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
  dot = false,
}) => {
  const { colors } = useTheme();

  const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
    success: { bg: 'rgba(0,200,150,0.15)', text: colors.success, border: 'rgba(0,200,150,0.3)' },
    warning: { bg: 'rgba(255,179,71,0.15)', text: colors.warning, border: 'rgba(255,179,71,0.3)' },
    error: { bg: 'rgba(255,71,87,0.15)', text: colors.error, border: 'rgba(255,71,87,0.3)' },
    info: { bg: 'rgba(0,212,255,0.15)', text: colors.secondary, border: 'rgba(0,212,255,0.3)' },
    primary: { bg: 'rgba(108,99,255,0.15)', text: colors.primary, border: 'rgba(108,99,255,0.3)' },
    secondary: { bg: 'rgba(0,212,255,0.15)', text: colors.secondary, border: 'rgba(0,212,255,0.3)' },
    default: { bg: colors.bgCardLight, text: colors.textSecondary, border: colors.border },
  };

  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          paddingVertical: sizeStyle.paddingV,
          paddingHorizontal: sizeStyle.paddingH,
        },
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: variantStyle.text }]} />
      )}
      <Text
        style={[
          styles.text,
          { color: variantStyle.text, fontSize: sizeStyle.fontSize },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default Badge;
