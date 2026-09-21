import { isRunningInExpoGo } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_NOTIF_ENABLED = '@siameal_notifications_enabled';
const STORAGE_KEY_NOTIF_PROMPTED = '@siameal_notifications_prompted';

// In Expo Go on Android, expo-notifications throws a fatal error on module import
// because remote notifications were deprecated in Expo Go with SDK 53.
// We dynamically guard against loading it in Expo Go so the app runs smoothly in both
// Expo Go and standalone/development builds.
export const isExpoGo = typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false;

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (err) {
    console.warn('[NotificationService] expo-notifications unavailable in current runtime:', err);
    Notifications = null;
  }
}

export interface NotificationState {
  isSupported: boolean;
  hasPermission: boolean;
  isEnabled: boolean;
  hasBeenPrompted: boolean;
  isExpoGo: boolean;
}

export async function getNotificationStatus(): Promise<NotificationState> {
  if (isExpoGo || !Notifications || Platform.OS === 'web') {
    const storedPrompted = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_PROMPTED);
    return {
      isSupported: false,
      hasPermission: false,
      isEnabled: false,
      hasBeenPrompted: storedPrompted === 'true',
      isExpoGo,
    };
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    const hasPermission = status === 'granted';
    const storedEnabled = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_ENABLED);
    const storedPrompted = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_PROMPTED);

    return {
      isSupported: true,
      hasPermission,
      isEnabled: storedEnabled === 'true' && hasPermission,
      hasBeenPrompted: storedPrompted === 'true',
      isExpoGo: false,
    };
  } catch {
    return {
      isSupported: false,
      hasPermission: false,
      isEnabled: false,
      hasBeenPrompted: false,
      isExpoGo,
    };
  }
}

/**
 * Request notification permissions from user and toggle active reminder schedules.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo || !Notifications || Platform.OS === 'web') {
    return false;
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEY_NOTIF_PROMPTED, 'true');

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    if (granted) {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'true');
      await scheduleFelineDailyReminders();
    } else {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'false');
    }

    return granted;
  } catch (err) {
    console.warn('[NotificationService] Permission request failed:', err);
    return false;
  }
}

/**
 * Set user notification toggle (e.g. from Profile settings)
 */
export async function setNotificationsEnabled(enable: boolean): Promise<boolean> {
  if (isExpoGo || !Notifications || Platform.OS === 'web') {
    return false;
  }

  if (enable) {
    return await requestNotificationPermission();
  } else {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'false');
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Schedule smart feline reminders throughout the day:
 * 1. 13:30 - Hydration & Midday Catch check
 * 2. 19:30 - Evening Catch & Streak Shield
 */
export async function scheduleFelineDailyReminders(): Promise<void> {
  if (isExpoGo || !Notifications || Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Afternoon Hydration Pounce (Daily at 13:30)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Sia: Time to hydrate!',
        body: 'Keep your paws energized! Tap to log your water intake.',
        data: { screen: '/water' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 30,
      },
    });

    // 2. Evening Catch & Streak Protector (Daily at 19:30)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🐾 Sia: Protect your hunting streak!',
        body: "Don't let today's streak slip away. Snap your dinner or quick-log your catch.",
        data: { screen: '/(tabs)' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 19,
        minute: 30,
      },
    });
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule reminders:', err);
  }
}

/**
 * Send an immediate test notification or milestone achievement ping
 */
export async function sendFelineMilestoneNotification(title: string, body: string): Promise<void> {
  if (isExpoGo || !Notifications || Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('[NotificationService] Failed to send milestone notification:', err);
  }
}
