import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCountUp } from '../hooks/useCountUp';
import { motion, palette, type } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** How long the ring and the number take to catch up after a meal is logged. */
export const RING_FILL_MS = 650;
const VIEW = 120;
const R = 50;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * R;
/** Six aperture-blade ticks across the ring, like Sia's shutter eye. */
const TICKS = [0, 60, 120, 180, 240, 300].map((deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  const [inner, outer] = [R - STROKE / 2 - 1, R + STROKE / 2 + 1];
  return { x1: 60 + inner * Math.cos(a), y1: 60 + inner * Math.sin(a), x2: 60 + outer * Math.cos(a), y2: 60 + outer * Math.sin(a) };
});
const nf = new Intl.NumberFormat('en-US');
const ease = Easing.bezier(...motion.easeOut);

interface CalorieEyeRingProps {
  eaten: number;
  target: number;
  /** 0–1. */
  fraction: number;
  over: boolean;
  size?: number;
  /** Review: how full the ring was before this meal; drawn as a muted arc under the green one. */
  baseFraction?: number;
  /** Replaces the eaten number in the centre (e.g. "+680"). */
  centerLabel?: string;
  /** Replaces "of 2,000" under it (e.g. "kcal"). */
  centerCaption?: string;
  /** Fill colour when not over (default: Sia's eye green). */
  color?: string;
}

/** Calories eaten inside a ring drawn like Sia's green shutter eye; turns amber when over target. */
export function CalorieEyeRing({ eaten, target, fraction, over, size = 120, baseFraction, centerLabel, centerCaption, color = palette.eye }: CalorieEyeRingProps) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(fraction);
  const shown = useCountUp(eaten, RING_FILL_MS);

  useEffect(() => {
    fill.set(withTiming(fraction, { duration: reduceMotion ? 0 : RING_FILL_MS, easing: ease }));
  }, [fraction, reduceMotion, fill]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - fill.get()) }));
  const base = baseFraction == null ? null : Math.max(0, Math.min(1, baseFraction));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Circle cx={60} cy={60} r={R} fill="none" stroke={palette.pointTrack} strokeWidth={STROKE} />
        <AnimatedCircle
          testID="calorie-eye-arc"
          cx={60}
          cy={60}
          r={R}
          fill="none"
          stroke={over ? palette.carbs : color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform="rotate(-90 60 60)"
          animatedProps={arcProps}
        />
        {/* What was already eaten sits on top of the green arc's start, so green reads as "this meal". */}
        {base != null && base > 0 &&
          // An opaque track-coloured arc first hides the green beneath; the faded arc on top reads as "earlier".
          [palette.pointTrack, palette.pointMuted].map((stroke, i) => (
            <Circle
              key={stroke}
              testID={i === 1 ? 'calorie-eye-base' : undefined}
              cx={60}
              cy={60}
              r={R}
              fill="none"
              stroke={stroke}
              strokeOpacity={i === 1 ? 0.6 : 1}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE * base} ${CIRCUMFERENCE}`}
              transform="rotate(-90 60 60)"
            />
          ))}
        {TICKS.map((t, i) => (
          <Line key={i} {...t} stroke={palette.point} strokeWidth={2.4} strokeOpacity={0.55} />
        ))}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.number}>{centerLabel ?? nf.format(shown)}</Text>
        <Text style={styles.of}>{centerCaption ?? `of ${nf.format(target)}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontFamily: type.display,
    fontSize: 28,
    lineHeight: 32,
    color: palette.pointText,
    fontVariant: ['tabular-nums'],
  },
  of: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.caption,
    color: palette.pointMuted,
    fontVariant: ['tabular-nums'],
  },
});
