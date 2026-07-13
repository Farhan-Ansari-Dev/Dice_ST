import React from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme, Typography, BorderRadius, Shadows } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const SIZE_MAP = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
  md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { colors } = useTheme();
  const sizeStyle = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  const GRADIENT_MAP: Record<string, [string, string]> = {
    primary: [colors.primary, colors.primaryDark],
    secondary: [colors.secondary, colors.secondaryDark],
    accent: [colors.accent, colors.accentDark],
    danger: [colors.error, colors.errorDark],
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  // Platform specific shapes
  const buttonRadius = Platform.OS === 'android' ? 9999 : BorderRadius.md;
  const rippleColor = variant === 'outline' || variant === 'ghost' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.3)';

  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.text,
              { fontSize: sizeStyle.fontSize },
              variant === 'outline' && { color: colors.primary },
              variant === 'ghost' && { color: colors.textSecondary },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </View>
  );

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          styles.outlineBase,
          { 
            paddingVertical: sizeStyle.paddingVertical, 
            paddingHorizontal: sizeStyle.paddingHorizontal, 
            borderColor: colors.primary,
            borderRadius: buttonRadius,
            opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
          },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {renderContent()}
      </Pressable>
    );
  }

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          styles.ghostBase,
          { 
            paddingVertical: sizeStyle.paddingVertical, 
            paddingHorizontal: sizeStyle.paddingHorizontal,
            borderRadius: buttonRadius,
            opacity: Platform.OS === 'ios' && pressed ? 0.7 : 1,
          },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {renderContent()}
      </Pressable>
    );
  }

  const gradientColors = GRADIENT_MAP[variant] ?? GRADIENT_MAP.primary;

  return (
    <View style={[fullWidth && styles.fullWidth, isDisabled && styles.disabled, style, Shadows.primary, { borderRadius: buttonRadius, overflow: 'hidden' }]}>
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        android_ripple={{ color: rippleColor }}
        style={({ pressed }) => [
          { width: '100%', opacity: Platform.OS === 'ios' && pressed ? 0.85 : 1 }
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientBase,
            { 
              paddingVertical: sizeStyle.paddingVertical, 
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderRadius: buttonRadius,
            },
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientBase: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBase: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBase: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
