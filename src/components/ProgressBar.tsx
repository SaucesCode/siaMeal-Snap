import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, radius } from '../theme';

interface ProgressBarProps {
  /** 0–1. */
  fraction: number;
  fill: string;
  track: string;
  height?: number;
  durationMs?: number;
}

const ease = Easing.bezier(...motion.easeOut);

/** A rounded bar that grows from the left when its value changes (scaleX only, so no layout work). */
export function ProgressBar({ fraction, fill, track, height = 8, durationMs = motion.slow }: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const target = Math.max(0, Math.min(1, fraction));
  const scale = useSharedValue(target);

  useEffect(() => {
    scale.set(withTiming(target, { duration: reduceMotion ? 0 : durationMs, easing: ease }));
  }, [target, reduceMotion, durationMs, scale]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.get() }] }));

  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: fill }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    transformOrigin: 'left',
  },
});
