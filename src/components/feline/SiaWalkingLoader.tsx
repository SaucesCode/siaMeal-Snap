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
  /** Duration in ms to walk from Point A to Point B. Default: 2100 */
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

const RUNWAY_HALF_SPAN = 88; // Point A (-88) to Point B (+88) = 176px travel

/**
 * SiaWalkingLoader - Sia walks smoothly from Point A (left) to Point B (right),
 * leaving a trail of glowing emerald paw prints in her footsteps with zero progress bar.
 */
export function SiaWalkingLoader({
  label = 'Sia is on the prowl...',
  sublabel,
  size = 112,
  traverseDuration = 2100,
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

    const smoothCurve = Easing.bezier(0.32, 0.08, 0.24, 1);

    if (oneShot) {
      walkProgress.set(
        withTiming(1, {
          duration: traverseDuration,
          easing: smoothCurve,
        })
      );
    } else {
      walkProgress.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: traverseDuration, easing: smoothCurve }),
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

  // Sia's horizontal traversal from Point A (-88) to Point B (+88)
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
    const x = -12 + p * 24;
    return {
      transform: [{ translateX: x }],
    };
  });

  // Footstep paw print reveal styles as Sia steps past each threshold (0.10 .. 0.82)
  const pawStep0 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.08;
    return {
      opacity: active ? Math.max(0.25, 1 - (p - 0.08) * 0.65) : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: 3 }, { scale: active ? 1 : 0.7 }],
    };
  });
  const pawStep1 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.24;
    return {
      opacity: active ? Math.max(0.3, 1 - (p - 0.24) * 0.65) : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: -3 }, { scale: active ? 1 : 0.7 }],
    };
  });
  const pawStep2 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.4;
    return {
      opacity: active ? Math.max(0.35, 1 - (p - 0.4) * 0.65) : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: 3 }, { scale: active ? 1 : 0.7 }],
    };
  });
  const pawStep3 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.56;
    return {
      opacity: active ? Math.max(0.45, 1 - (p - 0.56) * 0.6) : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: -3 }, { scale: active ? 1 : 0.7 }],
    };
  });
  const pawStep4 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.72;
    return {
      opacity: active ? Math.max(0.6, 1 - (p - 0.72) * 0.5) : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: 3 }, { scale: active ? 1 : 0.7 }],
    };
  });
  const pawStep5 = useAnimatedStyle(() => {
    const p = walkProgress.get();
    const active = p >= 0.88;
    return {
      opacity: active ? 0.95 : 0.06,
      transform: [{ rotate: '78deg' }, { translateY: -3 }, { scale: active ? 1.05 : 0.7 }],
    };
  });

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
    width: 260,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  footstepTrack: {
    position: 'absolute',
    bottom: 12,
    width: 196,
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
