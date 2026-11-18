import React, { useEffect } from 'react';
import { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE_OUT = Easing.bezier(0.2, 0.8, 0.2, 1);

interface AnimatedProgressRingProps {
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth: number;
  /** Fill fraction, 0–1. Values outside the range are clamped. */
  progress: number;
  durationMs?: number;
}

/**
 * SVG progress arc that sweeps from 12 o'clock. The sweep runs on the UI thread
 * (Reanimated animated props), so it stays smooth while screens load data, and it
 * follows the system reduce-motion setting.
 */
export function AnimatedProgressRing({
  cx,
  cy,
  r,
  stroke,
  strokeWidth,
  progress,
  durationMs = 900,
}: AnimatedProgressRingProps) {
  const circumference = 2 * Math.PI * r;
  const fraction = useSharedValue(0);

  useEffect(() => {
    const target = Math.min(1, Math.max(0, progress || 0));
    fraction.set(withTiming(target, { duration: durationMs, easing: EASE_OUT }));
  }, [progress, durationMs, fraction]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fraction.get()),
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={`${circumference} ${circumference}`}
      strokeLinecap="round"
      fill="transparent"
      rotation="-90"
      origin={`${cx}, ${cy}`}
      animatedProps={animatedProps}
    />
  );
}
