import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SiaVectorCat } from './SiaVectorCat';
import { SiaWalkingLoader } from './SiaWalkingLoader';

export type SiaLoaderMode = 'scan' | 'chef' | 'coach' | 'water' | 'walk';

export interface SiaContextualLoaderProps {
  /** The contextual mode: 'scan' (food/camera), 'chef' (recipe/text), 'coach' (AI chat), 'water' (hydration), or 'walk' (startup) */
  mode?: SiaLoaderMode;
  /** Primary status message */
  label?: string;
  /** Secondary subtitle message */
  sublabel?: string;
  /** Diameter of the mascot. Default: 104 */
  size?: number;
  /** Compact inline mode for modals or chat bubbles */
  compact?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

const SCAN_TELEMETRY = [
  { icon: 'camera-iris', text: 'TARGET LOCKED', color: '#10b981' },
  { icon: 'scale', text: 'ESTIMATING PORTIONS', color: '#34d399' },
  { icon: 'chart-pie', text: 'CALCULATING MACROS', color: '#38bdf8' },
];

const CHEF_TELEMETRY = [
  { icon: 'silverware-fork-knife', text: 'CHEF SIA PREP', color: '#f59e0b' },
  { icon: 'book-open-variant', text: 'PARSING INGREDIENTS', color: '#10b981' },
  { icon: 'scale-balance', text: 'BALANCING MACRO SPLIT', color: '#c084fc' },
];

const COACH_TELEMETRY = [
  { icon: 'brain', text: 'ANALYZING YOUR GOALS', color: '#10b981' },
  { icon: 'leaf', text: 'FORMULATING ADVICE', color: '#34d399' },
  { icon: 'paw', text: 'CONSULTING MACRO DATA', color: '#38bdf8' },
];

const WATER_TELEMETRY = [
  { icon: 'water', text: 'HYDRATION CHECK', color: '#06b6d4' },
  { icon: 'cup-water', text: 'CALIBRATING FLUID PACE', color: '#38bdf8' },
  { icon: 'trophy', text: 'RECOVERY ENHANCED', color: '#10b981' },
];

export function SiaContextualLoader({
  mode = 'scan',
  label,
  sublabel,
  size = 104,
  compact = false,
  style,
}: SiaContextualLoaderProps) {
  const reducedMotion = useReducedMotion();

  // If walking mode is explicitly requested, delegate to SiaWalkingLoader
  if (mode === 'walk') {
    return (
      <SiaWalkingLoader
        label={label || 'Sia is on the prowl...'}
        sublabel={sublabel}
        size={size}
        compact={compact}
        style={style}
      />
    );
  }

  // 1. Cycling Telemetry Pill Index
  const [telemetryIdx, setTelemetryIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryIdx((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // 2. Scan Mode: Laser Beam Sweep (0 to 1)
  const laserProgress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion || mode !== 'scan') return;
    laserProgress.set(0);
    laserProgress.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      )
    );
    return () => cancelAnimation(laserProgress);
  }, [reducedMotion, mode]);

  const laserStyle = useAnimatedStyle(() => {
    const scanHeight = size + 20;
    return {
      transform: [{ translateY: laserProgress.get() * scanHeight }],
    };
  });

  // 3. Water Mode: Concentric Ripple Scale (0.6 to 1.3)
  const rippleProgress = useSharedValue(0.5);

  useEffect(() => {
    if (reducedMotion || mode !== 'water') return;
    rippleProgress.set(0.6);
    rippleProgress.set(
      withRepeat(
        withSequence(
          withTiming(1.25, { duration: 1200, easing: Easing.out(Easing.cubic) }),
          withTiming(0.6, { duration: 1200, easing: Easing.in(Easing.cubic) })
        ),
        -1,
        true
      )
    );
    return () => cancelAnimation(rippleProgress);
  }, [reducedMotion, mode]);

  const rippleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleProgress.get() }],
      opacity: 0.85 - (rippleProgress.get() - 0.6) * 0.9,
    };
  });

  // Pick mood and telemetry
  const { catMood, defaultLabel, defaultSub, telemetryList } = React.useMemo(() => {
    switch (mode) {
      case 'scan':
        return {
          catMood: 'scanner' as const,
          defaultLabel: 'Sia is analyzing your food photo...',
          defaultSub: "Aperture vision eye calculating calories & macros",
          telemetryList: SCAN_TELEMETRY,
        };
      case 'chef':
        return {
          catMood: 'chef' as const,
          defaultLabel: 'Chef Sia is evaluating your recipe...',
          defaultSub: 'Matching natural ingredients to verified macros',
          telemetryList: CHEF_TELEMETRY,
        };
      case 'coach':
        return {
          catMood: 'logo' as const,
          defaultLabel: 'Sia is crafting your nutrition advice...',
          defaultSub: 'Balancing guidance with your daily targets',
          telemetryList: COACH_TELEMETRY,
        };
      case 'water':
        return {
          catMood: 'water' as const,
          defaultLabel: 'Hydration registered!',
          defaultSub: 'Synchronizing fluid pace and cellular recovery',
          telemetryList: WATER_TELEMETRY,
        };
      default:
        return {
          catMood: 'scanner' as const,
          defaultLabel: 'Sia is analyzing...',
          defaultSub: 'Calibrating nutrition intelligence',
          telemetryList: SCAN_TELEMETRY,
        };
    }
  }, [mode]);

  const activeTelemetry = telemetryList[telemetryIdx % telemetryList.length];

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <SiaVectorCat size={Math.min(size, 48)} mood={catMood} />
        <View style={styles.compactTextWrap}>
          <Text style={styles.compactLabel}>{label || defaultLabel}</Text>
          <Text style={styles.compactSub}>{sublabel || defaultSub}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Visual Arena / Viewfinder Frame */}
      <View style={[styles.viewfinderStage, { width: size + 40, height: size + 28 }]}>
        {/* Mode: SCAN -> 4 Optical Corner Viewfinder Brackets */}
        {mode === 'scan' && (
          <>
            <View style={[styles.bracket, styles.bracketTL]} />
            <View style={[styles.bracket, styles.bracketTR]} />
            <View style={[styles.bracket, styles.bracketBL]} />
            <View style={[styles.bracket, styles.bracketBR]} />

            {/* Sweeping Laser Scan Line */}
            <Animated.View style={[styles.laserBeam, { width: size + 24 }, laserStyle]}>
              <View style={styles.laserCore} />
            </Animated.View>
          </>
        )}

        {/* Mode: WATER -> Animated Concentric Aqua Ripples */}
        {mode === 'water' && (
          <Animated.View style={[styles.waterRipple, rippleStyle]} />
        )}

        {/* Mode: CHEF -> Floating Ingredient Chips */}
        {mode === 'chef' && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={[styles.floatingChip, { top: 2, left: 2 }]}>
              <Text style={styles.chipText}>Protein</Text>
            </View>
            <View style={[styles.floatingChip, { top: 2, right: 2 }]}>
              <Text style={styles.chipText}>Healthy Fat</Text>
            </View>
            <View style={[styles.floatingChip, { bottom: 2, right: 10 }]}>
              <Text style={styles.chipText}>Clean Carbs</Text>
            </View>
          </View>
        )}

        {/* Center Mascot (Plays Native 60fps Lottie) */}
        <SiaVectorCat size={size} mood={catMood} withGlow={mode === 'scan' || mode === 'water'} />
      </View>

      {/* Dynamic Telemetry Status Pill */}
      <View style={styles.telemetryPill}>
        <MaterialCommunityIcons
          name={activeTelemetry.icon as any}
          size={12}
          color={activeTelemetry.color}
        />
        <Text style={[styles.telemetryText, { color: activeTelemetry.color }]}>
          {activeTelemetry.text}
        </Text>
      </View>

      {/* Main Status Text */}
      <Text style={styles.titleText}>
        {label || defaultLabel}
      </Text>

      {/* Secondary Helper Text */}
      <Text style={styles.subText}>
        {sublabel || defaultSub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  viewfinderStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  // Optical Viewfinder Corner Brackets for Scanner Mode
  bracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#10b981',
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 2.2,
    borderLeftWidth: 2.2,
    borderTopLeftRadius: 4,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 2.2,
    borderRightWidth: 2.2,
    borderTopRightRadius: 4,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2.2,
    borderLeftWidth: 2.2,
    borderBottomLeftRadius: 4,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2.2,
    borderRightWidth: 2.2,
    borderBottomRightRadius: 4,
  },
  // Sweeping Laser Scan Line
  laserBeam: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  laserCore: {
    width: '100%',
    height: 2,
    backgroundColor: '#34d399',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 8,
  },
  // Water Ripple Rings
  waterRipple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  // Floating Culinary Chips
  floatingChip: {
    position: 'absolute',
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '700',
  },
  // Telemetry HUD Pill
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(9, 9, 11, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 8,
  },
  telemetryText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Typography
  titleText: {
    fontFamily: 'Outfit_800ExtraBold',
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  subText: {
    color: '#a1a1aa',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  // Compact Mode Styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactTextWrap: {
    flex: 1,
  },
  compactLabel: {
    fontFamily: 'Outfit_700Bold',
    color: '#ffffff',
    fontSize: 12,
  },
  compactSub: {
    color: '#a1a1aa',
    fontSize: 10,
    marginTop: 1,
  },
});
