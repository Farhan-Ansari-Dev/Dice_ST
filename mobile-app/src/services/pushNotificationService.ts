import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert(
      'Notifications Disabled',
      'Enable notifications in Settings to get alerts for application updates, document expiry, and compliance deadlines.',
      [{ text: 'OK' }]
    );
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
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
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '1d04926d-1f47-4d73-b16e-3166301f0791',
    });
    return token.data;
  } catch (e) {
    console.log('Could not get push token:', e);
    return null;
  }
}

// Schedule a local notification (for testing / offline use)
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  secondsFromNow: number = 1
) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: secondsFromNow > 0 ? { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsFromNow } : null,
  });
}

// Schedule expiry reminder
export async function scheduleExpiryReminder(certName: string, daysLeft: number) {
  const messages: Record<number, string> = {
    30: `${certName} expires in 30 days. Start renewal now to avoid disruption.`,
    7:  `${certName} expires in 7 days. Immediate action required!`,
    1:  `${certName} expires TOMORROW. Contact your manager immediately.`,
  };
  const body = messages[daysLeft] ?? `${certName} requires attention.`;
  return scheduleLocalNotification('Certificate Expiry Alert 🔴', body, { type: 'expiry', cert: certName });
}

// Notification response handler — call from App.tsx
export function addNotificationResponseHandler(
  onNotification: (notification: any) => void,
  onResponse: (response: any) => void
) {
  const notifSub = Notifications.addNotificationReceivedListener(onNotification);
  const respSub  = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => {
    notifSub.remove();
    respSub.remove();
  };
}
