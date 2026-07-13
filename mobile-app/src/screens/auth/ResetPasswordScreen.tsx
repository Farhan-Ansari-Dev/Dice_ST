import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconArea}>
            <LinearGradient colors={[colors.success, colors.successDark]} style={styles.iconGradient}>
              <Ionicons name="key-outline" size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.description}>Enter the OTP sent to your email and create a new password.</Text>

          <View style={[styles.card, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.inputLabel}>Enter OTP</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="keypad-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="6-digit OTP"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Create new password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordHints}>
                {['At least 8 characters', 'One uppercase letter', 'One number'].map((hint) => (
                  <View key={hint} style={styles.hintRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.hintText}>{hint}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, Shadows.md]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.success, colors.successDark]} style={styles.resetBtnGradient}>
              <Text style={styles.resetBtnText}>Reset Password</Text>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
    iconArea: { alignItems: 'center', marginBottom: 24 },
    iconGradient: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 20,
    },
    cardInner: { padding: 20 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    passwordHints: { gap: 6, marginTop: 16 },
    hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    hintText: { fontSize: 12, color: colors.textTertiary },
    resetBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    resetBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    resetBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default ResetPasswordScreen;
