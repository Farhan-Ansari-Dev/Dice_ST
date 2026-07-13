import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const NUM_PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

interface AppLockScreenProps {
  onUnlock?: () => void;
  mode?: 'unlock' | 'set';
}

const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlock, mode = 'unlock' }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'del') {
        setPin((p) => p.slice(0, -1));
        setError(false);
        return;
      }
      if (pin.length >= 6) return;
      const newPin = pin + key;
      setPin(newPin);

      if (newPin.length === 6) {
        // Simulate PIN check — in production, compare against SecureStore
        setTimeout(() => {
          if (newPin === '123456' || mode === 'set') {
            onUnlock?.();
          } else {
            setError(true);
            Vibration.vibrate([0, 80, 60, 80]);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 800);
          }
        }, 150);
      }
    },
    [pin, mode, onUnlock]
  );

  const handleBiometric = () => {
    Alert.alert(
      'Biometric Authentication',
      'Touch the fingerprint sensor to unlock',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Authenticate',
          onPress: () => onUnlock?.(),
        },
      ]
    );
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN',
      'Reset your PIN by verifying your identity via email OTP.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send OTP', onPress: () => Alert.alert('OTP Sent', 'Check your registered email.') },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <LinearGradient
        colors={isDark ? ['#0D0F1A', '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topSection}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={28} color="#FFFFFF" />
        </LinearGradient>
        <Text style={styles.title}>
          {mode === 'set' ? 'Set Your PIN' : 'Enter PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'set'
            ? 'Choose a 6-digit PIN to secure your app'
            : 'Enter your 6-digit PIN to continue'}
        </Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>
      {error && <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>}

      {/* Number Pad */}
      <View style={styles.numPad}>
        {NUM_PAD.map((row, ri) => (
          <View key={ri} style={styles.numRow}>
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} style={styles.numKey} />;
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.numKey, key !== 'del' && styles.numKeyBtn, Shadows.sm]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      key === 'del'
                        ? ['transparent', 'transparent']
                        : isDark
                        ? [colors.bgCard, colors.bgCardLight]
                        : ['#FFFFFF', '#F0F2FA']
                    }
                    style={styles.numKeyGrad}
                  >
                    {key === 'del' ? (
                      <Ionicons name="backspace-outline" size={22} color={colors.textPrimary} />
                    ) : (
                      <Text style={styles.numKeyText}>{key}</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Biometric & Forgot PIN */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Ionicons name="finger-print" size={32} color={colors.primary} />
          <Text style={styles.biometricText}>Use Biometrics</Text>
        </TouchableOpacity>

        {mode === 'unlock' && (
          <TouchableOpacity onPress={handleForgotPin}>
            <Text style={styles.forgotPin}>Forgot PIN?</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'space-between' },
    topSection: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 40 },
    lockIcon: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    dotsRow: { flexDirection: 'row', gap: 14, marginVertical: 8 },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotError: { backgroundColor: colors.error ?? '#FF5A5A', borderColor: colors.error ?? '#FF5A5A' },
    errorText: { fontSize: 13, color: colors.error ?? '#FF5A5A', marginTop: 4 },
    numPad: { width: '80%', gap: 12, paddingBottom: 8 },
    numRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    numKey: {
      width: 72,
      height: 72,
      borderRadius: 36,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    numKeyBtn: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    numKeyGrad: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    numKeyText: { fontSize: 22, fontWeight: '600', color: colors.textPrimary },
    bottomActions: { alignItems: 'center', gap: 16, paddingBottom: 16 },
    biometricBtn: { alignItems: 'center', gap: 6 },
    biometricText: { fontSize: 13, color: colors.textSecondary },
    forgotPin: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  });

export default AppLockScreen;
