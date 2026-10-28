import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { SiaVectorCat } from './SiaVectorCat';

export interface SiaWalkingLoaderProps {
  /** Primary status message displayed below Sia */
  label?: string;
  /** Optional secondary subtext */
  sublabel?: string;
  /** Diameter of the walking mascot in pixels. Default: 112 */
  size?: number;
  /** Duration in ms to walk from Point A to Point B. Default: 2150 */
  traverseDuration?: number;
  /** Walk once from Point A to Point B (for startup launch) or repeat */
  oneShot?: boolean;
  /** Compact inline mode for chat bubbles or small cards */
  compact?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

function PawPrintIcon({ size = 14, color = '#10b981' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={color}>
        <Circle cx="12" cy="15" r="4.5" />
        <Circle cx="6.5" cy="9.5" r="2.2" />
        <Circle cx="10.2" cy="7" r="2.2" />
        <Circle cx="14.5" cy="7" r="2.2" />
        <Circle cx="17.8" cy="9.5" r="2.2" />
      </G>
    </Svg>
  );
}

const RUNWAY_HALF_SPAN = 92; // Point A (-92) to Point B (+92) = 184px smooth travel

/**
 * Smoothly interpolates footstep paw print opacity & scale as Sia walks past threshold `t0`.
 */
function computeFootstepStyle(progress: number, t0: number, offsetY: number) {
  'worklet';
  const entryWindow = 0.08;
  const raw = (progress - t0) / entryWindow;
  const reveal = Math.max(0, Math.min(1, raw));
  const trailFade = progress > t0 + entryWindow
    ? Math.max(0.32, 1 - (progress - (t0 + entryWindow)) * 0.65)
    : reveal;
  const opacity = 0.06 + trailFade * 0.88;
  const scale = 0.68 + reveal * 0.36;

  return {
    opacity,
    transform: [
      { rotate: '78deg' },
      { translateY: offsetY },
      { scale },
    ],
  };
}

/**
 * SiaWalkingLoader - Sia walks smoothly from Point A (left) to Point B (right),
 * leaving a trail of glowing emerald paw prints in her footsteps with zero progress bar.
 */
export function SiaWalkingLoader({
  label = 'Sia is on the prowl...',
  sublabel,
  size = 112,
  traverseDuration = 2150,
  oneShot = false,
  compact = false,
  style,
}: SiaWalkingLoaderProps) {
  const reducedMotion = useReducedMotion();

  // Normalized walk progress from 0 (Point A) to 1 (Point B)
  const walkProgress = useSharedValue(reducedMotion ? 0.5 : 0);

  useEffect(() => {
    cancelAnimation(walkProgress);

    if (reducedMotion) {
      walkProgress.set(0.5);
      return;
    }

    walkProgress.set(0);

    // Steady stride-matched pace with soft start & arrival so paws never slide
    const steadyWalkCurve = Easing.bezier(0.22, 0.14, 0.78, 0.86);

    if (oneShot) {
      walkProgress.set(
        withTiming(1, {
          duration: traverseDuration,
          easing: steadyWalkCurve,
        })
      );
    } else {
      walkProgress.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: traverseDuration, easing: steadyWalkCurve }),
            withTiming(0, { duration: 0 })
          ),
          -1,
          false
        )
      );
    }

    return () => {
      cancelAnimation(walkProgress);
    };
  }, [reducedMotion, oneShot, traverseDuration]);

  // Sia's horizontal traversal from Point A (-92) to Point B (+92)
  const catTraverseStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const x = -RUNWAY_HALF_SPAN + p * (RUNWAY_HALF_SPAN * 2);
    return {
      transform: [{ translateX: x }],
    };
  });

  // Compact mode for chat bubble thinking indicator
  const compactTraverseStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const x = -14 + p * 28;
    return {
      transform: [{ translateX: x }],
    };
  });

  // Smoothly revealed footstep paw prints along the runway
  const pawStep0 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.08, 3));
  const pawStep1 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.23, -3));
  const pawStep2 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.38, 3));
  const pawStep3 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.53, -3));
  const pawStep4 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.68, 3));
  const pawStep5 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.83, -3));

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactRunway}>
          <Animated.View style={compactTraverseStyle}>
            <SiaVectorCat size={size} mood="walking" animation="walk" withGlow={true} />
          </Animated.View>
        </View>
        <View style={styles.compactTextWrap}>
          {!!label && <Text style={styles.compactLabel}>{label}</Text>}
          <View style={styles.pawRow}>
            <Animated.View style={pawStep1}>
              <PawPrintIcon size={11} />
            </Animated.View>
            <Animated.View style={pawStep3}>
              <PawPrintIcon size={11} />
            </Animated.View>
            <Animated.View style={pawStep5}>
              <PawPrintIcon size={11} />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Point A -> Point B Runway Stage */}
      <View style={[styles.runwayStage, { height: size + 16 }]}>
        {/* Footstep Paw Print Trail Along the Ground Between Point A & Point B */}
        <View style={styles.footstepTrack}>
          <Animated.View style={pawStep0}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={pawStep1}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={pawStep2}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={pawStep3}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={pawStep4}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={pawStep5}>
            <PawPrintIcon size={14} />
          </Animated.View>
        </View>

        {/* Sia Physically Walking from Point A (Left) to Point B (Right) */}
        <Animated.View style={catTraverseStyle}>
          <SiaVectorCat size={size} mood="walking" animation="walk" withGlow={true} />
        </Animated.View>
      </View>

      {!!label && <Text style={styles.label}>{label}</Text>}
      {!!sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

export default SiaWalkingLoader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  runwayStage: {
    width: 268,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  footstepTrack: {
    position: 'absolute',
    bottom: 12,
    width: 204,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sublabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  compactRunway: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTextWrap: {
    flexDirection: 'column',
    gap: 4,
  },
  compactLabel: {
    color: '#e4e4e7',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  pawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
