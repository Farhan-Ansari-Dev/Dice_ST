import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useTheme, BorderRadius } from '../../theme';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { STORAGE_KEYS } from '../../utils/constants';
import authService from '../../services/authService';
import * as LocalAuthentication from 'expo-local-authentication';
import { useToast } from '../../components/common/ToastProvider';

const OTP_LENGTH = 6;

const OTPScreen: React.FC = () => {
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState('');
  const inputs = useRef<TextInput[]>([]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email = (route.params?.email ?? route.params?.phone ?? '').trim().toLowerCase();
  const { setTokens, setUser, setBiometricEnabled } = useAuthStore();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    startTimer();
    inputs.current[0]?.focus();
  }, []);

  const startTimer = () => {
    setTimer(30); setCanResend(false);
    const interval = setInterval(() => {
      setTimer((prev) => { if (prev <= 1) { clearInterval(interval); setCanResend(true); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    const digit = value.replace(/\D/g, '').slice(-1);
    newOtp[index] = digit;
    setOtp(newOtp);
    if (otpError) setOtpError('');
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === OTP_LENGTH) handleVerify(newOtp.join(''));
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newOtp = [...otp]; newOtp[index - 1] = ''; setOtp(newOtp);
    }
  };

  const completeLogin = async (user: any, token: string, refresh: string) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    const finalize = async (enableBiometric: boolean) => {
      if (enableBiometric) await setBiometricEnabled(true);
      await setTokens(token, refresh);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      setUser(user);
    };

    if (hasHardware && isEnrolled) {
      Alert.alert(
        'Enable Biometric Login',
        'Would you like to use Face ID / Fingerprint for faster login next time?',
        [
          { text: 'No Thanks', style: 'cancel', onPress: () => finalize(false) },
          { text: 'Enable', style: 'default', onPress: () => finalize(true) }
        ]
      );
    } else {
      await finalize(false);
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode ?? otp.join('');
    if (!email) {
      setOtpError('Missing email context. Please go back and enter your email again.');
      showToast('Missing Email', 'Please go back and enter your email again.', 'error');
      return;
    }
    if (code.length !== OTP_LENGTH) {
      setOtpError('Please enter the complete 6-digit OTP');
      showToast('Invalid OTP', 'Please enter the complete 6-digit OTP.', 'error');
      return;
    }
    setOtpError('');
    setLoading(true);
    try {
      const response = await authService.verifyOTP({ email, otp: code });
      setLoading(false);
      await completeLogin(response.user, response.token, response.refreshToken);
    } catch {
      setLoading(false);
      setOtpError('Invalid or expired OTP. Please try again or resend OTP.');
      showToast('Verification Failed', 'Invalid or expired OTP.', 'error');
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      const res = await authService.sendOTP({ email });
      if (res.delivery_confirmed === false) {
        showToast('Delivery Failed', 'OTP could not be delivered. Please try again shortly.', 'error');
        return;
      }
      showToast('OTP Sent', 'A new OTP has been sent.', 'success');
      startTimer();
      setOtpError('');
      setOtp(new Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch {
      showToast('Resend Failed', 'Failed to resend OTP.', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0D0F1A', colors.bgDark] : [colors.bgDark, '#E4E8F5', colors.bgDark]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Returns to login screen"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ marginBottom: 28 }}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.iconGradient}>
              <Ionicons name="shield-checkmark" size={36} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>Enter the 6-digit OTP sent to</Text>
          <Text style={[styles.phoneDisplay, { color: colors.primary }]}>{email}</Text>

          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <View key={index} style={[styles.otpBox, digit ? { borderColor: colors.primary, backgroundColor: `${colors.primary}18` } : null]}>
                <TextInput
                  ref={(ref) => { if (ref) inputs.current[index] = ref; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(v) => handleOTPChange(v, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad" maxLength={1} selectTextOnFocus
                  accessibilityLabel={`OTP digit ${index + 1}`}
                />
                <View style={[styles.otpBottomBorder, { backgroundColor: digit ? colors.primary : colors.border }]} />
              </View>
            ))}
          </View>
          {!!otpError && <Text style={[styles.inlineError, { color: colors.error }]}>{otpError}</Text>}

          <View style={styles.timerRow}>
            <Text style={styles.timerText}>{canResend ? "Didn't receive OTP? " : `Resend OTP in ${timer}s`}</Text>
            {canResend && (
              <TouchableOpacity
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel="Resend OTP"
                accessibilityHint="Sends a new one-time passcode"
              >
                <Text style={[styles.resendText, { color: colors.primary }]}>Resend</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ marginTop: 32, paddingHorizontal: 24, width: '100%' }}>
            <Button title="Verify & Continue" onPress={() => handleVerify()} loading={loading} fullWidth size="lg" />
          </View>
          <Text style={styles.demoHint}>Enter the OTP from your email to continue</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  content: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  backButton: { position: 'absolute', top: 60, left: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  iconGradient: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 16 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  phoneDisplay: { fontSize: 16, fontWeight: '700', marginTop: 4, marginBottom: 40 },
  otpRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  otpBox: { width: 48, height: 56, backgroundColor: isDark ? colors.bgCardLight : colors.bgCardLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  otpInput: { width: '100%', height: '100%', textAlign: 'center', fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  otpBottomBorder: { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1 },
  inlineError: { marginTop: 12, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 4 },
  timerText: { fontSize: 13, color: colors.textSecondary },
  resendText: { fontSize: 13, fontWeight: '600' },
  demoHint: { marginTop: 16, fontSize: 12, color: colors.textTertiary, textAlign: 'center', fontStyle: 'italic' },
});

export default OTPScreen;
