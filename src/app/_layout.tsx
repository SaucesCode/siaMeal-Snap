import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { useAuthStore } from '../stores/authStore';
import { useCoachStore } from '../stores/coachStore';
import { useMealStore } from '../stores/mealStore';
import { SiaWalkingLoader } from '../components/feline/SiaWalkingLoader';
import { SiaRoamingCompanion } from '../components/feline/SiaRoamingCompanion';
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

// Suppress false-positive dev warnings during touch swiping & upstream Expo Router useLinking race condition
configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

const WALK_DURATION_MS = 2150;

export default function RootLayout() {
  const { isInitialized, initialize, profile, user } = useAuthStore();
  const meals = useMealStore((state) => state.meals);
  const { isOpen: coachIsOpen, initialQuery: coachInitialQuery, closeCoach } = useCoachStore();

  const [minWalkDone, setMinWalkDone] = useState(false);
  const [launchHidden, setLaunchHidden] = useState(false);

  const overlayOpacity = useSharedValue(1);

  const coachUserContext = React.useMemo(() => {
    const consumedCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const consumedProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
    const consumedCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
    const consumedFat = meals.reduce((sum, m) => sum + (m.fat_g || 0), 0);

    const targetCalories = profile?.target_calories || 2000;
    const targetProtein = profile?.target_protein_g || 150;
    const targetCarbs = profile?.target_carbs_g || 200;
    const targetFat = profile?.target_fat_g || 65;

    return {
      displayName: profile?.full_name || user?.email?.split('@')[0] || 'Athlete',
      goal: profile?.goal_pace || 'Fat Loss / Maintenance',
      dietType: profile?.diet_type || 'Balanced',
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      consumedCalories: Math.round(consumedCalories),
      consumedProtein: Math.round(consumedProtein),
      consumedCarbs: Math.round(consumedCarbs),
      consumedFat: Math.round(consumedFat),
      remainingCalories: Math.max(0, Math.round(targetCalories - consumedCalories)),
      remainingProtein: Math.max(0, Math.round(targetProtein - consumedProtein)),
      remainingCarbs: Math.max(0, Math.round(targetCarbs - consumedCarbs)),
      remainingFat: Math.max(0, Math.round(targetFat - consumedFat)),
    };
  }, [profile, user, meals]);

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
    // Hide the static OS splash immediately so our Point A -> Point B walking mascot plays
    SplashScreen.hideAsync().catch(() => {});
    initialize();
    const cleanupSync = initSyncQueue();

    const timer = setTimeout(() => {
      setMinWalkDone(true);
    }, WALK_DURATION_MS);

    return () => {
      clearTimeout(timer);
      cleanupSync();
    };
  }, []);

  const appReady = isInitialized && fontsLoaded && minWalkDone;

  useEffect(() => {
    if (appReady && !launchHidden) {
      overlayOpacity.set(
        withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) })
      );
      const fadeTimer = setTimeout(() => {
        setLaunchHidden(true);
      }, 360);
      return () => clearTimeout(fadeTimer);
    }
  }, [appReady, launchHidden]);

  const launchFadeStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.get(),
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {isInitialized && fontsLoaded && (
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

      {/* Global Roaming Sia Mascot */}
      {appReady && launchHidden && (
        <SiaRoamingCompanion enabled={true} />
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

      {/* Point A -> Point B Walking Mascot App Startup Screen (No Loading Bar) */}
      {!launchHidden && (
        <Animated.View style={[styles.launchOverlay, launchFadeStyle]} pointerEvents="auto">
          <View style={styles.brandBadge}>
            <Text style={styles.brandTitle}>
              Sia<Text style={styles.brandAccent}>Meal</Text>
            </Text>
            <View style={styles.snapPill}>
              <Text style={styles.snapPillText}>AI VISION</Text>
            </View>
          </View>

          <SiaWalkingLoader
            size={128}
            traverseDuration={WALK_DURATION_MS}
            oneShot={true}
            label="Sia is on the prowl..."
            sublabel="Calibrating your daily macro intelligence"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  launchOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#09090b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    paddingHorizontal: 24,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: '#10b981',
  },
  snapPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  snapPillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
