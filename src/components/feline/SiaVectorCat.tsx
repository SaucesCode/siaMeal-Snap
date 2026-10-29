import React, { useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import Svg, {
  G,
  Path,
  Circle,
  Ellipse,
  Polygon,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { hapticFeedback } from '../../utils/haptics';

const lottieChef = require('../../../assets/lottie/sia-chef.json') as AnimationObject;
const lottieSitting = require('../../../assets/lottie/sia-sitting.json') as AnimationObject;
const lottieScanner = require('../../../assets/lottie/sia-scanner.json') as AnimationObject;
const lottieWater = require('../../../assets/lottie/sia-water.json') as AnimationObject;
const lottieWalking = require('../../../assets/lottie/sia-walking.json') as AnimationObject;
const lottieLogo = require('../../../assets/lottie/sia-logo.json') as AnimationObject;

export type SiaVectorMood =
  | 'logo'
  | 'head'
  | 'coach'
  | 'idle'
  | 'sitting'
  | 'happy'
  | 'celebrating'
  | 'sleeping'
  | 'scanning'
  | 'scanner'
  | 'chef'
  | 'thinking'
  | 'water'
  | 'hydrated'
  | 'walking'
  | 'prowling'
  | 'running'
  | 'jumping'
  | 'yawning'
  | string;

export type SiaAnimationMode =
  | 'auto'
  | 'walk'
  | 'breathe'
  | 'scan'
  | 'celebrate'
  | 'water'
  | 'think'
  | 'none';

export interface SiaVectorCatProps {
  /** Pixel width & height of the mascot SVG */
  size?: number;
  /** Visual mascot scene ('chef' | 'scanner' | 'water' | 'walking' | 'sleeping' | 'celebrating' | 'logo') */
  mood?: SiaVectorMood;
  /** Explicit animation override ('auto' infers from mood) */
  animation?: SiaAnimationMode;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Legacy prop preserved for compatibility (background circle removed) */
  withGlow?: boolean;
  /** Enable interactive tap-to-pet squash & heart reaction */
  interactive?: boolean;
  /** Optional callback when mascot is tapped */
  onPress?: () => void;
  /** Incrementing counter to trigger an immediate smooth spring reaction */
  actionTrigger?: number;
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const TWO_PI = Math.PI * 2;
const MASTER_CYCLE_RAD = Math.PI * 12;

/**
 * UI-thread worklet that rotates a 240x240 SVG layer around an exact anatomical socket
 * (pivotX, pivotY) in viewBox coordinates, plus optional pixel translation (tx, ty).
 */
function pivotTransform(
  pivotX: number,
  pivotY: number,
  angleDeg: number,
  size: number,
  tx = 0,
  ty = 0
) {
  'worklet';
  const scale = size / 240;
  const px = (pivotX - 120) * scale;
  const py = (pivotY - 120) * scale;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;

  return [
    { translateX: tx + px - rx },
    { translateY: ty + py - ry },
    { rotate: `${angleDeg}deg` },
  ];
}

/**
 * Stationary 6-Blade Emerald Camera Aperture Eye SVG Group (Locked Inside Head SVG, Never Spins).
 */
function renderCameraShutterEye(cx: number, cy: number, r = 12.5) {
  const hexR = r * 0.46;
  const hX = Math.round(hexR * 0.866 * 10) / 10;
  const hY = Math.round(hexR * 0.5 * 10) / 10;
  const hexPoints = `${cx},${cy - hexR} ${cx + hX},${cy - hY} ${cx + hX},${cy + hY} ${cx},${cy + hexR} ${cx - hX},${cy + hY} ${cx - hX},${cy - hY}`;

  return (
    <G>
      <Circle cx={cx} cy={cy} r={r + 1.5} fill="#141F1A" />
      <Circle cx={cx} cy={cy} r={r} fill="#22E592" />
      <Circle cx={cx - r * 0.18} cy={cy - r * 0.18} r={r * 0.68} fill="#38F8A6" opacity={0.45} />
      <Polygon points={hexPoints} fill="#141F1A" />
      <Line x1={cx} y1={cy - hexR} x2={cx + r * 0.55} y2={cy - r * 0.82} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={cx + hX} y1={cy - hY} x2={cx + r * 0.95} y2={cy} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={cx + hX} y1={cy + hY} x2={cx + r * 0.55} y2={cy + r * 0.82} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={cx} y1={cy + hexR} x2={cx - r * 0.55} y2={cy + r * 0.82} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={cx - hX} y1={cy + hY} x2={cx - r * 0.95} y2={cy} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={cx - hX} y1={cy - hY} x2={cx - r * 0.55} y2={cy - r * 0.82} stroke="#141F1A" strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.18} fill="#FFFFFF" opacity={0.9} />
    </G>
  );
}

/**
 * SiaVectorCat - Cohesive Borderless 2D Vector Siamese Mascot
 * - Stationary, expressive eyes locked directly inside the head SVG (no spinning eyes!)
 * - Unified head + ears + sprout layer and unified torso layer so no parts ever detach or clip
 * - Smooth harmonic breathing, tail sway, and prop motion
 */
export function SiaVectorCat({
  size = 64,
  mood = 'idle',
  animation = 'auto',
  style,
  interactive = false,
  onPress,
  actionTrigger = 0,
}: SiaVectorCatProps) {
  const reducedMotion = useReducedMotion();
  const lottieRef = useRef<LottieView>(null);

  const scene: 'logo' | 'scanner' | 'water' | 'walking' | 'sitting' = React.useMemo(() => {
    if (
      animation === 'walk' ||
      mood === 'walking' ||
      mood === 'prowling' ||
      mood === 'running' ||
      mood === 'jumping'
    )
      return 'walking';
    if (mood === 'scanning' || mood === 'scanner') return 'scanner';
    if (mood === 'water' || mood === 'hydrated') return 'water';
    if (mood === 'logo' || mood === 'head' || mood === 'coach') return 'logo';
    return 'sitting';
  }, [mood, animation]);

  const lottieSource: AnimationObject = React.useMemo(() => {
    switch (scene) {
      case 'walking':
        return lottieWalking;
      case 'scanner':
        return lottieScanner;
      case 'water':
        return lottieWater;
      case 'logo':
        return lottieLogo;
      case 'sitting':
      default:
        return lottieSitting;
    }
  }, [scene]);

  const isSleeping = mood === 'sleeping';
  const isRunning = mood === 'running';
  const isJumping = mood === 'jumping';
  const isYawning = mood === 'yawning';
  const isCelebrating = mood === 'celebrating';
  const shouldAnimate = !reducedMotion && animation !== 'none';
  const lottieSpeed = isSleeping
    ? 0.45
    : isRunning
    ? 2.2
    : isJumping
    ? 1.5
    : isYawning
    ? 0.7
    : isCelebrating
    ? 1.35
    : 1.0;

  const masterPhase = useSharedValue(0);
  const walkCycle = useSharedValue(0);

  const petJumpY = useSharedValue(0);
  const petScaleX = useSharedValue(1);
  const petScaleY = useSharedValue(1);
  const heartOpacity = useSharedValue(0);
  const heartTranslateY = useSharedValue(0);

  const triggerPetReaction = useCallback(() => {
    hapticFeedback.purr();
    onPress?.();

    if (reducedMotion) return;

    petJumpY.set(
      withSequence(
        withTiming(2.5, { duration: 65 }),
        withTiming(-9, { duration: 150, easing: EASE_OUT }),
        withSpring(0, { duration: 380, dampingRatio: 0.65 })
      )
    );
    petScaleX.set(
      withSequence(
        withTiming(1.1, { duration: 65 }),
        withTiming(0.94, { duration: 140 }),
        withSpring(1, { duration: 380, dampingRatio: 0.65 })
      )
    );
    petScaleY.set(
      withSequence(
        withTiming(0.9, { duration: 65 }),
        withTiming(1.07, { duration: 140 }),
        withSpring(1, { duration: 380, dampingRatio: 0.65 })
      )
    );

    heartTranslateY.set(0);
    heartOpacity.set(
      withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(450, withTiming(0, { duration: 300 }))
      )
    );
    heartTranslateY.set(withTiming(-16, { duration: 820, easing: EASE_OUT }));
  }, [onPress, reducedMotion]);

  useEffect(() => {
    if (!actionTrigger || reducedMotion) return;
    petJumpY.set(
      withSequence(
        withTiming(-5, { duration: 140, easing: EASE_OUT }),
        withSpring(0, { duration: 340, dampingRatio: 0.65 })
      )
    );
  }, [actionTrigger, reducedMotion]);

  useEffect(() => {
    cancelAnimation(masterPhase);
    cancelAnimation(walkCycle);
    masterPhase.set(0);
    walkCycle.set(0);

    if (reducedMotion || animation === 'none') return;

    masterPhase.set(
      withRepeat(
        withTiming(MASTER_CYCLE_RAD, {
          duration: 19200,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    if (scene === 'walking') {
      walkCycle.set(
        withRepeat(
          withTiming(TWO_PI, { duration: 580, easing: Easing.linear }),
          -1,
          false
        )
      );
    }

    return () => {
      cancelAnimation(masterPhase);
      cancelAnimation(walkCycle);
    };
  }, [scene, animation, reducedMotion]);

  const rootPetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: petJumpY.get() },
      { scaleX: petScaleX.get() },
      { scaleY: petScaleY.get() },
    ],
  }));

  // ── SCENE 1 (WALKING): STEADY 120FPS DIAGONAL GAIT ────────────────────────
  const walkLegFarBackStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get();
    const swingDeg = -Math.sin(theta) * 13;
    const strideX = Math.sin(theta) * (size * 0.022);
    const liftY = Math.min(0, Math.cos(theta)) * (size * 0.016);
    return {
      transform: pivotTransform(70, 160, swingDeg, size, strideX, liftY),
    };
  });

  const walkLegNearFrontStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get();
    const swingDeg = -Math.sin(theta) * 13;
    const strideX = Math.sin(theta) * (size * 0.022);
    const liftY = Math.min(0, Math.cos(theta)) * (size * 0.016);
    return {
      transform: pivotTransform(136, 160, swingDeg, size, strideX, liftY),
    };
  });

  const walkLegFarFrontStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get() + Math.PI;
    const swingDeg = -Math.sin(theta) * 13;
    const strideX = Math.sin(theta) * (size * 0.022);
    const liftY = Math.min(0, Math.cos(theta)) * (size * 0.016);
    return {
      transform: pivotTransform(122, 160, swingDeg, size, strideX, liftY),
    };
  });

  const walkLegNearBackStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get() + Math.PI;
    const swingDeg = -Math.sin(theta) * 13;
    const strideX = Math.sin(theta) * (size * 0.022);
    const liftY = Math.min(0, Math.cos(theta)) * (size * 0.016);
    return {
      transform: pivotTransform(84, 160, swingDeg, size, strideX, liftY),
    };
  });

  const walkTorsoStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get();
    const glideY = Math.sin(theta * 2) * (size * 0.007);
    return {
      transform: [{ translateY: glideY }],
    };
  });

  const walkTailStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get();
    const glideY = Math.sin(theta * 2) * (size * 0.007);
    const tailDeg = Math.sin(theta - 0.5) * 4.5;
    return {
      transform: pivotTransform(64, 146, tailDeg, size, 0, glideY),
    };
  });

  const walkHeadStyle = useAnimatedStyle(() => {
    const theta = walkCycle.get();
    const headY = Math.sin(theta * 2 - 0.4) * (size * 0.008);
    const nodDeg = Math.sin(theta - 0.4) * 1.1;
    return {
      transform: pivotTransform(128, 122, nodDeg, size, 0, headY),
    };
  });

  // ── COHESIVE HARMONIC STYLES (CHEF, SCANNER, WATER, LOGO) ─────────────────
  const harmonicTorsoStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const speed = isSleeping ? 0.5 : isCelebrating ? 2.0 : 1.0;
    const breathY =
      (Math.sin(t * speed) * 1.6 + Math.sin(t * 0.5 * speed + 0.8) * 0.8) *
      (isCelebrating ? 1.6 : 1) *
      scale;
    return {
      transform: [{ translateY: breathY }],
    };
  });

  const harmonicHeadStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const speed = isSleeping ? 0.5 : isCelebrating ? 2.0 : 1.0;
    const headY =
      (Math.sin(t * speed - 0.4) * 1.9 + Math.sin(t * 0.5 * speed + 0.35) * 0.9) *
      (isCelebrating ? 1.6 : 1) *
      scale;
    const tiltDeg = isSleeping
      ? -3.0 + Math.sin(t * 0.5) * 1.5
      : Math.sin(t * 0.5 * speed) * 2.2 + Math.sin(t * speed - 0.6) * 1.2;

    return {
      transform: pivotTransform(110, 128, tiltDeg, size, 0, headY),
    };
  });

  const chefTailStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const speed = isSleeping ? 0.5 : isCelebrating ? 2.0 : 1.0;
    const breathY =
      (Math.sin(t * speed) * 1.6 + Math.sin(t * 0.5 * speed + 0.8) * 0.8) * scale;
    const forkDeg = isSleeping
      ? Math.sin(t * 0.5 - 0.9) * 2.5
      : Math.sin(t * speed - 0.9) * 4.5 + Math.sin(t * 2.0 * speed - 0.4) * 2.5;
    return {
      transform: pivotTransform(150, 194, forkDeg, size, 0, breathY),
    };
  });

  const sideTailStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const breathY = (Math.sin(t) * 1.6 + Math.sin(t * 0.5 + 0.8) * 0.8) * scale;
    const tailDeg = Math.sin(t - 0.9) * 5 + Math.sin(t * 2.0 - 0.5) * 2.0;
    return {
      transform: pivotTransform(172, 138, tailDeg, size, 0, breathY),
    };
  });

  const scannerReticleStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const scanX = Math.sin(t * 1.0) * 9 * scale;
    const scanY = Math.sin(t * 2.0) * 4 * scale;
    return {
      transform: [{ translateX: scanX }, { translateY: scanY }],
    };
  });

  const waterDropletsStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const floatY = Math.sin(t * 2.0 - 0.5) * 4 * scale;
    return {
      transform: [{ translateY: floatY }],
    };
  });

  const statusOverlayStyle = useAnimatedStyle(() => {
    const t = masterPhase.get();
    const scale = size / 240;
    const wave = (Math.sin(t * 1.0) + 1) * 0.5;
    const floatY = -wave * 6 * scale;
    return {
      opacity: isSleeping || isCelebrating ? 0.35 + wave * 0.65 : wave * 0.75,
      transform: [{ translateY: floatY }],
    };
  });

  const heartBurstStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.get(),
    transform: [
      { translateY: heartTranslateY.get() },
      { scale: 0.85 + heartOpacity.get() * 0.25 },
    ],
  }));

  const renderSceneContent = () => {
    // ───────────────────────────────────────────────────────────────────────
    // NATIVE 60FPS LOTTIE ENGINE (iOS & Android via lottie-react-native)
    // True parent-child bone hierarchy, bezier path morphing & non-robotic easing
    // ───────────────────────────────────────────────────────────────────────
    if (Platform.OS !== 'web') {
      return (
        <View style={{ width: size, height: size }}>
          <LottieView
            ref={lottieRef}
            source={lottieSource}
            autoPlay={shouldAnimate}
            loop={shouldAnimate}
            speed={lottieSpeed}
            renderMode="AUTOMATIC"
            resizeMode="contain"
            style={{ width: size, height: size }}
          />
          {isSleeping && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, statusOverlayStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 176 58 L 192 58 L 176 74 L 192 74" stroke="#38BDF8" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Path d="M 198 36 L 210 36 L 198 48 L 210 48" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Animated.View>
          )}
          {isYawning && (
            <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                {/* Contented squinting yawn eyes */}
                <Path d="M 76 103 C 82 94 92 94 98 103" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
                <Path d="M 124 103 C 130 94 140 94 146 103" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
                {/* Cute Open Cat Yawn Mouth with soft pink tongue */}
                <Path d="M 103 115 C 105 130 115 130 117 115 Z" fill="#F472B6" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
                <Ellipse cx="110" cy="123" rx="4.5" ry="2.8" fill="#FB7185" />
              </Svg>
            </Animated.View>
          )}
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // WEB SVG FALLBACK SCENE 1: WALKING CAT
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'walking') {
      return (
        <View style={{ width: size, height: size }}>
          {/* Far Hind & Far Fore Legs (Behind Torso) */}
          <Animated.View style={[StyleSheet.absoluteFill, walkLegFarBackStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 60 153 C 60 162 61 170 62 178 L 74 178 C 75 170 76 162 76 153 Z" fill="#E5CDB4" stroke="#2A1810" strokeWidth="4.2" />
              <Path d="M 62 176 C 62 181 62 185 62 187 C 62 190 79 190 79 186 C 79 181 74 180 74 176 Z" fill="#3D2820" stroke="#2A1810" strokeWidth="4" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkLegFarFrontStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 112 153 C 112 162 113 170 114 178 L 126 178 C 127 170 128 162 128 153 Z" fill="#E5CDB4" stroke="#2A1810" strokeWidth="4.2" />
              <Path d="M 114 176 C 114 181 114 185 114 187 C 114 190 131 190 131 186 C 131 181 126 180 126 176 Z" fill="#3D2820" stroke="#2A1810" strokeWidth="4" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkTailStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 68 146 C 40 138 46 106 40 86 C 36 72 20 76 24 90 C 28 104 36 114 34 130 C 32 144 44 155 64 156 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkTorsoStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 58 144 C 55 158 63 167 80 167 L 136 167 C 152 166 158 150 148 134 C 134 120 72 120 58 144 Z"
                fill="#F7EBD6"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Near Hind & Near Fore Legs (In Front of Torso — Seamless Haunch & Shoulder Join!) */}
          <Animated.View style={[StyleSheet.absoluteFill, walkLegNearBackStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 70 148 C 70 160 72 170 74 180 L 86 180 C 88 170 90 160 90 148 Z" fill="#F7EBD6" />
              <Path d="M 71 156 C 71 164 73 172 74 180 L 86 180 C 87 172 89 164 89 156" fill="none" stroke="#2A1810" strokeWidth="4.4" strokeLinecap="round" />
              <Path d="M 74 178 C 74 183 74 187 74 189 C 74 192 91 192 91 188 C 91 183 86 182 86 178 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" strokeLinejoin="round" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkLegNearFrontStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 125 148 C 125 160 127 170 128 180 L 140 180 C 141 170 143 160 143 148 Z" fill="#F7EBD6" />
              <Path d="M 126 156 C 126 164 127 172 128 180 L 140 180 C 141 172 142 164 142 156" fill="none" stroke="#2A1810" strokeWidth="4.4" strokeLinecap="round" />
              <Path d="M 128 178 C 128 183 128 187 128 189 C 128 192 145 192 145 188 C 145 183 140 182 140 178 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" strokeLinejoin="round" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkTorsoStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 118 134 C 126 146 138 150 149 142" stroke="#10B981" strokeWidth="5" strokeLinecap="round" fill="none" />
              <Circle cx="139" cy="148" r="5" fill="#28F59C" stroke="#2A1810" strokeWidth="2.5" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, walkHeadStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 130 66 L 130 42" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Path d="M 130 45 C 118 46 113 38 114 31 C 122 30 129 35 130 45 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 130 45 C 131 34 139 28 148 29 C 148 39 141 46 130 45 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />

              <Path d="M 80 86 C 76 56 81 34 90 31 C 99 29 115 46 123 60 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 86 80 C 84 58 87 41 93 39 C 99 38 110 50 116 61 Z" fill="#7D5243" />
              <Path d="M 179 86 C 183 56 178 34 169 31 C 160 29 144 46 136 60 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 173 80 C 175 58 172 41 166 39 C 160 38 149 50 143 61 Z" fill="#7D5243" />
              <Ellipse cx="130" cy="95" rx="52" ry="41" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 88 102 C 88 86 102 80 115 74 C 123 68 126 64 130 64 C 134 64 137 68 145 74 C 158 80 172 86 172 102 C 172 118 153 123 143 128 C 136 132 133 134 130 134 C 127 134 124 132 117 128 C 107 123 88 118 88 102 Z" fill="#4B3329" />

              {/* Left Teal Eye */}
              <Ellipse cx="108" cy="99" rx="11.5" ry="10.5" fill="#1FD4AE" stroke="#2A1810" strokeWidth="3" />
              <Ellipse cx="110" cy="100" rx="6.8" ry="7.2" fill="#084C41" />
              <Circle cx="106" cy="95" r="3" fill="#FFFFFF" />
              <Circle cx="113" cy="104" r="1.4" fill="#FFFFFF" />

              {/* Stationary Right Camera Aperture Eye (Locked Inside Head SVG) */}
              {renderCameraShutterEye(153, 99, 12)}

              {/* Nose, Mouth & Whiskers */}
              <Path d="M 126 108 C 126 105 136 105 136 108 C 136 112 131 114 131 114 Z" fill="#2A1810" />
              <Path d="M 122 114 C 124 126 138 126 140 114 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
              <Ellipse cx="131" cy="121" rx="5" ry="2.8" fill="#F77E8B" />
              <Path d="M 119 112 C 123 117 129 117 131 112 C 133 117 139 117 143 112" stroke="#2A1810" strokeWidth="3.6" strokeLinecap="round" fill="none" />
              <Line x1="69" y1="106" x2="85" y2="105" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="72" y1="115" x2="86" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="191" y1="106" x2="175" y2="105" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="188" y1="115" x2="174" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 2: SITTING COMPANION SIA (Warm Glossy Teal Eyes, Swaying Tail)
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'sitting') {
      return (
        <View style={{ width: size, height: size }}>
          {/* Layer 1: Swaying Tail Holding 3-Prong Silver Fork */}
          <Animated.View style={[StyleSheet.absoluteFill, chefTailStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 144 194 C 184 192 174 156 178 134 C 180 120 198 118 198 131 C 198 142 186 146 188 162 C 190 182 180 198 150 201 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              <Path
                d="M 179 132 C 182 124 198 122 200 132 C 201 140 185 142 179 132 Z"
                fill="#3D2820"
                stroke="#2A1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Layer 2: Unified Torso, Apron & Paws */}
          <Animated.View style={[StyleSheet.absoluteFill, harmonicTorsoStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 74 140 C 66 164 68 198 84 203 L 154 203 C 168 198 164 164 148 138 Z"
                fill="#F7EBD6"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              <Path d="M 88 136 C 102 146 124 146 140 136 L 136 154 L 92 154 Z" fill="#E5CDB4" />
              <Path
                d="M 145 170 L 162 161 C 167 157 171 163 165 167 L 169 171 C 172 175 166 179 161 173 L 145 176 Z"
                fill="#FFFFFF"
                stroke="#2A1810"
                strokeWidth="3.8"
                strokeLinejoin="round"
              />
              <Path
                d="M 86 138 L 93 155 L 127 155 L 141 136 L 147 139 L 133 158 L 137 198 C 117 202 98 201 84 196 L 89 158 L 81 141 Z"
                fill="#FFFFFF"
                stroke="#2A1810"
                strokeWidth="4.2"
                strokeLinejoin="round"
              />
              <Circle cx="96" cy="159" r="2" fill="#2A1810" />
              <Circle cx="124" cy="159" r="2" fill="#2A1810" />
              <Path d="M 99 175 L 121 175 L 121 185 C 121 192 99 192 99 185 Z" fill="#F2F6FA" stroke="#2A1810" strokeWidth="3.5" strokeLinejoin="round" />

              {/* Symmetrical Front Paws */}
              <Path
                d="M 90 193 C 90 186 106 186 106 193 L 106 202 C 106 207 90 207 90 202 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4"
              />
              <Path
                d="M 118 193 C 118 186 134 186 134 193 L 134 202 C 134 207 118 207 118 202 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4"
              />

              {/* Hind Toe-Bean Pads */}
              <G transform="translate(73, 194)">
                <Ellipse cx="0" cy="0" rx="13" ry="12" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />
                <Ellipse cx="0" cy="4" rx="5.2" ry="4.2" fill="#A56E63" />
                <Circle cx="-5.5" cy="-3.5" r="2.3" fill="#A56E63" />
                <Circle cx="0" cy="-5" r="2.3" fill="#A56E63" />
                <Circle cx="5.5" cy="-3.5" r="2.3" fill="#A56E63" />
              </G>
              <G transform="translate(155, 194)">
                <Ellipse cx="0" cy="0" rx="13" ry="12" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />
                <Ellipse cx="0" cy="4" rx="5.2" ry="4.2" fill="#A56E63" />
                <Circle cx="-5.5" cy="-3.5" r="2.3" fill="#A56E63" />
                <Circle cx="0" cy="-5" r="2.3" fill="#A56E63" />
                <Circle cx="5.5" cy="-3.5" r="2.3" fill="#A56E63" />
              </G>
            </Svg>
          </Animated.View>

          {/* Layer 3: Unified Head, Ears, Sprout & Big Glossy Teal Eyes */}
          <Animated.View style={[StyleSheet.absoluteFill, harmonicHeadStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 110 68 L 110 46" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Path d="M 110 49 C 98 50 93 42 94 35 C 102 34 109 39 110 49 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 110 49 C 111 38 119 32 128 33 C 128 43 121 50 110 49 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />

              <Path d="M 59 92 C 55 62 60 39 69 36 C 78 34 94 50 102 64 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 65 86 C 63 64 66 46 72 44 C 78 43 89 55 95 66 Z" fill="#7D5243" />
              <Path d="M 161 92 C 165 62 160 39 151 36 C 142 34 126 50 118 64 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 155 86 C 157 64 154 46 148 44 C 142 43 131 55 125 66 Z" fill="#7D5243" />
              <Ellipse cx="110" cy="101" rx="54" ry="43" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 66 108 C 66 92 80 86 94 80 C 103 74 106 68 110 68 C 114 68 117 74 126 80 C 140 86 154 92 154 108 C 154 124 134 129 124 134 C 117 138 114 140 110 140 C 106 140 103 138 96 134 C 86 129 66 124 66 108 Z" fill="#4B3329" />

              {isSleeping ? (
                <G>
                  <Path d="M 74 105 C 80 112 92 112 98 105" stroke="#1FD4AE" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                  <Path d="M 122 105 C 128 112 140 112 146 105" stroke="#1FD4AE" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                </G>
              ) : isYawning ? (
                <G>
                  <Path d="M 76 103 C 82 94 92 94 98 103" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
                  <Path d="M 124 103 C 130 94 140 94 146 103" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
                </G>
              ) : (
                <G>
                  <Ellipse cx="86" cy="103" rx="12.5" ry="11.5" fill="#1FD4AE" stroke="#2A1810" strokeWidth="3.2" />
                  <Ellipse cx="88" cy="104" rx="7.5" ry="8" fill="#084C41" />
                  <Circle cx="84" cy="99" r="3.4" fill="#FFFFFF" />
                  <Circle cx="92" cy="108" r="1.5" fill="#FFFFFF" />

                  {renderCameraShutterEye(134, 103, 12)}
                </G>
              )}

              <Path d="M 105 113 C 105 110 115 110 115 113 C 115 117 110 119 110 119 Z" fill="#2A1810" />
              {isYawning ? (
                <G>
                  <Path d="M 103 115 C 105 130 115 130 117 115 Z" fill="#F472B6" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
                  <Ellipse cx="110" cy="123" rx="4.5" ry="2.8" fill="#FB7185" />
                </G>
              ) : (
                <G>
                  <Path d="M 101 119 C 103 132 117 132 119 119 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
                  <Ellipse cx="110" cy="126" rx="5.5" ry="3.2" fill="#F77E8B" />
                </G>
              )}
              <Path d="M 98 117 C 102 122 108 122 110 117 C 112 122 118 122 122 117" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
              <Line x1="47" y1="112" x2="64" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="50" y1="121" x2="65" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="173" y1="112" x2="156" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="170" y1="121" x2="155" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            </Svg>
          </Animated.View>

          {isSleeping && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, statusOverlayStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 176 58 L 192 58 L 176 74 L 192 74" stroke="#38BDF8" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Path d="M 198 36 L 210 36 L 198 48 L 210 48" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
            </Animated.View>
          )}
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 3: SCANNER CAT (Stationary Emerald Scan Eye Locked Inside Head SVG)
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'scanner') {
      return (
        <View style={{ width: size, height: size }}>
          <Animated.View style={[StyleSheet.absoluteFill, sideTailStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 171 135 C 186 124 176 92 178 74 C 179 60 198 60 197 73 C 196 84 188 94 191 112 C 194 128 186 142 174 146 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, harmonicTorsoStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 142 162 L 142 184 C 142 192 155 192 155 184 L 155 162 Z" fill="#3D2820" stroke="#2A1810" strokeWidth="4.2" />
              <Path
                d="M 88 134 C 82 152 84 178 88 188 L 106 188 L 106 168 C 122 172 138 170 156 162 C 162 174 162 184 164 190 C 166 196 179 194 180 184 C 182 166 184 142 168 128 C 154 118 112 122 88 134 Z"
                fill="#F7EBD6"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              <Path d="M 122 165 L 122 191 C 122 200 140 200 140 191 L 140 165 Z" fill="#F7EBD6" stroke="#2A1810" strokeWidth="4.5" />
              <Path d="M 122 181 C 127 179 135 179 140 181 L 140 192 C 140 200 122 200 122 192 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />
              <Path d="M 164 176 C 169 174 176 174 180 176 L 180 187 C 180 195 164 195 164 187 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />

              <Path
                d="M 48 175 C 44 164 53 156 61 162 C 63 153 74 152 79 160 C 86 151 98 153 101 162 C 109 156 119 162 117 173 L 120 176 L 46 176 Z"
                fill="#76C945"
                stroke="#2A1810"
                strokeWidth="3.8"
                strokeLinejoin="round"
              />
              <Ellipse cx="88" cy="169" rx="10" ry="7" fill="#FAF8F0" stroke="#2A1810" strokeWidth="3" />
              <Path d="M 88 177 C 92 165 108 164 116 171 C 118 176 112 182 94 182 Z" fill="#F97E52" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 96 171 Q 102 174 104 179" stroke="#FFD6C4" strokeWidth="2" fill="none" />
              <Path d="M 103 169 Q 109 172 111 177" stroke="#FFD6C4" strokeWidth="2" fill="none" />
              <Circle cx="77" cy="173" r="5" fill="#E04848" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="84" cy="177" r="4.8" fill="#E04848" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="99" cy="182" r="3.8" fill="#C82838" stroke="#2A1810" strokeWidth="2.5" />
              <Circle cx="106" cy="181" r="3.8" fill="#C82838" stroke="#2A1810" strokeWidth="2.5" />
              <Path d="M 59 170 C 64 166 78 174 79 183 C 74 186 61 185 58 177 Z" fill="#C5E063" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Circle cx="69" cy="179" r="4" fill="#5C3824" stroke="#2A1810" strokeWidth="2.2" />
              <Path d="M 45 174 C 46 196 64 205 84 205 C 104 205 122 196 123 174 C 106 184 62 184 45 174 Z" fill="#E2F2EA" stroke="#2A1810" strokeWidth="4.2" strokeLinejoin="round" />
              <Path d="M 94 181 C 106 180 116 178 121 175 C 119 193 104 202 85 203 C 96 198 98 189 94 181 Z" fill="#94C2B0" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, harmonicHeadStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Defs>
                <LinearGradient id="scanConeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#28F59C" stopOpacity="0.42" />
                  <Stop offset="100%" stopColor="#28F59C" stopOpacity="0.04" />
                </LinearGradient>
              </Defs>

              <Path d="M 110 64 L 110 44" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Path d="M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />

              <Path d="M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z" fill="#7D5243" />
              <Path d="M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z" fill="#7D5243" />

              <Ellipse cx="110" cy="97" rx="54" ry="42" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 68 104 C 68 88 82 82 95 76 C 103 70 106 66 110 66 C 114 66 117 70 125 76 C 138 82 152 88 152 104 C 152 120 133 125 123 130 C 116 134 113 136 110 136 C 107 136 104 134 97 130 C 87 125 68 120 68 104 Z" fill="#4B3329" />
              <Path d="M 140 93 C 132 95 126 99 124 102 C 129 102 135 103 140 106" stroke="#2A1810" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M 104 109 C 104 106 114 106 114 109 C 114 113 109 115 109 115 Z" fill="#2A1810" />
              <Path d="M 100 115 C 102 128 116 128 118 115 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
              <Ellipse cx="109" cy="122" rx="5.2" ry="3" fill="#F77E8B" />
              <Path d="M 97 113 C 101 118 107 118 109 113 C 111 118 117 118 121 113" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
              <Line x1="48" y1="108" x2="64" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="51" y1="117" x2="65" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="172" y1="108" x2="156" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="169" y1="117" x2="155" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />

              <Polygon points="85,108 55,168 115,168" fill="url(#scanConeGrad)" />
              {renderCameraShutterEye(85, 99, 12.5)}
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, scannerReticleStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Line x1="85" y1="122" x2="85" y2="140" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="85" y1="150" x2="85" y2="168" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="58" y1="145" x2="77" y2="145" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="93" y1="145" x2="112" y2="145" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Circle cx="85" cy="145" r="3" fill="#28F59C" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 4: WATER CAT (Joyful Squinting Aqua Eyes, Unified Basin & Paws)
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'water') {
      return (
        <View style={{ width: size, height: size }}>
          <Animated.View style={[StyleSheet.absoluteFill, sideTailStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 168 128 C 186 116 175 84 180 68 C 184 56 202 59 199 72 C 196 84 188 92 190 108 C 192 122 184 134 173 138 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, harmonicTorsoStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Defs>
                <LinearGradient id="poolWater" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#4DF2FF" />
                  <Stop offset="100%" stopColor="#14B8D4" />
                </LinearGradient>
              </Defs>
              <Path d="M 168 156 L 176 184 C 179 194 162 196 159 186 L 154 162 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4.5" />
              <Path d="M 92 132 C 88 148 96 164 118 166 L 164 166 C 176 156 176 134 160 118 C 144 106 106 114 92 132 Z" fill="#F7EBD6" stroke="#2A1810" strokeWidth="4.5" strokeLinejoin="round" />
              <Ellipse cx="112" cy="173" rx="69" ry="20" fill="#F2F8FC" stroke="#2A1810" strokeWidth="4.5" />
              <Ellipse cx="112" cy="175" rx="61" ry="14" fill="url(#poolWater)" stroke="#1E586B" strokeWidth="2.5" />
              <Ellipse cx="86" cy="176" rx="18" ry="5" stroke="#BFF8FF" strokeWidth="2" fill="none" />
              <Ellipse cx="128" cy="177" rx="20" ry="5.5" stroke="#BFF8FF" strokeWidth="2" fill="none" />
              <Path d="M 60 175 C 52 162 41 158 43 151 C 45 145 55 151 58 156 C 51 144 43 135 49 131 C 55 128 63 142 66 151 C 68 142 74 142 76 151 C 80 156 84 164 84 173 Z" fill="#6EEEFF" stroke="#1E4B5C" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 140 175 C 145 162 152 158 155 162 C 161 151 169 144 174 148 C 178 152 168 162 165 166 C 171 164 176 168 171 173 C 166 177 152 179 140 175 Z" fill="#6EEEFF" stroke="#1E4B5C" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 91 134 L 78 164 C 75 173 91 177 96 168 L 108 147" fill="#F7EBD6" stroke="#2A1810" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M 79 156 C 85 153 94 156 98 162 L 95 171 C 89 176 75 173 77 164 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4" />
              <Path d="M 129 144 L 120 169 C 118 178 134 181 138 172 L 148 144" fill="#F7EBD6" stroke="#2A1810" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M 122 159 C 128 157 137 160 141 165 L 138 174 C 132 180 118 177 120 168 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="4" />
              <Path d="M 43 173 C 46 202 74 214 112 214 C 150 214 178 202 181 173 C 162 188 62 188 43 173 Z" fill="#F2F8FC" stroke="#2A1810" strokeWidth="4.5" strokeLinejoin="round" />
              <Path d="M 136 185 C 156 183 171 179 179 174 C 175 198 150 210 116 211 C 130 205 138 196 136 185 Z" fill="#BBD2E0" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, harmonicHeadStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 110 56 L 110 44" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Path d="M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Path d="M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />

              <Path d="M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z" fill="#7D5243" />
              <Path d="M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z" fill="#7D5243" />
              <Ellipse cx="110" cy="97" rx="54" ry="42" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 66 104 C 66 88 80 82 94 76 C 103 70 106 66 110 66 C 114 66 117 70 126 76 C 140 82 154 88 154 104 C 154 120 134 125 124 130 C 117 134 114 136 110 136 C 106 136 103 134 96 130 C 86 125 66 120 66 104 Z" fill="#4B3329" />

              {/* Joyful Squinting Aqua Eyes */}
              <Path d="M 74 102 C 79 93 90 94 95 103 C 88 100 80 100 74 102 Z" fill="#1FE0BA" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Circle cx="82" cy="98" r="2" fill="#FFFFFF" />
              <Path d="M 122 103 C 127 94 138 93 143 102 C 137 100 129 100 122 103 Z" fill="#1FE0BA" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              <Circle cx="129" cy="98" r="2" fill="#FFFFFF" />

              <Path d="M 104 109 C 104 106 114 106 114 109 C 114 113 109 115 109 115 Z" fill="#2A1810" />
              <Path d="M 99 114 C 101 129 117 129 119 114 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
              <Ellipse cx="109" cy="122" rx="5.5" ry="3.2" fill="#F77E8B" />
              <Path d="M 96 112 C 100 117 107 117 109 112 C 111 117 118 117 122 112" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
              <Line x1="48" y1="108" x2="64" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="51" y1="117" x2="65" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="172" y1="108" x2="156" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="169" y1="117" x2="155" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, waterDropletsStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 35 117 C 40 115 44 122 41 126 C 38 129 31 123 35 117 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Path d="M 28 134 C 34 133 39 140 36 144 C 32 147 24 140 28 134 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="33" cy="159" r="3.5" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Path d="M 202 138 C 196 138 192 145 195 149 C 199 151 206 144 202 138 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="195" cy="131" r="3.2" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Circle cx="196" cy="160" r="3.2" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Path d="M 41 96 L 43 101 L 48 103 L 43 105 L 41 110 L 39 105 L 34 103 L 39 101 Z" fill="#7CE8F8" />
              <Path d="M 204 111 L 206 115 L 210 117 L 206 119 L 204 123 L 202 119 L 198 117 L 202 115 Z" fill="#7CE8F8" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 5: COMPACT LOGO HEAD (Unified Single SVG, Stationary Scan Eye)
    // ───────────────────────────────────────────────────────────────────────
    return (
      <View style={{ width: size, height: size }}>
        <Animated.View style={[StyleSheet.absoluteFill, harmonicHeadStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Path d="M 120 70 L 120 55" stroke="#25853E" strokeWidth="5" strokeLinecap="round" />
            <Path d="M 120 60 C 106 60 99 50 100 41 C 110 40 119 47 120 60 Z" fill="#68D458" stroke="#1E6F35" strokeWidth="2" strokeLinejoin="round" />
            <Path d="M 120 60 C 114 53 109 48 105 45" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <Path d="M 120 58 C 121 41 132 33 145 34 C 145 48 135 58 120 58 Z" fill="#68D458" stroke="#1E6F35" strokeWidth="2" strokeLinejoin="round" />
            <Path d="M 120 58 C 126 49 132 43 138 39" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            <Path d="M 48 116 C 43 76 50 44 61 37 C 71 31 95 54 109 73 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="6" strokeLinejoin="round" />
            <Path d="M 55 108 C 52 78 57 53 64 48 C 72 44 90 62 101 76 Z" fill="#5E4136" />
            <Path d="M 62 50 C 70 64 78 78 83 89" stroke="#2A1810" strokeWidth="5" strokeLinecap="round" fill="none" />

            <Path d="M 192 116 C 197 76 190 44 179 37 C 169 31 145 54 131 73 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="6" strokeLinejoin="round" />
            <Path d="M 185 108 C 188 78 183 53 176 48 C 168 44 150 62 139 76 Z" fill="#5E4136" />
            <Path d="M 178 50 C 170 64 162 78 157 89" stroke="#2A1810" strokeWidth="5" strokeLinecap="round" fill="none" />

            <Path
              d="M 48 112 C 42 128 38 147 36 154 L 44 157 L 39 164 C 54 192 84 206 120 206 C 156 206 186 192 201 164 L 196 157 L 204 154 C 202 147 198 128 192 112 C 176 78 150 68 120 68 C 90 68 64 78 48 112 Z"
              fill="#F5E8D0"
              stroke="#2A1810"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <Path d="M 46 166 C 62 190 88 202 120 202 C 152 202 178 190 194 166 C 176 184 150 193 120 193 C 90 193 64 184 46 166 Z" fill="#E6D2B5" />

            <Path
              d="M 56 136 C 56 106 82 90 120 90 C 158 90 184 106 184 136 C 184 158 164 172 146 181 C 134 187 127 189 120 189 C 113 189 106 187 94 181 C 76 172 56 158 56 136 Z"
              fill="#4B3329"
            />

            <Line x1="151" y1="105" x2="151" y2="109" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="151" y1="159" x2="151" y2="163" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="122" y1="134" x2="126" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="176" y1="134" x2="180" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />

            <Path
              d="M 73 139 C 79 121 96 121 102 139"
              stroke="#2A1810"
              strokeWidth="6.5"
              strokeLinecap="round"
              fill="none"
            />

            {renderCameraShutterEye(151, 134, 17)}

            <Path
              d="M 111 148 C 111 144 129 144 129 148 C 129 153 123 158 120 158 C 117 158 111 153 111 148 Z"
              fill="#F77E8B"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path
              d="M 101 163 C 106 173 118 171 120 158 C 122 171 134 173 139 163"
              stroke="#2A1810"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>
    );
  };

  const content = (
    <Animated.View style={[styles.root, { width: size, height: size }, rootPetStyle, style]}>
      {renderSceneContent()}

      {/* Floating Hearts & Sparkles Burst on Tap-to-Pet */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'flex-start' },
          heartBurstStyle,
        ]}
      >
        <Svg width={size} height={size * 0.55} viewBox="0 0 120 65">
          <Path
            d="M 60 32 C 56 24 44 24 44 33 C 44 41 60 50 60 50 C 60 50 76 41 76 33 C 76 24 64 24 60 32 Z"
            fill="#F43F5E"
          />
          <Path
            d="M 28 22 L 30 28 L 36 30 L 30 32 L 28 38 L 26 32 L 20 30 L 26 28 Z"
            fill="#34D399"
          />
          <Path
            d="M 92 18 L 94 23 L 99 25 L 94 27 L 92 32 L 90 27 L 85 25 L 90 23 Z"
            fill="#FBBF24"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );

  if (interactive || onPress) {
    return (
      <Pressable onPress={triggerPetReaction} hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export default SiaVectorCat;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
