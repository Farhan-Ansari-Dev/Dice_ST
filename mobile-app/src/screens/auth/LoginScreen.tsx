import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Animated, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin, statusCodes, isSuccessResponse, isCancelledResponse } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { STORAGE_KEYS } from '../../utils/constants';
import ENV from '../../config/env';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { setTokens, setUser } = useAuthStore();
  const { showToast } = useToast();

  const iosClientId = ENV.GOOGLE_IOS_CLIENT_ID;
  const webClientId = ENV.GOOGLE_WEB_CLIENT_ID;

  useEffect(() => {
    // webClientId is mandatory on Android: without it GoogleSignin completes the
    // account picker but returns a null idToken, and the backend then rejects the
    // request as a validation error. Surface the real cause instead.
    if (!webClientId) {
      console.error(
        '[GoogleSignIn] Missing web client ID. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ' +
        'or expo.extra.googleWebClientId in app.json — Google Sign-In cannot issue an ID token without it.'
      );
      return;
    }
    GoogleSignin.configure({
      iosClientId,
      webClientId,
      offlineAccess: false,
    });
  }, [iosClientId, webClientId]);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const savedEmail = await SecureStore.getItemAsync('saved_email');
      setBiometricAvailable(compatible && enrolled && !!savedEmail);
    })();
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to sign in',
      fallbackLabel: 'Use OTP instead',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      const savedEmail = await SecureStore.getItemAsync('saved_email');
      if (savedEmail) navigation.navigate('OTP', { email: savedEmail, biometric: true });
    }
  };

  const handleSendOTP = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      showToast('Invalid Email', 'Please enter a valid email address.', 'error');
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      const res = await authService.sendOTP({ email: trimmedEmail });
      if (res.delivery_confirmed === false) {
        showToast('Delivery Failed', 'Could not deliver OTP email. Please try again shortly.', 'error');
        return;
      }
      showToast('OTP Sent', 'Check your email for the 6-digit code.', 'success');
      navigation.navigate('OTP', { email: trimmedEmail });
    } catch {
      showToast('OTP Failed', 'Unable to send OTP right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!webClientId) {
      showToast('Google Sign-In Unavailable', 'This build is missing its Google configuration. Please use email OTP.', 'error');
      return;
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always present the account chooser. signIn() silently reuses the app's
      // cached Google session when one exists; signOut() clears only that LOCAL
      // session (not the OAuth consent grant), so the next signIn() re-shows the
      // picker. No silent sign-in is used elsewhere, so this is safe.
      await GoogleSignin.signOut().catch(() => {});
      const userInfo = await GoogleSignin.signIn();
      if (isSuccessResponse(userInfo)) {
        const idToken = userInfo.data.idToken;
        if (idToken) {
          await handleGoogleToken(idToken);
        } else {
          showToast('Google Sign-In Failed', 'Google login succeeded but did not return an ID token.', 'error');
        }
      } else if (isCancelledResponse(userInfo)) {
        // User cancelled — no toast needed
      }
    } catch (error: any) {
      // Logged in release builds too. A __DEV__-only log makes a release-only
      // failure undiagnosable, which is exactly when it matters. Code and
      // message carry no secrets — the ID token is never touched here.
      console.warn('[GoogleSignIn] failed:', error?.code, error?.message);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — no toast needed
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showToast('Google Sign-In', 'Sign in is already in progress.', 'info');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showToast('Google Sign-In Failed', 'Google Play Services are not available.', 'error');
      } else if (String(error?.code) === '10') {
        // DEVELOPER_ERROR: this build's signing certificate SHA-1 is not
        // registered on the Android OAuth client for com.sanyogconformity.app.
        showToast(
          'Google Sign-In Unavailable',
          'This app build is not registered with Google. Please use email OTP.',
          'error',
        );
      } else {
        showToast(
          'Google Sign-In Failed',
          `Unable to sign in with Google (${error?.code ?? 'unknown'}). Please use email OTP.`,
          'error',
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const result = await authService.googleSignIn(idToken);
      await setTokens(result.token, result.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
      setUser(result.user);
    } catch (err: any) {
      // Release-visible too: a backend rejection here is the failure mode that
      // only ever appears against the production API. Status + error code only.
      console.warn(
        '[GoogleSignIn] backend rejected token:',
        err?.response?.status,
        err?.response?.data?.error ?? err?.message,
      );
      showToast(
        'Google Sign-In Failed',
        err?.response?.data?.message ?? 'Unable to complete sign-in. Please try again or use email OTP.',
        'error',
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // Sign in with Apple (iOS only). The native call returns a signed identityToken
  // which the backend verifies; the account is linked by email (same as Google).
  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        showToast('Apple Sign-In Failed', 'Apple did not return an identity token. Please try again or use email OTP.', 'error');
        return;
      }
      const result = await authService.appleSignIn(credential.identityToken, credential.fullName ?? undefined);
      await setTokens(result.token, result.refreshToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(result.user));
      setUser(result.user);
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return; // user cancelled — no toast
      console.warn('[AppleSignIn] failed:', err?.code, err?.response?.status, err?.response?.data?.error ?? err?.message);
      showToast(
        'Apple Sign-In Failed',
        err?.response?.data?.message ?? 'Unable to complete sign-in. Please try again or use email OTP.',
        'error',
      );
    } finally {
      setAppleLoading(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0D0F1A', colors.bgDark] : [colors.bgDark, '#E4E8F5', colors.bgDark]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decoration1} />
      <View style={styles.decoration2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <Animated.View style={[styles.logoArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoImageWrap} accessibilityRole="image" accessibilityLabel="Dice logo">
              <Image
                source={require('../../../assets/logo-dark.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandName}>DICE</Text>
            <Text style={styles.brandSub}>Compliance OS</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[styles.card, Shadows.lg, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient
              colors={isDark ? ['rgba(30,33,48,0.95)', 'rgba(18,20,26,0.98)'] : ['rgba(255,255,255,0.98)', 'rgba(247,248,252,0.98)']}
              style={styles.cardGradient}
            >
              <Text style={styles.cardTitle}>Welcome Back</Text>
              <Text style={styles.cardSubtitle}>Sign in with your email to continue</Text>

              <Input
                value={email} onChangeText={(value) => { setEmail(value); if (emailError) setEmailError(''); }} placeholder="Email Address"
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textTertiary} />}
                hint={emailError || undefined}
              />
              {!!emailError && <Text style={[styles.inlineError, { color: colors.error }]}>{emailError}</Text>}

              <View style={{ height: 8 }} />
              <Button title="Send OTP" onPress={handleSendOTP} loading={loading} fullWidth size="lg" icon={<Ionicons name="lock-closed-outline" size={18} color="#fff" />} />

              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with biometrics"
                  accessibilityHint="Use your enrolled biometric credential"
                >
                  <Ionicons name="finger-print" size={22} color={colors.primary} />
                  <Text style={[styles.biometricText, { color: colors.primary }]}>Sign in with Biometrics</Text>
                </TouchableOpacity>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={isDark
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={{ width: '100%', height: 50, marginBottom: 12 }}
                  onPress={handleAppleSignIn}
                />
              )}

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.8}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                accessibilityHint="Opens Google authentication"
              >
                <View style={styles.googleIcon}>
                  <Ionicons name="logo-google" size={18} color="#DB4437" />
                </View>
                <Text style={styles.socialButtonText}>{googleLoading ? 'Signing in...' : 'Continue with Google'}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  decoration1: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(108,99,255,0.08)' },
  decoration2: { position: 'absolute', bottom: -150, left: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(0,212,255,0.05)' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center' },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoImageWrap: {
    width: 124,
    height: 124,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },
  logoImage: { width: 108, height: 108 },
  brandName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  brandSub: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase' },
  card: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
  cardGradient: { padding: 28 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 28, lineHeight: 20 },
  inlineError: { marginTop: 8, marginBottom: 2, marginLeft: 2, fontSize: 12, fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textTertiary },
  socialButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 52, borderRadius: BorderRadius.md, backgroundColor: isDark ? colors.bgDark : colors.bgCardLight, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: colors.primary, marginTop: 12, backgroundColor: `${colors.primary}10` },
  biometricText: { fontSize: 14, fontWeight: '600' },
  googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  socialButtonText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  termsText: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 24, lineHeight: 18 },
  termsLink: { color: colors.primary, fontWeight: '500' },
});

export default LoginScreen;
