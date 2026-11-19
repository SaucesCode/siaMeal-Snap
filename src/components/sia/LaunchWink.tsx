import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { palette } from '../../theme';
import { Sia } from './Sia';
import { SPLASH } from './siaArt';

/** The hand-off fade; it runs while the app is already usable underneath, so it adds no wait. */
export const LAUNCH_FADE_MS = 300;

const SIA_SIZE = (SPLASH.imageWidthDp * SPLASH.siaBox.size) / SPLASH.canvas;

interface LaunchWinkProps {
  /** Fired once the overlay is drawn, so the native splash can hide underneath it. */
  onReady: () => void;
  /** Fired when the fade has finished and the overlay can unmount. */
  onDone: () => void;
}

/**
 * Covers the screen exactly like the native splash (cream, Sia centred at the same size), then
 * Sia winks while it fades into the app. Under reduced motion it is a plain fade.
 */
export function LaunchWink({ onReady, onDone }: LaunchWinkProps) {
  const opacity = useSharedValue(1);
  const reported = useRef(false);

  useEffect(() => {
    opacity.set(withTiming(0, { duration: LAUNCH_FADE_MS, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(onDone, LAUNCH_FADE_MS);
    return () => clearTimeout(timer);
  }, [onDone, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      testID="launch-wink"
      pointerEvents="none"
      style={[styles.overlay, fadeStyle]}
      onLayout={() => {
        if (reported.current) return;
        reported.current = true;
        onReady();
      }}
    >
      <Sia expression="happy" size={SIA_SIZE} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
