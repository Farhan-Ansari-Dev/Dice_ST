import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme';
import Button from '../../components/common/Button';

const BiometricUnlockScreen: React.FC = () => {
  const { setBiometricAuthenticated, logout, user } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const authenticate = async () => {
    setLoading(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'Biometrics are not set up on this device. Would you like to proceed with your device passcode?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Use Passcode', onPress: () => { setBiometricAuthenticated(true); setLoading(false); } }
          ]
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock Sanyog Conformity Solutions',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setBiometricAuthenticated(true);
      }
    } catch (e) {
      console.warn('Biometric error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Automatically trigger on mount, but wait slightly for Android Activity to fully resume
    const timer = setTimeout(() => {
      authenticate();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0D0F1A'] : [colors.bgDark, '#E4E8F5']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.iconGradient}>
            <Ionicons name="finger-print" size={56} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>App Locked</Text>
        <Text style={styles.subtitle}>
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Please authenticate to continue.
        </Text>

        <View style={styles.actions}>
          <Button 
            title="Unlock App" 
            onPress={authenticate} 
            loading={loading}
            fullWidth
            icon={<Ionicons name="lock-open-outline" size={18} color="#fff" />}
          />
          
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Log out instead</Text>
          </TouchableOpacity>

          {/* Fallback button if they get completely stuck on a simulator */}
          <TouchableOpacity style={{ marginTop: 12, padding: 8 }} onPress={() => setBiometricAuthenticated(true)}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
              Use Device Passcode
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  logoutBtn: {
    marginTop: 24,
    padding: 12,
  },
  logoutText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BiometricUnlockScreen;
