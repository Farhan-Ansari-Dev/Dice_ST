import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, BorderRadius } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  showPasswordToggle = false,
  required = false,
  secureTextEntry,
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = showPasswordToggle ? !isPasswordVisible : secureTextEntry;
  const inputRadius = BorderRadius.md;
  const inputBorderWidth = isFocused ? 2 : 1;
  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          {required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
        </View>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: isFocused ? colors.primary : error ? colors.error : colors.border,
            borderRadius: inputRadius,
            borderWidth: inputBorderWidth,
          },
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: colors.textPrimary }, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label ?? props.placeholder ?? 'Input field'}
          accessibilityHint={hint}
          accessibilityState={{ disabled: props.editable === false }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityHint="Toggles password visibility"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !showPasswordToggle && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textTertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    ...Typography.label,
  },
  required: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
  },
  inputFocused: {
    // border color handled inline
  },
  inputError: {
    // border color handled inline
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputWithLeft: {
    paddingLeft: 8,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightIcon: {
    paddingRight: 14,
  },
  errorText: {
    ...Typography.caption,
    marginTop: 4,
  },
  hintText: {
    ...Typography.caption,
    marginTop: 4,
  },
});

export default Input;
