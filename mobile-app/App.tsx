import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useCallback } from 'react';
import { StatusBar, LogBox, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { useNotificationStore } from './src/store/notificationStore';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider, loadPersistedTheme, useTheme } from './src/theme';
import OfflineBanner from './src/components/common/OfflineBanner';
import { ToastProvider } from './src/components/common/ToastProvider';

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
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    hideSplash();
    loadPersistedTheme();
    loadStoredAuth();
    setupNotificationListeners();
    // Request push permission 3 seconds after app opens (gives user time to see the app first)
    const timer = setTimeout(() => {
      registerForPushNotifications();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const hideSplash = async () => {
    // Hide immediately — the JS SplashScreen component handles the animated branding
    await SplashScreen.hideAsync().catch(() => {});
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

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'sanyog-conformity-solutions',
      }).catch(() => null);

      if (tokenData?.data) {
        setPushToken(tokenData.data);
        // Register token with backend so server can send targeted pushes
        const { Platform } = await import('react-native');
        const notificationsService = (await import('./src/services/notificationsService')).default;
        await notificationsService.registerPushToken(
          tokenData.data,
          Platform.OS === 'ios' ? 'ios' : 'android'
        ).catch(() => {}); // silent fail — user may not be logged in yet
      }
    } catch (e) {
      // Notifications may not be available in simulator
    }
  };

  const setupNotificationListeners = () => {
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

      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, any>;
        if (data?.type === 'application' && data?.id) {
          // navigation handled by RootNavigator via linking config
        } else if (data?.type === 'expiry') {
          // Certificate expiry — navigate to RenewalCenter
        }
        console.log('[Notification tap]', data);
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
              <RootNavigator />
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
