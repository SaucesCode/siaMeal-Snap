import '../global.css';
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { useCoachStore } from '../stores/coachStore';
import { useMealStore, selectTodayMeals } from '../stores/mealStore';
import { buildCoachContext } from '../utils/coachContext';
import { LaunchWink } from '../components/sia/LaunchWink';
import { AiNutritionCoachModal } from '../components/AiNutritionCoachModal';

WebBrowser.maybeCompleteAuthSession();
import { initSyncQueue } from '../lib/syncQueue';
import {
  useFonts,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { LogBox } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

// Suppress false-positive dev warnings during touch swiping & upstream Expo Router useLinking race condition
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isInitialized, initialize, profile, user } = useAuthStore(
    useShallow((s) => ({ isInitialized: s.isInitialized, initialize: s.initialize, profile: s.profile, user: s.user }))
  );
  const todayMeals = useMealStore(selectTodayMeals);
  const { isOpen: coachIsOpen, initialQuery: coachInitialQuery, closeCoach } = useCoachStore(
    useShallow((s) => ({ isOpen: s.isOpen, initialQuery: s.initialQuery, closeCoach: s.closeCoach }))
  );

  const coachUserContext = React.useMemo(
    () => buildCoachContext(profile, user?.email, todayMeals),
    [profile, user?.email, todayMeals]
  );

  const [fontsLoaded] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    initialize();
    return initSyncQueue();
  }, []);

  // The native splash stays up until fonts and the session are ready, so the first frame
  // the user sees is the real app; there is no artificial minimum launch delay.
  const appReady = isInitialized && fontsLoaded;

  // Once ready, LaunchWink covers the screen exactly like the native splash; the native splash
  // hides underneath it, then Sia winks as the overlay fades into the app.
  const [launchDone, setLaunchDone] = useState(false);
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch((err: unknown) => {
      console.warn('Failed to hide splash screen:', err);
    });
  }, []);
  const finishLaunch = useCallback(() => setLaunchDone(true), []);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {appReady && (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#09090b' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen
            name="review"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      )}

      {/* Global AI Nutrition Coach Modal */}
      {appReady && (
        <AiNutritionCoachModal
          visible={coachIsOpen}
          onClose={closeCoach}
          userContext={coachUserContext}
          initialQuery={coachInitialQuery}
        />
      )}

      {appReady && !launchDone && <LaunchWink onReady={hideNativeSplash} onDone={finishLaunch} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
  },
});
