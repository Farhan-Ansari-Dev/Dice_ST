import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, ViewStyle } from 'react-native';
import { useTheme, BorderRadius } from '../../theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
  style?: ViewStyle;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress, color, height = 6, showLabel = false, label, style, animated = true,
}) => {
  const { colors } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 100);
    if (animated) {
      Animated.timing(animValue, { toValue: target, duration: 800, useNativeDriver: false }).start();
    } else {
      animValue.setValue(target);
    }
  }, [progress, animated]);

  const widthInterpolated = animValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  const resolvedColor = color ?? (progress >= 80 ? colors.success : progress >= 50 ? colors.primary : progress >= 30 ? colors.warning : colors.primary);

  return (
    <View style={style}>
      {(showLabel || label) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>}
          {showLabel && <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>{Math.round(progress)}%</Text>}
        </View>
      )}
      <View style={{ borderRadius: BorderRadius.full, overflow: 'hidden', width: '100%', height, backgroundColor: colors.bgCardLight }}>
        <Animated.View style={{ height, width: widthInterpolated, backgroundColor: resolvedColor, borderRadius: BorderRadius.full }} />
      </View>
    </View>
  );
};

export default ProgressBar;
