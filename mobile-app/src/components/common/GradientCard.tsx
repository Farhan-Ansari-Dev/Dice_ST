import React from 'react';
import { ViewStyle, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: [string, string, ...string[]];
  style?: ViewStyle;
  onPress?: (e: GestureResponderEvent) => void;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  borderRadius?: number;
  padding?: number;
  shadow?: boolean;
}

const GradientCard: React.FC<GradientCardProps> = ({
  children, colors, style, onPress,
  start = { x: 0, y: 0 }, end = { x: 1, y: 1 },
  borderRadius = BorderRadius.lg, padding = 16, shadow = true,
}) => {
  const { colors: themeColors, isDark } = useTheme();

  const resolvedColors = (colors ?? (isDark
    ? [themeColors.bgCard, themeColors.bgCardLight]
    : ['#FFFFFF', '#F7F8FC'])) as [string, string, ...string[]];

  const content = (
    <LinearGradient
      colors={resolvedColors}
      start={start} end={end}
      style={[
        { overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : themeColors.border, borderRadius, padding },
        shadow && Shadows.md,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{content}</TouchableOpacity>;
  }
  return content;
};

export default GradientCard;
