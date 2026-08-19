import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import * as StoreReview from 'expo-store-review';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import { useAuthStore } from '../../store/authStore';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, logout, isBiometricEnabled, setBiometricEnabled, userType } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // The Consultant Zone gates the verification centre. Consultant intent is the
  // self-declared onboarding type (businessRole), which is where it actually
  // lives — `role` stays 'client' until/unless an admin changes it, so gating on
  // role alone hid the zone from every genuine consultant. (Being here only
  // grants access to SUBMIT verification; approval/features depend on the real
  // backend consultantVerificationStatus, not on this flag.)
  const isConsultant = user?.businessRole === 'consultant' || user?.role === 'consultant';
  // Operational consultant features (e.g. Assigned Applications) require BOTH
  // consultant intent AND real admin approval — never business_role alone.
  const isVerifiedConsultant = isConsultant && user?.consultantVerificationStatus === 'verified';

  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline' as const, label: 'Edit Profile', onPress: () => navigation.navigate('Settings') },
        { icon: 'business-outline' as const, label: 'Company Details', onPress: () => navigation.navigate('CompanyProfile') },
        { icon: 'shield-outline' as const, label: 'Security Settings', onPress: () => navigation.navigate('SecuritySettings') },
        { icon: 'notifications-outline' as const, label: 'Notifications', onPress: () => navigation.navigate('NotificationSettings'), toggle: notifications, onToggle: setNotifications },
      ],
    },
    ...(isConsultant ? [{
      title: 'Consultant Zone',
      items: [
        { icon: 'shield-checkmark-outline' as const, label: 'Verification Center', onPress: () => navigation.navigate('ConsultantVerification') },
        // Operational consultant features require ACTUAL admin approval, not just
        // consultant intent — gate strictly on the server verification status.
        ...(isVerifiedConsultant
          ? [{ icon: 'briefcase-outline' as const, label: 'Assigned Applications', onPress: () => navigation.navigate('AssignedApplications') }]
          : []),
      ]
    }] : []),
    {
      title: 'Compliance',
      items: [
        { icon: 'shield-checkmark-outline' as const, label: 'The Compliance Vault', onPress: () => handleVaultAuth() },
        { icon: 'document-text-outline' as const, label: 'My Applications', onPress: () => navigation.navigate('Applications') },
        { icon: 'shield-checkmark-outline' as const, label: 'My Certifications', onPress: () => navigation.navigate('Certifications') },
        { icon: 'card-outline' as const, label: 'Billing & Invoices', onPress: () => navigation.navigate('Payments') },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'finger-print-outline' as const, label: 'Biometric Login', toggle: isBiometricEnabled, onToggle: (val: boolean) => setBiometricEnabled(val) },
        {
          icon: (isDark ? 'sunny-outline' : 'moon-outline') as any,
          label: isDark ? 'Light Mode' : 'Dark Mode',
          toggle: !isDark,
          onToggle: toggleTheme,
        },
        { icon: 'language-outline' as const, label: 'Language', value: 'English', onPress: () => navigation.navigate('LanguageSettings') },
      ],
    },
    {
      title: 'Partnership',
      items: [
        { icon: 'business-outline' as const, label: 'Partner Onboarding (CB/Lab/IB)', onPress: () => navigation.navigate('PartnerOnboarding') },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline' as const, label: 'Help Center', onPress: () => navigation.navigate('SupportCenter') },
        {
          icon: 'star-outline' as const, label: 'Rate the App', onPress: async () => {
            const isAvailable = await StoreReview.isAvailableAsync();
            if (isAvailable) {
              await StoreReview.requestReview();
            } else {
              const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/id000000000'
                : 'https://play.google.com/store/apps/details?id=com.sanyogconformity.app';
              Linking.openURL(url).catch(() =>
                Alert.alert('Coming Soon', 'App store listing will be available at launch.')
              );
            }
          }
        },
        { icon: 'information-circle-outline' as const, label: 'About', onPress: () => navigation.navigate('About') },
      ],
    },
  ];

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleVaultAuth = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biometrics Unavailable',
          'Biometrics are not set up on this device. Would you like to proceed with your device passcode?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use Passcode', onPress: () => navigation.navigate('Vault') }
          ]
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to open Vault',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        navigation.navigate('Vault');
      }
    } catch (e) {
      console.warn('Biometric error:', e);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile Hero */}
        <LinearGradient
          colors={['rgba(108,99,255,0.25)', 'rgba(0,212,255,0.12)']}
          style={[styles.profileHero, Platform.OS === 'ios' ? Shadows.lg : {}]}
        >
          <Avatar name={user?.name ?? 'User'} uri={user?.avatar} size="xl" online />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'user@example.com'}</Text>
            <Text style={styles.profilePhone}>{user?.phone ?? '+91 99999 99999'}</Text>
            <View style={styles.profileMeta}>
              <Badge
                label={user?.subscription?.toUpperCase() ?? 'FREE'}
                variant={user?.subscription === 'pro' ? 'primary' : 'default'}
                size="sm"
              />
              <Badge label={(userType || user?.role || 'User').toUpperCase()} variant="info" size="sm" />
            </View>
          </View>
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="pencil" size={16} color={isDark ? "#fff" : colors.textSecondary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Profile completion — server-computed, links to the company profile editor */}
        {typeof user?.profileCompletion === 'number' && user.profileCompletion < 100 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('CompanyProfile')}
            activeOpacity={0.85}
            style={{
              backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                Profile {user.profileCompletion}% complete
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, overflow: 'hidden' }}>
              <View style={{ height: 8, borderRadius: 4, width: `${user.profileCompletion}%`, backgroundColor: colors.primary }} />
            </View>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              Add company & compliance details to speed up applications.
            </Text>
          </TouchableOpacity>
        )}

        {/* Company Card */}
        {user?.companyName && (
          <View style={[styles.companyCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.companyCardInner}
            >
              <View style={styles.companyHeader}>
                <View style={styles.companyIcon}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.companyName}>{user.companyName}</Text>
                  {user.gstNumber && (
                    <Text style={styles.companyGst}>GST: {user.gstNumber}</Text>
                  )}
                </View>
              </View>
              {(user.address?.city || user.address?.state) && (
                <View style={styles.companyLocation}>
                  <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.companyLocationText}>{[user.address?.city, user.address?.state].filter(Boolean).join(', ')}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Applications', value: user?.applicationsCount ?? 0, icon: 'document-text' as const, color: colors.primary },
            { label: 'Certifications', value: user?.certificationsCount ?? 0, icon: 'shield-checkmark' as const, color: colors.success },
            { label: 'Insights Read', value: user?.insightsRead ?? 0, icon: 'bulb' as const, color: colors.secondary },
          ].map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, sIdx) => (
          <View key={sIdx} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
                style={styles.menuCardInner}
              >
                {section.items.map((item: any, iIdx) => (
                  <View key={iIdx}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={item.onPress}
                      activeOpacity={item.onPress ? 0.7 : 1}
                    >
                      <View style={styles.menuIconWrapper}>
                        <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      {item.toggle !== undefined ? (
                        <Switch
                          value={item.toggle}
                          onValueChange={item.onToggle}
                          trackColor={{ false: colors.border, true: colors.primary + '80' }}
                          thumbColor={item.toggle ? colors.primary : colors.textTertiary}
                          ios_backgroundColor={colors.border}
                        />
                      ) : item.value ? (
                        <Text style={styles.menuValue}>{item.value}</Text>
                      ) : item.onPress ? (
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      ) : null}
                    </TouchableOpacity>
                    {iIdx < section.items.length - 1 && <View style={styles.menuDivider} />}
                  </View>
                ))}
              </LinearGradient>
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, Platform.OS === 'ios' ? Shadows.sm : {}]} onPress={handleLogout}>
          <LinearGradient
            colors={['rgba(255,71,87,0.12)', 'rgba(255,71,87,0.06)']}
            style={styles.logoutBtnInner}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.versionText}>Sanyog Conformity Solutions v1.0.0</Text>
        <Text style={styles.versionText}>ISO27001 Certified</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    menuBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    headerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    settingsBtn: { padding: 8 },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    profileHero: {
      borderRadius: BorderRadius.xl,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(108,99,255,0.2)',
      position: 'relative',
    },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : colors.textPrimary },
    profileEmail: { fontSize: 12, color: isDark ? 'rgba(255,255,255,0.7)' : colors.textSecondary, marginTop: 2 },
    profilePhone: { fontSize: 12, color: isDark ? 'rgba(255,255,255,0.55)' : colors.textTertiary, marginTop: 1 },
    profileMeta: { flexDirection: 'row', gap: 8, marginTop: 8 },
    editProfileBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    companyCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    companyCardInner: { padding: 14 },
    companyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    companyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    companyName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    companyGst: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    companyLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    companyLocationText: { fontSize: 12, color: colors.textSecondary },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statItem: {
      flex: 1,
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      borderRadius: BorderRadius.lg,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      ...Shadows.sm,
    },
    statValue: { fontSize: 20, fontWeight: '800', marginTop: 8 },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },
    menuSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingHorizontal: 16 },
    menuCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
    menuCardInner: { },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuDivider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', marginLeft: 50 },
    menuIconWrapper: { width: 30, height: 30, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.textPrimary },
    menuValue: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    logoutBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 8, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)' },
    logoutBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
    logoutText: { fontSize: 15, fontWeight: '700' },
    versionText: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, letterSpacing: 1, marginBottom: 4 },
  });

export default ProfileScreen;
