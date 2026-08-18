import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import authService from '../../services/authService';

const SecuritySettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isBiometricEnabled, setBiometricEnabled, logout } = useAuthStore();
  const { showToast } = useToast();
  const [twoFactor, setTwoFactor] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Actually deletes the account on the backend, then clears the local session.
  const performAccountDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await authService.deleteAccount();
      showToast('Account deleted', 'Your account has been deleted successfully.', 'success');
      // Clears secure tokens + cached profile and resets auth state; the root
      // navigator reacts to isAuthenticated=false and returns to Login.
      await logout();
    } catch (e) {
      setDeleting(false);
      showToast('Deletion failed', 'Unable to delete your account. Please try again.', 'error');
    }
  };

  // Two explicit confirmations before anything is deleted — the first tap only
  // opens the dialog, and the destructive action requires a second confirm.
  const handleDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(
      'Delete Account?',
      'Deleting your account will permanently remove your DICE account and associated personal data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Confirm Deletion',
              'This is permanent. Are you sure you want to delete your DICE account?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Account', style: 'destructive', onPress: performAccountDeletion },
              ],
            ),
        },
      ],
    );
  };

  const MENU_ITEMS = [
    {
      icon: 'lock-closed-outline' as const,
      title: 'Change Password',
      subtitle: 'Last changed 30 days ago',
      onPress: () => navigation.navigate('ChangePassword'),
      type: 'nav',
      color: colors.primary,
    },
    {
      icon: 'finger-print' as const,
      title: 'Biometric Login',
      subtitle: 'Use fingerprint or Face ID',
      type: 'toggle',
      value: isBiometricEnabled,
      onToggle: () => setBiometricEnabled(!isBiometricEnabled),
      color: colors.success,
    },
    {
      icon: 'shield-checkmark-outline' as const,
      title: 'Two-Factor Auth',
      subtitle: 'Add extra layer of security',
      type: 'toggle',
      value: twoFactor,
      onToggle: () => setTwoFactor(!twoFactor),
      color: colors.secondary,
    },
    {
      icon: 'phone-portrait-outline' as const,
      title: 'Active Sessions',
      subtitle: '2 devices logged in',
      onPress: () => navigation.navigate('DeviceSessions'),
      type: 'nav',
      color: colors.warning,
    },
    {
      icon: 'time-outline' as const,
      title: 'Login History',
      subtitle: 'View recent login activity',
      onPress: () => {},
      type: 'nav',
      color: colors.textSecondary,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.securityScoreCard, Shadows.md]}>
          <LinearGradient colors={[colors.success, colors.successDark]} style={styles.scoreCardInner}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreLabel}>SECURITY SCORE</Text>
              <Text style={styles.scoreValue}>72/100</Text>
              <Text style={styles.scoreSubtitle}>Enable 2FA to improve your score</Text>
            </View>
            <Ionicons name="shield-checkmark" size={48} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        </View>

        <View style={[styles.menuCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.menuCardInner}
          >
            {MENU_ITEMS.map((item, index) => (
              <View key={item.title}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={item.type === 'nav' ? item.onPress : undefined}
                  activeOpacity={item.type === 'nav' ? 0.7 : 1}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuInfo}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.type === 'toggle' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.bgCardLight, true: `${item.color}60` }}
                      thumbColor={item.value ? item.color : colors.textTertiary}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Danger zone — permanent account deletion (App Store requirement) */}
        <Text style={styles.dangerLabel}>Account</Text>
        <TouchableOpacity
          style={[styles.deleteBtn, Shadows.sm]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: `${colors.error}20` }]}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={[styles.menuTitle, { color: colors.error }]}>Delete Account</Text>
            <Text style={styles.menuSubtitle}>Permanently delete your account and data</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.error} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    securityScoreCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16 },
    scoreCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    scoreLeft: { flex: 1 },
    scoreLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 6 },
    scoreValue: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
    scoreSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    menuCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    menuCardInner: { padding: 4 },
    menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14 },
    menuIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuInfo: { flex: 1 },
    menuTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    menuSubtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, marginHorizontal: 12 },
    dangerLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: `${colors.error}40`,
      backgroundColor: isDark ? 'rgba(255,71,87,0.08)' : 'rgba(255,71,87,0.05)',
    },
  });

export default SecuritySettingsScreen;
