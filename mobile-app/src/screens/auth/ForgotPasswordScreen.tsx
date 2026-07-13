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

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

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
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconArea}>
            <LinearGradient colors={[colors.warning, colors.warningDark]} style={styles.iconGradient}>
              <Ionicons name="lock-open-outline" size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {!sent ? (
            <>
              <Text style={styles.title}>Reset Your Password</Text>
              <Text style={styles.description}>
                Enter your registered email address and we'll send you an OTP to reset your password.
              </Text>

              <View style={[styles.card, Shadows.md]}>
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.cardInner}
                >
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </LinearGradient>
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, Shadows.md]}
                onPress={() => setSent(true)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.sendBtnGradient}>
                  <Text style={styles.sendBtnText}>Send OTP</Text>
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>OTP Sent!</Text>
              <Text style={styles.description}>
                We've sent a 6-digit OTP to {email || 'your email'}. Please check your inbox and enter the code.
              </Text>
              <View style={[styles.successBadge, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.successText, { color: colors.success }]}>OTP sent successfully</Text>
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, Shadows.md]}
                onPress={() => navigation.navigate('ResetPassword')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.sendBtnGradient}>
                  <Text style={styles.sendBtnText}>Enter OTP & Reset</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.backToLogin} onPress={() => navigation.navigate('Login')}>
            <Ionicons name="arrow-back" size={14} color={colors.primary} />
            <Text style={styles.backToLoginText}>Back to Login</Text>
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
      shadowColor: colors.warning,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },
    title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 10 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
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
    sendBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 20 },
    sendBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    sendBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    successBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: BorderRadius.md,
      marginBottom: 20,
    },
    successText: { fontSize: 14, fontWeight: '600' },
    backToLogin: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
    backToLoginText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  });

export default ForgotPasswordScreen;
