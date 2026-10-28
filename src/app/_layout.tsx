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
import { SiaWalkingLoader } from '../components/feline/SiaWalkingLoader';

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

export default function RootLayout() {
  const { isInitialized, initialize } = useAuthStore();
  const [minWalkDone, setMinWalkDone] = useState(false);
  const [launchHidden, setLaunchHidden] = useState(false);

  const progressWidth = useSharedValue(8);
  const overlayOpacity = useSharedValue(1);

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
    // Hide the static OS splash immediately so our animated walking mascot launch screen plays
    SplashScreen.hideAsync().catch(() => {});
    initialize();
    const cleanupSync = initSyncQueue();

    // Animate the launch progress bar while Sia walks
    progressWidth.set(
      withTiming(100, {
        duration: 2100,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    const timer = setTimeout(() => {
      setMinWalkDone(true);
    }, 2200);

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

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.get()}%`,
  }));

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

      {/* Animated Walking Mascot App Startup Screen */}
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
            size={140}
            label="Sia is on the prowl..."
            sublabel="Calibrating your daily macro intelligence"
          />

          {/* Progress Track */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressFillStyle]} />
          </View>
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
    paddingHorizontal: 32,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
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
  progressTrack: {
    width: 180,
    height: 6,
    backgroundColor: '#18181b',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 999,
  },
});
