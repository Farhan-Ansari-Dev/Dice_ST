import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SessionExpiredScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.illustrationArea}>
          <LinearGradient colors={[colors.error, colors.errorDark]} style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={52} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.ring1} />
          <View style={styles.ring2} />
        </View>
        <Text style={styles.title}>Session Expired</Text>
        <Text style={styles.description}>
          Your session has expired due to inactivity. Please log in again to continue accessing your compliance dashboard.
        </Text>
        <View style={styles.infoCard}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.infoCardInner}
          >
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.infoText}>Sessions expire after 24 hours of inactivity</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textTertiary} />
              <Text style={styles.infoText}>Your data is safe and secure</Text>
            </View>
          </LinearGradient>
        </View>
        <TouchableOpacity
          style={[styles.loginBtn, Shadows.md]}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.loginBtnGradient}>
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
            <Text style={styles.loginBtnText}>Login Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    illustrationArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 36, position: 'relative' },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    ring1: {
      position: 'absolute',
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 2,
      borderColor: `${colors.error}30`,
    },
    ring2: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 1,
      borderColor: `${colors.error}15`,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 12 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    infoCard: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 28,
    },
    infoCardInner: { padding: 16, gap: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    loginBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden' },
    loginBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    loginBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default SessionExpiredScreen;
