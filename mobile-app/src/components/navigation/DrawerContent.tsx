import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Typography, BorderRadius } from '../../theme';
import Avatar from '../common/Avatar';
import { useAuthStore } from '../../store/authStore';

interface DrawerMenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  badge?: string;
  params?: any;
}

const MENU_ITEMS: DrawerMenuItem[] = [
  { label: 'Dashboard', icon: 'home-outline', screen: 'MainTabs' },
  { label: 'My Applications', icon: 'document-text-outline', screen: 'Applications' },
  { label: 'AI Insights', icon: 'bulb-outline', screen: 'MainTabs', params: { screen: 'Insights' } },
  { label: 'Vault', icon: 'lock-closed-outline', screen: 'Profile', params: { screen: 'Vault' } },
  { label: 'Market Access', icon: 'globe-outline', screen: 'MarketAccess' },
  { label: 'Shipment Tracking', icon: 'boat-outline', screen: 'Shipment' },
  { label: 'Payments', icon: 'card-outline', screen: 'Payments' },
  { label: 'Dice AI', icon: 'sparkles-outline', screen: 'MainTabs', params: { screen: 'Home', params: { screen: 'AISearch' } } },
];

const BOTTOM_ITEMS = [
  { label: 'Help & Support', icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap, screen: 'Profile', params: { screen: 'SupportCenter' } },
];

const DrawerContent: React.FC<DrawerContentComponentProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleNavigation = async (item: DrawerMenuItem) => {
    if (item.screen === 'Profile' && item.params?.screen === 'Vault') {
      const openVault = () => {
        navigation.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'Vault' },
        });
      };

      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometrics Unavailable',
            'Biometrics are not set up on this device. Would you like to proceed with your device passcode?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use Passcode', onPress: openVault }
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
          openVault();
        }
      } catch (e) {
        console.warn('Biometric error:', e);
      }
    } else if (item.screen === 'Profile' && item.params?.screen === 'SupportCenter') {
      navigation.navigate('MainTabs', {
        screen: 'Profile',
        params: { screen: 'SupportCenter' },
      });
    } else {
      item.params ? navigation.navigate(item.screen, item.params) : navigation.navigate(item.screen);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgCard, colors.bgDark] : ['#FFFFFF', '#F0F2F8']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary + '30', 'transparent']}
          style={styles.headerGradient}
        />
        <Avatar name={user?.name ?? 'User'} uri={user?.avatar} size="lg" online />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name ?? 'Welcome'}</Text>
          <Text style={styles.userCompany}>{user?.companyName ?? 'Sanyog Conformity'}</Text>
          <View style={styles.subscriptionBadge}>
            <Ionicons name="star" size={10} color={colors.warning} />
            <Text style={styles.subscriptionText}>
              {user?.subscription?.toUpperCase() ?? 'FREE'} PLAN
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Menu Items */}
      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleNavigation(item)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrapper}>
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.divider} />
        {BOTTOM_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleNavigation(item)}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconWrapper}>
              <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.menuItem, styles.logoutItem]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrapper, styles.logoutIcon]}>
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </View>
          <Text style={[styles.menuLabel, styles.logoutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    },
    header: {
      padding: 20,
      paddingTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    headerGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    userInfo: {
      marginLeft: 14,
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    userCompany: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    subscriptionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
      backgroundColor: 'rgba(255,179,71,0.15)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
      alignSelf: 'flex-start',
    },
    subscriptionText: {
      fontSize: 9,
      color: colors.warning,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginHorizontal: 16,
      marginVertical: 8,
    },
    menuScroll: {
      flex: 1,
    },
    menuContent: {
      paddingHorizontal: 12,
      paddingTop: 4,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: BorderRadius.md,
      marginBottom: 2,
    },
    menuIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    menuLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    badgeText: {
      fontSize: 10,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    bottomSection: {
      paddingHorizontal: 12,
    },
    logoutItem: {
      marginTop: 4,
    },
    logoutIcon: {
      backgroundColor: 'rgba(255,71,87,0.1)',
    },
    logoutText: {
      color: colors.error,
    },
  });

export default DrawerContent;
