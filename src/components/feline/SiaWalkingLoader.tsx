import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line } from 'react-native-svg';
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
  /** Diameter of the walking mascot in pixels. Default: 116 */
  size?: number;
  /** Duration in ms to walk from Point A to Point B. Default: 2300 */
  traverseDuration?: number;
  /** Walk once from Point A to Point B (for startup launch) or repeat seamlessly */
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

const RUNWAY_HALF_SPAN = 90; // Point A (-90) to Point B (+90) = 180px runway

/**
 * Computes stamped footstep paw print opacity & elastic scale pop as Sia steps over `t0`.
 */
function computeFootstepStyle(progress: number, t0: number, offsetY: number, oneShot: boolean) {
  'worklet';
  const stampWindow = 0.06;
  const delta = progress - t0;

  if (delta < 0) {
    return {
      opacity: 0.05,
      transform: [{ rotate: '78deg' }, { translateY: offsetY }, { scale: 0.55 }],
    };
  }

  // Elastic stamp pop right when Sia's paw hits `t0`
  const stampProgress = Math.min(1, delta / stampWindow);
  const popScale =
    stampProgress < 0.65
      ? 0.55 + (stampProgress / 0.65) * 0.62
      : 1.17 - ((stampProgress - 0.65) / 0.35) * 0.17;

  // Gently fade trail behind Sia, and fade out cleanly at the end of a repeating pass
  const wakeFade = Math.max(0.28, 1 - Math.max(0, delta - stampWindow) * 0.72);
  const endPassFade = !oneShot && progress > 0.88 ? Math.max(0, 1 - (progress - 0.88) / 0.12) : 1;
  const opacity = (0.08 + stampProgress * wakeFade * 0.88) * endPassFade;

  return {
    opacity,
    transform: [{ rotate: '78deg' }, { translateY: offsetY }, { scale: popScale }],
  };
}

/**
 * SiaWalkingLoader - Sia prowls smoothly from Point A (left) to Point B (right)
 * on a grounded emerald horizon track with a reactive footfall shadow, stamped
 * paw print trail, and zero-snap loop transitions.
 */
export function SiaWalkingLoader({
  label = 'Sia is on the prowl...',
  sublabel,
  size = 116,
  traverseDuration = 2300,
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

    // Steady stride-matched linear-ease curve so paw velocity matches horizontal ground speed
    const steadyStrideCurve = oneShot
      ? Easing.bezier(0.22, 0.12, 0.78, 0.92)
      : Easing.bezier(0.28, 0.18, 0.72, 0.82);

    if (oneShot) {
      walkProgress.set(
        withTiming(1, {
          duration: traverseDuration,
          easing: steadyStrideCurve,
        })
      );
    } else {
      walkProgress.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: traverseDuration, easing: steadyStrideCurve }),
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

  // Sia's horizontal traversal with smooth stage entry/exit so looping never snaps
  const catTraverseStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const x = -RUNWAY_HALF_SPAN + p * (RUNWAY_HALF_SPAN * 2);

    // Smooth entry fade-in (0.0 -> 0.10) & smooth exit fade-out on repeating loops (0.88 -> 1.0)
    const entryFade = Math.min(1, p / 0.1);
    const exitFade = oneShot ? 1 : p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
    const stageOpacity = reducedMotion ? 1 : Math.min(entryFade, exitFade);
    const stageScale = 0.94 + 0.06 * stageOpacity;

    return {
      opacity: stageOpacity,
      transform: [{ translateX: x }, { scale: stageScale }],
    };
  });

  // Reactive ground shadow directly beneath Sia's paws (pulses with 4 steps per traverse)
  const groundShadowStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const x = -RUNWAY_HALF_SPAN + p * (RUNWAY_HALF_SPAN * 2);
    const entryFade = Math.min(1, p / 0.1);
    const exitFade = oneShot ? 1 : p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
    const stageOpacity = reducedMotion ? 1 : Math.min(entryFade, exitFade);

    // 4 footfall compressions across the runway
    const stepWave = Math.cos(p * Math.PI * 8);
    const shadowScaleX = 1 + stepWave * 0.08;

    return {
      opacity: stageOpacity * (0.65 + stepWave * 0.15),
      transform: [{ translateX: x - 4 }, { scaleX: shadowScaleX }],
    };
  });

  // Pulsing telemetry indicator dot
  const pulseDotStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const pulse = (Math.sin(p * Math.PI * 6) + 1) * 0.5;
    return {
      opacity: 0.45 + pulse * 0.55,
      transform: [{ scale: 0.88 + pulse * 0.24 }],
    };
  });

  // Compact mode for chat bubble thinking indicator
  const compactTraverseStyle = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const x = -14 + p * 28;
    const entryFade = Math.min(1, p / 0.12);
    const exitFade = p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
    return {
      opacity: reducedMotion ? 1 : Math.min(entryFade, exitFade),
      transform: [{ translateX: x }],
    };
  });

  // 6 alternating left/right paw prints stamped along the ground track
  const pawStep0 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.11, 3, oneShot));
  const pawStep1 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.25, -3, oneShot));
  const pawStep2 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.39, 3, oneShot));
  const pawStep3 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.53, -3, oneShot));
  const pawStep4 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.67, 3, oneShot));
  const pawStep5 = useAnimatedStyle(() => computeFootstepStyle(walkProgress.get(), 0.81, -3, oneShot));

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactRunway}>
          <Animated.View style={compactTraverseStyle}>
            <SiaVectorCat size={size} mood="walking" animation="walk" />
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

  // Align ground track & footsteps with Sia's anatomical ground plane (y = 190 in 240x240 viewBox)
  const groundBottomOffset = Math.round(size * 0.17);
  const shadowWidth = Math.round(size * 0.48);

  return (
    <View style={[styles.container, style]}>
      {/* Point A -> Point B Grounded Runway Stage */}
      <View style={[styles.runwayStage, { height: size + 12 }]}>
        {/* Subtle Obsidian-Emerald Ground Horizon Line */}
        <View style={[styles.horizonTrackWrap, { bottom: groundBottomOffset }]}>
          <Svg width={224} height={6} viewBox="0 0 224 6">
            <Line
              x1="8"
              y1="3"
              x2="216"
              y2="3"
              stroke="#10b981"
              strokeOpacity="0.18"
              strokeWidth="1.5"
              strokeDasharray="4, 6"
              strokeLinecap="round"
            />
          </Svg>
        </View>

        {/* Stamped Emerald Paw Print Trail Along the Ground */}
        <View style={[styles.footstepTrack, { bottom: groundBottomOffset - 5 }]}>
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

        {/* Reactive Elliptical Ground Shadow Beneath Sia's Paws */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.groundShadowWrap,
            { bottom: groundBottomOffset - 4, width: shadowWidth },
            groundShadowStyle,
          ]}
        >
          <Svg width={shadowWidth} height={12} viewBox="0 0 60 12">
            <Ellipse cx="30" cy="6" rx="28" ry="4.5" fill="#10b981" fillOpacity="0.16" />
            <Ellipse cx="30" cy="6" rx="20" ry="3" fill="#000000" fillOpacity="0.55" />
          </Svg>
        </Animated.View>

        {/* Sia Physically Prowling from Point A (Left) to Point B (Right) */}
        <Animated.View style={catTraverseStyle}>
          <SiaVectorCat size={size} mood="walking" animation="walk" />
        </Animated.View>
      </View>

      {/* Telemetry Status Pill & Subtitle */}
      {!!label && (
        <View style={styles.statusPill}>
          <Animated.View style={[styles.statusDot, pulseDotStyle]} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      {!!sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

export default SiaWalkingLoader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  runwayStage: {
    width: 268,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  horizonTrackWrap: {
    position: 'absolute',
    width: 224,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footstepTrack: {
    position: 'absolute',
    width: 196,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groundShadowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.24)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sublabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    marginTop: 6,
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
