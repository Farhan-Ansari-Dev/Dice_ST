import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import DrawerNavigator from './DrawerNavigator';
import BiometricUnlockScreen from '../screens/auth/BiometricUnlockScreen';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useConfigStore } from '../store/configStore';
import MaintenanceScreen from '../screens/common/MaintenanceScreen';
import notificationsService from '../services/notificationsService';

const Stack = createNativeStackNavigator();
// Total splash animation duration (spring 400ms + delay 120ms + fade 380ms + buffer 200ms)
const SPLASH_DURATION = 1250;

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isOnboardingDone, isUserTypeDone, isBiometricEnabled, isBiometricAuthenticated, loadStoredAuth } = useAuthStore();
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const { featureFlags, loadRemoteConfig } = useConfigStore();
  const systemScheme = useColorScheme();
  const cardBg = systemScheme === 'dark' ? '#0A0B0F' : '#FFFFFF';
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadStoredAuth();
    loadRemoteConfig(); // Load feature flags and dynamic config
    // Hide splash after animation completes
    const timer = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    notificationsService
      .getAll({ limit: 50 })
      .then((response) => {
        if (cancelled) return;

        const payload = response as any;
        const items = ((payload?.data?.data ?? payload?.data ?? []) as any[]).map((item: any) => ({
          id: String(item._id ?? item.id),
          title: item.title ?? 'Notification',
          body: item.body ?? '',
          type: item.type ?? 'system',
          isRead: Boolean(item.read_at),
          data: item.data ?? item.metadata ?? undefined,
          createdAt: item.created_at ?? new Date().toISOString(),
        }));

        setNotifications(items);
      })
      .catch((error) => {
        console.warn('[Notifications] Failed to sync inbox:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setNotifications]);

  // Show animated splash on every cold start
  if (showSplash) {
    return <SplashScreen />;
  }

  if (isLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  const initialAuthRoute = isOnboardingDone ? 'Login' : 'Onboarding';

  const linking = !isAuthenticated
    ? {
        prefixes: ['com.sanyogconformity.app://', 'com.sanyogconformity.app:/', 'https://www.sanyogconformity.com/app'],
        config: {
          screens: {
            Login: 'oauthredirect',
          },
        },
      }
    : undefined;

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cardBg } }}
      >
        {featureFlags.maintenance_mode ? (
          <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
        ) : isAuthenticated && isBiometricEnabled && !isBiometricAuthenticated ? (
          <Stack.Screen name="BiometricUnlock" component={BiometricUnlockScreen} />
        ) : isAuthenticated && !isUserTypeDone ? (
          <Stack.Screen name="UserType" component={UserTypeScreen} />
        ) : isAuthenticated ? (
          <Stack.Screen name="Main" component={DrawerNavigator} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
