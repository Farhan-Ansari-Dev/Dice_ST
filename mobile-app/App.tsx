import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useCallback } from 'react';
import { StatusBar, LogBox, Alert, AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import notificationsService from './src/services/notificationsService';
import { handleNotificationResponse } from './src/services/notificationRouter';
import { APP_VERSION } from './src/utils/constants';
import { useNotificationStore } from './src/store/notificationStore';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider, loadPersistedTheme, useTheme } from './src/theme';
import OfflineBanner from './src/components/common/OfflineBanner';
import { ToastProvider } from './src/components/common/ToastProvider';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { AiConsentProvider } from './src/components/ai/AiConsentProvider';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={isDark ? '#0A0B0F' : '#F0F2F8'}
    />
  );
}

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

// Configure notifications (guarded for Expo Go compatibility)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  // expo-notifications not fully supported in Expo Go (SDK 53+)
}

// Suppress harmless warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Warning: React.jsx: type is invalid',
  'Overwriting fontFamily style attribute preprocessor',
  'expo-notifications',
  'runtime not ready',
]);

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

export default function App() {
  const { addNotification, setPushToken } = useNotificationStore();
  const { loadStoredAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    hideSplash();
    loadPersistedTheme();
    loadStoredAuth();

    // Android channels are created at startup (idempotent + inert until a push
    // actually arrives). Their IDs must match the backend SNS/FCM payload's
    // channel_id. Safe to run regardless of the push feature flag.
    setupNotificationChannels();
  }, []);

  // Notification authorization is requested ONLY AFTER successful authentication
  // (Apple Guideline 2.1 — never on the unauthenticated launch screen). Keying
  // this effect on isAuthenticated means a fresh install shows NO prompt at
  // launch; the system prompt appears right after a successful sign-in.
  // registerForPushNotifications() calls getPermissionsAsync first, so iOS is
  // asked at most once (the OS suppresses re-prompts after the user decides),
  // and a denial is non-fatal — the app continues normally. This is independent
  // of `enable_push_notifications`, which remains a backend send-side toggle
  // only. registerDevice is idempotent (upsert by token), so the AppState
  // re-registration cannot create duplicate endpoints.
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanups: Array<() => void> = [];

    // Foreground display + tap → centralized navigation.
    cleanups.push(setupNotificationListeners());

    // Native push token rotation → re-register with the new token.
    const tokenSub = Notifications.addPushTokenListener((t) => {
      registerDeviceToken(String(t.data), t.type === 'ios' ? 'ios' : 'android');
    });
    cleanups.push(() => tokenSub.remove());

    // Killed/cold-start: app launched by tapping a notification.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (response) handleNotificationResponse(response); })
      .catch(() => {});

    // Register shortly after open, and again whenever the app returns to fg
    // (covers login, token rotation and permission changes). Registration is
    // deduped by token in notificationsService.
    const timer = setTimeout(() => { registerForPushNotifications(); }, 3000);
    cleanups.push(() => clearTimeout(timer));

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') registerForPushNotifications();
    });
    cleanups.push(() => appStateSub.remove());

    return () => { cleanups.forEach((fn) => fn()); };
  }, [isAuthenticated]);

  const hideSplash = async () => {
    // Hide immediately — the JS SplashScreen component handles the animated branding
    await SplashScreen.hideAsync().catch(() => {});
  };

  const setupNotificationChannels = async () => {
    if (Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
      });
      await Notifications.setNotificationChannelAsync('compliance', {
        name: 'Compliance Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        lightColor: '#EF4444',
      });
      await Notifications.setNotificationChannelAsync('applications', {
        name: 'Application Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#6C63FF',
      });
    } catch {
      // expo-notifications not fully supported in Expo Go
    }
  };

  // Persist token locally and register the native token with the backend (→ SNS).
  const registerDeviceToken = async (token: string, platform: 'ios' | 'android') => {
    try {
      setPushToken(token);
      await notificationsService.registerPushToken(token, platform, APP_VERSION).catch(() => {});
    } catch {
      // best-effort — user may not be authenticated yet
    }
  };

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      // Native device push token — APNs on iOS, FCM on Android — for AWS SNS.
      // (Replaces getExpoPushTokenAsync / ExponentPushToken.)
      const tokenData = await Notifications.getDevicePushTokenAsync().catch((err) => {
        console.warn('[Push] getDevicePushTokenAsync failed:', err?.message ?? err);
        return null;
      });

      if (tokenData?.data) {
        await registerDeviceToken(
          String(tokenData.data),
          tokenData.type === 'ios' ? 'ios' : 'android'
        );
      }
    } catch (e) {
      // Notifications may not be available in simulator
    }
  };

  const setupNotificationListeners = (): (() => void) => {
    try {
      const subscription = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content;
        addNotification({
          id: notification.request.identifier,
          title: data.title ?? 'Notification',
          body: data.body ?? '',
          type: (data.data?.type as any) ?? 'system',
          isRead: false,
          data: data.data as Record<string, any>,
          createdAt: new Date().toISOString(),
        });
      });

      // Foreground + background tap → single centralized navigation handler.
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

      return () => {
        subscription.remove();
        responseSubscription.remove();
      };
    } catch (e) {
      // expo-notifications not fully supported in Expo Go
      return () => {};
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <OfflineBanner />
              <ErrorBoundary>
                <AiConsentProvider>
                  <RootNavigator />
                </AiConsentProvider>
              </ErrorBoundary>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
