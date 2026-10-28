import React, { useEffect, useCallback } from 'react';
import { View, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  G,
  Path,
  Circle,
  Ellipse,
  Polygon,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
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

export type SiaVectorMood =
  | 'logo'
  | 'idle'
  | 'happy'
  | 'celebrating'
  | 'scanning'
  | 'scanner'
  | 'chef'
  | 'thinking'
  | 'water'
  | 'hydrated'
  | 'walking'
  | 'prowling'
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
  /** Visual mascot scene ('logo' | 'chef' | 'scanner' | 'water' | 'walking' | etc.) */
  mood?: SiaVectorMood;
  /** Explicit animation override ('auto' infers from mood) */
  animation?: SiaAnimationMode;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Show ambient glow behind the character */
  withGlow?: boolean;
  /** Enable interactive tap-to-pet squash & heart reaction */
  interactive?: boolean;
  /** Optional callback when mascot is tapped */
  onPress?: () => void;
}

const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * 8-Frame Cartoon Cat Walk Cycle Keyframes (Contact -> Down -> Passing -> Up -> Mirror)
 * Front Leg Poses (Shoulder socket at x=122..138, y=150; ground plane at y=191..193)
 */
const FRONT_LEG_FRAMES: ReadonlyArray<{ legD: string; bootD: string }> = [
  // Frame 0: Contact (Reaching forward, paw pad angled up to greet the ground)
  {
    legD: 'M 122 150 C 124 164 134 178 142 189 C 145 193 157 191 155 184 C 151 174 142 162 138 150',
    bootD: 'M 136 177 C 141 174 147 174 151 177 L 155 184 C 157 191 145 193 142 189 Z',
  },
  // Frame 1: Down (Planted flat on ground, elbow/wrist cushioning body weight)
  {
    legD: 'M 122 150 C 125 165 132 178 135 189 C 136 194 150 194 149 188 C 148 176 141 163 138 150',
    bootD: 'M 133 179 C 138 177 144 177 148 179 L 149 188 C 150 194 136 194 135 189 Z',
  },
  // Frame 2: Mid-Stance (Supporting weight straight underneath shoulder)
  {
    legD: 'M 122 150 C 123 165 123 178 124 189 C 124 194 138 194 138 189 C 138 178 138 165 138 150',
    bootD: 'M 124 179 C 128 177 134 177 138 179 L 138 189 C 138 194 124 194 124 189 Z',
  },
  // Frame 3: Push-Off (Extending backward to propel torso into Up pose)
  {
    legD: 'M 122 150 C 120 163 114 176 110 187 C 108 193 121 195 124 189 C 129 178 135 164 138 150',
    bootD: 'M 113 178 C 117 177 123 178 127 181 L 124 189 C 121 195 108 193 110 187 Z',
  },
  // Frame 4: Toe-Off Extreme Back (Stretched back on toe tip as opposite leg lands)
  {
    legD: 'M 122 150 C 117 162 108 174 101 184 C 98 189 110 193 115 187 C 123 176 132 164 138 150',
    bootD: 'M 106 176 C 110 176 116 178 119 181 L 115 187 C 110 193 98 189 101 184 Z',
  },
  // Frame 5: Peel-Off Curl (Lifting off the floor with wrist bent and paw curled back)
  {
    legD: 'M 122 150 C 120 160 115 168 108 174 C 103 178 112 186 118 181 C 127 174 134 162 138 150',
    bootD: 'M 113 169 C 117 170 121 173 123 177 L 118 181 C 112 186 103 178 108 174 Z',
  },
  // Frame 6: Passing Tuck (Folded high mid-air with bent knee/wrist crossing standing leg)
  {
    legD: 'M 122 150 C 126 160 132 168 127 175 C 124 180 137 183 140 176 C 143 168 140 158 138 150',
    bootD: 'M 129 169 C 133 168 138 169 141 172 L 140 176 C 137 183 124 180 127 175 Z',
  },
  // Frame 7: Forward Kick / Unfolding (Reaching high and forward in air before Contact)
  {
    legD: 'M 122 150 C 126 162 136 172 144 181 C 148 185 158 180 154 174 C 148 165 141 157 138 150',
    bootD: 'M 139 172 C 143 169 148 169 152 171 L 154 174 C 158 180 148 185 144 181 Z',
  },
];

/**
 * 8-Frame Cartoon Cat Walk Cycle Keyframes for Hind Legs
 * (Hip socket at x=66..86, y=148; ground plane at y=191..193)
 */
const HIND_LEG_FRAMES: ReadonlyArray<{ legD: string; bootD: string }> = [
  // Frame 0: Contact (Stepping forward under belly)
  {
    legD: 'M 66 148 C 68 162 78 176 86 189 C 89 193 101 191 99 184 C 95 174 88 160 86 148',
    bootD: 'M 81 177 C 86 174 92 174 96 177 L 99 184 C 101 191 89 193 86 189 Z',
  },
  // Frame 1: Down (Planted firmly, absorbing hip weight)
  {
    legD: 'M 66 148 C 69 164 76 177 79 189 C 80 194 94 194 93 188 C 92 176 87 162 86 148',
    bootD: 'M 77 179 C 82 177 88 177 92 179 L 93 188 C 94 194 80 194 79 189 Z',
  },
  // Frame 2: Mid-Stance (Standing directly under hip)
  {
    legD: 'M 66 148 C 67 164 68 177 69 189 C 69 194 83 194 83 189 C 84 177 85 164 86 148',
    bootD: 'M 69 179 C 73 177 79 177 83 179 L 83 189 C 83 194 69 194 69 189 Z',
  },
  // Frame 3: Push-Off (Extending backward from hip)
  {
    legD: 'M 66 148 C 64 162 59 175 55 187 C 53 193 66 195 69 189 C 74 177 82 163 86 148',
    bootD: 'M 58 178 C 62 177 68 178 72 181 L 69 189 C 66 195 53 193 55 187 Z',
  },
  // Frame 4: Toe-Off Extreme Back (Digitigrade stretch back on toes)
  {
    legD: 'M 66 148 C 61 160 53 173 46 184 C 43 189 55 193 60 187 C 68 176 79 162 86 148',
    bootD: 'M 51 176 C 55 176 61 178 64 181 L 60 187 C 55 193 43 189 46 184 Z',
  },
  // Frame 5: Peel-Off Curl (Lifting off floor with hind paw curled back)
  {
    legD: 'M 66 148 C 64 159 59 167 52 174 C 47 178 56 186 62 181 C 71 173 81 160 86 148',
    bootD: 'M 57 169 C 61 170 65 173 67 177 L 62 181 C 56 186 47 178 52 174 Z',
  },
  // Frame 6: Passing Tuck (Folded high mid-air under hip crossing standing hind leg)
  {
    legD: 'M 66 148 C 70 159 76 167 71 175 C 68 180 81 183 84 176 C 87 167 86 157 86 148',
    bootD: 'M 73 169 C 77 168 82 169 85 172 L 84 176 C 81 183 68 180 71 175 Z',
  },
  // Frame 7: Forward Reach (Unfolding forward under belly before Contact)
  {
    legD: 'M 66 148 C 70 161 80 171 88 181 C 92 185 102 180 98 174 C 92 165 87 156 86 148',
    bootD: 'M 83 172 C 87 169 92 169 96 171 L 98 174 C 102 180 92 185 88 181 Z',
  },
];

/**
 * 4-Phase Whipping S-Wave Tail Sequence (Repeated twice per 8-frame walk cycle)
 */
const TAIL_WAVE_FRAMES: ReadonlyArray<string> = [
  // Phase 0 (Contact): Tail sweeps down in a graceful S-arc
  'M 68 146 C 40 140 44 108 38 88 C 34 74 18 78 22 92 C 26 106 34 116 32 132 C 30 146 44 156 64 156 Z',
  // Phase 1 (Down): Hips drop, tail tip whips upward with follow-through
  'M 68 146 C 38 144 42 112 42 90 C 42 74 26 72 26 86 C 26 102 32 118 30 134 C 28 148 44 156 64 156 Z',
  // Phase 2 (Passing): Body rises, tail arches high and curls at the tip
  'M 68 146 C 42 134 50 100 48 80 C 46 66 30 68 32 82 C 34 96 40 110 38 126 C 36 142 46 154 64 156 Z',
  // Phase 3 (Up): Peak of stride bounce, tail trails in a sleek wave
  'M 68 146 C 40 136 46 104 42 84 C 38 70 22 74 25 88 C 28 102 36 114 34 130 C 32 144 44 155 64 156 Z',
];

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
 * UI-thread worklet that scales an eye layer vertically around its exact vertical center (eyeY)
 * in the 240x240 viewBox so blinking eyelids close in place without vertical drift.
 */
function eyeBlinkLocalTransform(eyeY: number, scaleY: number, size: number) {
  'worklet';
  const py = (eyeY - 120) * (size / 240);
  return [
    { translateY: py * (1 - scaleY) },
    { scaleY },
  ];
}

/**
 * SiaVectorCat - Multi-Part Articulated 2D Vector SVG Siamese Mascot
 * Uses an authentic 8-frame cartoon cat walk sequence (Contact -> Down -> Passing -> Up)
 * combined with 60fps UI-thread secondary follow-through via Reanimated 4.
 */
export function SiaVectorCat({
  size = 64,
  mood = 'idle',
  animation = 'auto',
  style,
  withGlow = true,
  interactive = false,
  onPress,
}: SiaVectorCatProps) {
  const reducedMotion = useReducedMotion();

  const scene: 'logo' | 'chef' | 'scanner' | 'water' | 'walking' = React.useMemo(() => {
    if (animation === 'walk' || mood === 'walking' || mood === 'prowling') return 'walking';
    if (mood === 'scanning' || mood === 'scanner') return 'scanner';
    if (mood === 'water' || mood === 'hydrated') return 'water';
    if (mood === 'chef' || mood === 'thinking') return 'chef';
    return 'logo';
  }, [mood, animation]);

  // ── Skeletal Shared Values (Independent Body Parts) ───────────────────────
  // walkCycle runs continuously from 0 -> 8 (8 frames per full stride cycle)
  const walkCycle = useSharedValue(0);
  const bobY = useSharedValue(0);
  const headTilt = useSharedValue(0);
  const tailSwing = useSharedValue(0);
  const sproutSway = useSharedValue(0);
  const eyeBlinkScaleY = useSharedValue(1);
  const shutterRotate = useSharedValue(0);
  const propMotion = useSharedValue(0);

  // ── Interactive Tap-to-Pet Squash & Heart Burst Values ────────────────────
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
        withTiming(3, { duration: 70 }),
        withTiming(-11, { duration: 160, easing: EASE_OUT }),
        withSpring(0, { duration: 350, dampingRatio: 0.65 })
      )
    );
    petScaleX.set(
      withSequence(
        withTiming(1.14, { duration: 70 }),
        withTiming(0.92, { duration: 150 }),
        withSpring(1, { duration: 350, dampingRatio: 0.65 })
      )
    );
    petScaleY.set(
      withSequence(
        withTiming(0.86, { duration: 70 }),
        withTiming(1.1, { duration: 150 }),
        withSpring(1, { duration: 350, dampingRatio: 0.65 })
      )
    );

    heartTranslateY.set(0);
    heartOpacity.set(
      withSequence(
        withTiming(1, { duration: 120 }),
        withDelay(450, withTiming(0, { duration: 300 }))
      )
    );
    heartTranslateY.set(
      withTiming(-18, { duration: 850, easing: EASE_OUT })
    );
  }, [onPress, reducedMotion]);

  useEffect(() => {
    cancelAnimation(walkCycle);
    cancelAnimation(bobY);
    cancelAnimation(headTilt);
    cancelAnimation(tailSwing);
    cancelAnimation(sproutSway);
    cancelAnimation(eyeBlinkScaleY);
    cancelAnimation(shutterRotate);
    cancelAnimation(propMotion);

    walkCycle.set(0);
    bobY.set(0);
    headTilt.set(0);
    tailSwing.set(0);
    sproutSway.set(0);
    eyeBlinkScaleY.set(1);
    shutterRotate.set(0);
    propMotion.set(0);

    if (reducedMotion || animation === 'none') return;

    // 1. Universal Periodic Natural Eye Blink (Every ~3.1s)
    eyeBlinkScaleY.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2800 }),
          withTiming(0.08, { duration: 85, easing: EASE_IN_OUT }),
          withTiming(1, { duration: 110, easing: EASE_OUT }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        false
      )
    );

    // 2. Universal Top Sprout Sway
    sproutSway.set(
      withRepeat(
        withSequence(
          withTiming(6.5, { duration: 1050, easing: EASE_IN_OUT }),
          withTiming(-5.5, { duration: 1050, easing: EASE_IN_OUT }),
          withTiming(8, { duration: 240, easing: EASE_OUT }),
          withTiming(0, { duration: 350, easing: EASE_IN_OUT })
        ),
        -1,
        true
      )
    );

    // 3. Universal Tail Wagging (Pivoted at anatomical tail base)
    tailSwing.set(
      withRepeat(
        withSequence(
          withTiming(6.5, { duration: 750, easing: EASE_IN_OUT }),
          withTiming(-5.5, { duration: 750, easing: EASE_IN_OUT })
        ),
        -1,
        true
      )
    );

    // 4. Mechanical Camera Aperture Shutter Focus Rotation
    shutterRotate.set(
      withRepeat(
        withSequence(
          withTiming(45, { duration: 850, easing: EASE_IN_OUT }),
          withTiming(20, { duration: 350 }),
          withTiming(120, { duration: 1100, easing: EASE_IN_OUT }),
          withTiming(0, { duration: 900, easing: EASE_OUT })
        ),
        -1,
        false
      )
    );

    // 5. Scene-Specific Skeletal Articulation
    if (scene === 'walking') {
      // 8-frame cartoon walk sequence (80ms per frame = 640ms per full 8-frame stride loop)
      walkCycle.set(
        withRepeat(
          withTiming(8, { duration: 640, easing: Easing.linear }),
          -1,
          false
        )
      );
    } else if (scene === 'chef') {
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-2.2, { duration: 1300, easing: EASE_IN_OUT }),
            withTiming(0.8, { duration: 1300, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      headTilt.set(
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 1500, easing: EASE_IN_OUT }),
            withTiming(4, { duration: 1500, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else if (scene === 'scanner') {
      propMotion.set(
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 850, easing: EASE_IN_OUT }),
            withTiming(6, { duration: 850, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      headTilt.set(
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 1200, easing: EASE_IN_OUT }),
            withTiming(2.5, { duration: 1200, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else if (scene === 'water') {
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 420, easing: EASE_OUT }),
            withTiming(1.5, { duration: 420, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      propMotion.set(
        withRepeat(
          withSequence(
            withTiming(-6, { duration: 420, easing: EASE_OUT }),
            withTiming(2, { duration: 420, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else {
      const isCeleb = mood === 'celebrating';
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(isCeleb ? -4.5 : -2.2, { duration: isCeleb ? 320 : 1450, easing: EASE_IN_OUT }),
            withTiming(0.6, { duration: isCeleb ? 320 : 1450, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      headTilt.set(
        withRepeat(
          withSequence(
            withTiming(isCeleb ? 5.5 : 3.2, { duration: isCeleb ? 320 : 1900, easing: EASE_IN_OUT }),
            withTiming(isCeleb ? -5.5 : -3.2, { duration: isCeleb ? 320 : 1900, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    }

    return () => {
      cancelAnimation(walkCycle);
      cancelAnimation(bobY);
      cancelAnimation(headTilt);
      cancelAnimation(tailSwing);
      cancelAnimation(sproutSway);
      cancelAnimation(eyeBlinkScaleY);
      cancelAnimation(shutterRotate);
      cancelAnimation(propMotion);
    };
  }, [scene, mood, animation, reducedMotion]);

  // ── Root Interactive Pet Style ────────────────────────────────────────────
  const rootPetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: petJumpY.get() },
      { scaleX: petScaleX.get() },
      { scaleY: petScaleY.get() },
    ],
  }));

  // ── SCENE 1 (WALKING) 8-FRAME SEQUENCE + 60FPS OVERLAPPING STYLES ─────────
  // UI-thread frame visibility selectors for Frames 0..7 (Contact -> Down -> Passing -> Up)
  const walkFrame0Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 0 ? 1 : 0,
  }));
  const walkFrame1Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 1 ? 1 : 0,
  }));
  const walkFrame2Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 2 ? 1 : 0,
  }));
  const walkFrame3Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 3 ? 1 : 0,
  }));
  const walkFrame4Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 4 ? 1 : 0,
  }));
  const walkFrame5Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 5 ? 1 : 0,
  }));
  const walkFrame6Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 6 ? 1 : 0,
  }));
  const walkFrame7Style = useAnimatedStyle(() => ({
    opacity: Math.floor(walkCycle.get()) % 8 === 7 ? 1 : 0,
  }));
  const walkFrameStyles = [
    walkFrame0Style,
    walkFrame1Style,
    walkFrame2Style,
    walkFrame3Style,
    walkFrame4Style,
    walkFrame5Style,
    walkFrame6Style,
    walkFrame7Style,
  ];

  // Ground shadow breathes in sync with Contact/Down/Passing/Up
  const walkShadowStyle = useAnimatedStyle(() => {
    const wave = Math.sin((walkCycle.get() / 8) * Math.PI * 4);
    return {
      transform: [{ scaleX: 1 + wave * 0.08 }],
      opacity: 0.36 + wave * 0.08,
    };
  });

  // Body bounces down on Frame 1 & 5 (Down pose) and rises on Frame 3 & 7 (Up pose)
  const walkTorsoStyle = useAnimatedStyle(() => {
    const stepRad = (walkCycle.get() / 8) * Math.PI * 4;
    const bounceY = Math.sin(stepRad) * (size * 0.024);
    const pitchDeg = Math.cos(stepRad) * 2.4;
    return {
      transform: pivotTransform(106, 152, pitchDeg, size, 0, bounceY),
    };
  });

  // Overlapping Head Bob, Propel & Nod (Delayed behind torso by 0.65 rad)
  const walkHeadStyle = useAnimatedStyle(() => {
    const stepRad = (walkCycle.get() / 8) * Math.PI * 4;
    const headY = Math.sin(stepRad - 0.65) * (size * 0.032);
    const headX = Math.cos(stepRad - 0.65) * (size * 0.014);
    const nodDeg = Math.sin(stepRad - 1.1) * 4.6;
    return {
      transform: pivotTransform(128, 122, nodDeg, size, headX, headY),
    };
  });

  // Nested Bouncing Ears (Local follow-through around crown (130, 74) inside Head)
  const walkEarsLocalStyle = useAnimatedStyle(() => {
    const stepRad = (walkCycle.get() / 8) * Math.PI * 4;
    const earDeg = Math.sin(stepRad - 1.5) * 5.8;
    return {
      transform: pivotTransform(130, 74, earDeg, size),
    };
  });

  // Nested Bouncing Leaf Sprout (Local follow-through around (130, 64) inside Head)
  const walkSproutLocalStyle = useAnimatedStyle(() => {
    const stepRad = (walkCycle.get() / 8) * Math.PI * 4;
    const leafDeg = Math.sin(stepRad - 1.85) * 11.5;
    return {
      transform: pivotTransform(130, 64, leafDeg, size),
    };
  });

  // Nested Focusing Camera Shutter Eye (Local rotation around (153, 99) inside Head)
  const walkShutterLocalStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(153, 99, shutterRotate.get(), size),
  }));

  // Nested Blinking Left Eye (Local vertical scale around y=99 inside Head)
  const walkEyeBlinkLocalStyle = useAnimatedStyle(() => ({
    transform: eyeBlinkLocalTransform(99, eyeBlinkScaleY.get(), size),
  }));

  // ── OTHER SCENES (CHEF, SCANNER, WATER, LOGO) ARTICULATED STYLES ──────────
  const bodyBobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.get() }],
  }));

  const headArticulatedStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(115, 130, headTilt.get(), size, 0, bobY.get() * 1.15),
  }));

  const sproutLocalStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(115, 62, sproutSway.get(), size),
  }));

  const chefTailStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(150, 194, tailSwing.get(), size, 0, bobY.get()),
  }));

  const sideTailStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(172, 138, tailSwing.get(), size, 0, bobY.get()),
  }));

  const chefEyeBlinkLocalStyle = useAnimatedStyle(() => ({
    transform: eyeBlinkLocalTransform(103, eyeBlinkScaleY.get(), size),
  }));

  const logoEyeBlinkLocalStyle = useAnimatedStyle(() => ({
    transform: eyeBlinkLocalTransform(134, eyeBlinkScaleY.get(), size),
  }));

  const logoShutterLocalStyle = useAnimatedStyle(() => ({
    transform: pivotTransform(151, 134, shutterRotate.get(), size),
  }));

  const propLayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: propMotion.get() }],
  }));

  const heartBurstStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.get(),
    transform: [
      { translateY: heartTranslateY.get() },
      { scale: 0.85 + heartOpacity.get() * 0.25 },
    ],
  }));

  const glowColor = scene === 'water' ? '#06b6d4' : '#10b981';

  const renderSceneContent = () => {
    // ───────────────────────────────────────────────────────────────────────
    // SCENE 1: WALKING CAT (8-Frame Cartoon Walk Sequence + 60fps Head/Ears/Tail)
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'walking') {
      return (
        <View style={{ width: size, height: size }}>
          {/* Layer 0: Breathing Ground Shadow */}
          <Animated.View style={[StyleSheet.absoluteFill, walkShadowStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Ellipse cx="106" cy="200" rx="54" ry="7" fill="#10B981" opacity={0.45} />
            </Svg>
          </Animated.View>

          {/* Layer 1: 8-Frame Cartoon Walk Sequence (Contact -> Down -> Passing -> Up) */}
          <Animated.View style={[StyleSheet.absoluteFill, walkTorsoStyle]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((frameIdx) => {
              const farBack = HIND_LEG_FRAMES[frameIdx];
              const farFront = FRONT_LEG_FRAMES[(frameIdx + 4) % 8];
              const nearBack = HIND_LEG_FRAMES[(frameIdx + 4) % 8];
              const nearFront = FRONT_LEG_FRAMES[frameIdx];
              const tailD = TAIL_WAVE_FRAMES[frameIdx % 4];

              return (
                <Animated.View
                  key={frameIdx}
                  style={[StyleSheet.absoluteFill, walkFrameStyles[frameIdx]]}
                >
                  <Svg width={size} height={size} viewBox="0 0 240 240">
                    {/* 1. Whipping S-Wave Tail */}
                    <Path
                      d={tailD}
                      fill="#4B3329"
                      stroke="#2A1810"
                      strokeWidth="4.5"
                      strokeLinejoin="round"
                    />

                    {/* 2. Far Back Leg (Behind Torso, Warm Shaded Cream) */}
                    <Path
                      d={`${farBack.legD} Z`}
                      fill="#E5CDB4"
                      stroke="#2A1810"
                      strokeWidth="4.4"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={farBack.bootD}
                      fill="#3D2820"
                      stroke="#2A1810"
                      strokeWidth="4.2"
                      strokeLinejoin="round"
                    />

                    {/* 3. Far Front Leg (Behind Torso, Warm Shaded Cream) */}
                    <Path
                      d={`${farFront.legD} Z`}
                      fill="#E5CDB4"
                      stroke="#2A1810"
                      strokeWidth="4.4"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={farFront.bootD}
                      fill="#3D2820"
                      stroke="#2A1810"
                      strokeWidth="4.2"
                      strokeLinejoin="round"
                    />

                    {/* 4. Plump Chibi Cream Torso & Emerald Nutrition Collar */}
                    <Path
                      d="M 58 140 C 53 156 62 169 84 170 L 138 170 C 154 168 158 150 148 132 C 136 120 74 122 58 140 Z"
                      fill="#F7EBD6"
                      stroke="#2A1810"
                      strokeWidth="4.5"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M 118 134 C 126 146 138 150 149 142"
                      stroke="#10B981"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Circle cx="139" cy="148" r="5" fill="#28F59C" stroke="#2A1810" strokeWidth="2.5" />

                    {/* 5. Near Back Leg (Seamless Open-Top Blend into Torso) */}
                    <Path
                      d={nearBack.legD}
                      fill="#F7EBD6"
                      stroke="#2A1810"
                      strokeWidth="4.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={nearBack.bootD}
                      fill="#4B3329"
                      stroke="#2A1810"
                      strokeWidth="4.2"
                      strokeLinejoin="round"
                    />

                    {/* 6. Near Front Leg (Seamless Open-Top Blend into Torso) */}
                    <Path
                      d={nearFront.legD}
                      fill="#F7EBD6"
                      stroke="#2A1810"
                      strokeWidth="4.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={nearFront.bootD}
                      fill="#4B3329"
                      stroke="#2A1810"
                      strokeWidth="4.2"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Layer 2: Overlapping Head Group (60fps Bob, Propel & Nod with Secondary Lag) */}
          <Animated.View style={[StyleSheet.absoluteFill, walkHeadStyle]}>
            {/* Nested Layer 2A: Bouncing Leaf Sprout */}
            <Animated.View style={[StyleSheet.absoluteFill, walkSproutLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 130 66 L 130 42" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 130 45 C 118 46 113 38 114 31 C 122 30 129 35 130 45 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
                <Path d="M 130 45 C 131 34 139 28 148 29 C 148 39 141 46 130 45 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              </Svg>
            </Animated.View>

            {/* Nested Layer 2B: Bouncing Pointy Siamese Ears */}
            <Animated.View style={[StyleSheet.absoluteFill, walkEarsLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 80 86 C 76 56 81 34 90 31 C 99 29 115 46 123 60 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
                <Path d="M 86 80 C 84 58 87 41 93 39 C 99 38 110 50 116 61 Z" fill="#7D5243" />
                <Path d="M 179 86 C 183 56 178 34 169 31 C 160 29 144 46 136 60 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
                <Path d="M 173 80 C 175 58 172 41 166 39 C 160 38 149 50 143 61 Z" fill="#7D5243" />
              </Svg>
            </Animated.View>

            {/* Nested Layer 2C: Head Face, Mask, Nose, Smile & Whiskers */}
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Ellipse cx="130" cy="95" rx="52" ry="41" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 88 102 C 88 86 102 80 115 74 C 123 68 126 64 130 64 C 134 64 137 68 145 74 C 158 80 172 86 172 102 C 172 118 153 123 143 128 C 136 132 133 134 130 134 C 127 134 124 132 117 128 C 107 123 88 118 88 102 Z" fill="#4B3329" />
              <Circle cx="153" cy="99" r="14" fill="#28F59C" opacity={0.3} />
              <Path d="M 126 108 C 126 105 136 105 136 108 C 136 112 131 114 131 114 Z" fill="#2A1810" />
              <Path d="M 122 114 C 124 126 138 126 140 114 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
              <Ellipse cx="131" cy="121" rx="5" ry="2.8" fill="#F77E8B" />
              <Path d="M 119 112 C 123 117 129 117 131 112 C 133 117 139 117 143 112" stroke="#2A1810" strokeWidth="3.6" strokeLinecap="round" fill="none" />
              <Line x1="69" y1="106" x2="85" y2="105" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="72" y1="115" x2="86" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="191" y1="106" x2="175" y2="105" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="188" y1="115" x2="174" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            </Svg>

            {/* Nested Layer 2D: Focusing 6-Blade Camera Shutter Eye (Pivoted at 153, 99) */}
            <Animated.View style={[StyleSheet.absoluteFill, walkShutterLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Circle cx="153" cy="99" r="12" fill="#22E592" stroke="#141F1A" strokeWidth="2.5" />
                <Polygon points="153,93 158,96 158,102 153,105 148,102 148,96" fill="#141F1A" />
                <Line x1="153" y1="93" x2="160" y2="88" stroke="#141F1A" strokeWidth="2.2" />
                <Line x1="158" y1="96" x2="165" y2="99" stroke="#141F1A" strokeWidth="2.2" />
                <Line x1="158" y1="102" x2="160" y2="110" stroke="#141F1A" strokeWidth="2.2" />
                <Line x1="153" y1="105" x2="146" y2="110" stroke="#141F1A" strokeWidth="2.2" />
                <Line x1="148" y1="102" x2="141" y2="99" stroke="#141F1A" strokeWidth="2.2" />
                <Line x1="148" y1="96" x2="146" y2="88" stroke="#141F1A" strokeWidth="2.2" />
              </Svg>
            </Animated.View>

            {/* Nested Layer 2E: Blinking Left Teal Eye (Pivoted at y=99) */}
            <Animated.View style={[StyleSheet.absoluteFill, walkEyeBlinkLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Ellipse cx="108" cy="99" rx="11.5" ry="10.5" fill="#1FD4AE" stroke="#2A1810" strokeWidth="3" />
                <Ellipse cx="110" cy="100" rx="6.8" ry="7.2" fill="#084C41" />
                <Circle cx="106" cy="95" r="3" fill="#FFFFFF" />
                <Circle cx="113" cy="104" r="1.4" fill="#FFFFFF" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 2: CHEF CAT (Tail Holding the 3-Prong Silver Fork, Symmetrical Front Paws)
    // ───────────────────────────────────────────────────────────────────────
    if (scene === 'chef') {
      return (
        <View style={{ width: size, height: size }}>
          {/* Layer 1: Swaying S-Curved Siamese Tail Holding the 3-Prong Silver Fork */}
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
                d="M 183 158 L 191 112 C 185 109 183 102 184 93 L 188 93 L 188 103 L 191 103 L 192 93 L 196 93 L 195 103 L 198 103 L 199 94 L 203 94 C 203 103 200 110 195 113 L 188 159 Z"
                fill="#DCE3EA"
                stroke="#2A1810"
                strokeWidth="3.4"
                strokeLinejoin="round"
              />
              <Path
                d="M 179 132 C 182 126 196 125 198 132 C 199 138 183 141 179 132 Z"
                fill="#4B3329"
                stroke="#2A1810"
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>

          {/* Layer 2: Torso, White Chef Apron, Symmetrical Front Paws & Toe-Bean Feet */}
          <Animated.View style={[StyleSheet.absoluteFill, bodyBobStyle]}>
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

          {/* Layer 3: Articulated Tilting Head Group */}
          <Animated.View style={[StyleSheet.absoluteFill, headArticulatedStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, sproutLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 110 68 L 110 46" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 110 49 C 98 50 93 42 94 35 C 102 34 109 39 110 49 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
                <Path d="M 110 49 C 111 38 119 32 128 33 C 128 43 121 50 110 49 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              </Svg>
            </Animated.View>

            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 59 92 C 55 62 60 39 69 36 C 78 34 94 50 102 64 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 65 86 C 63 64 66 46 72 44 C 78 43 89 55 95 66 Z" fill="#7D5243" />
              <Path d="M 161 92 C 165 62 160 39 151 36 C 142 34 126 50 118 64 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 155 86 C 157 64 154 46 148 44 C 142 43 131 55 125 66 Z" fill="#7D5243" />
              <Ellipse cx="110" cy="101" rx="54" ry="43" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 66 108 C 66 92 80 86 94 80 C 103 74 106 68 110 68 C 114 68 117 74 126 80 C 140 86 154 92 154 108 C 154 124 134 129 124 134 C 117 138 114 140 110 140 C 106 140 103 138 96 134 C 86 129 66 124 66 108 Z" fill="#4B3329" />
              <Path d="M 105 113 C 105 110 115 110 115 113 C 115 117 110 119 110 119 Z" fill="#2A1810" />
              <Path d="M 101 119 C 103 132 117 132 119 119 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
              <Ellipse cx="110" cy="126" rx="5.5" ry="3.2" fill="#F77E8B" />
              <Path d="M 98 117 C 102 122 108 122 110 117 C 112 122 118 122 122 117" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />
              <Line x1="47" y1="112" x2="64" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="50" y1="121" x2="65" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="173" y1="112" x2="156" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
              <Line x1="170" y1="121" x2="155" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            </Svg>

            <Animated.View style={[StyleSheet.absoluteFill, chefEyeBlinkLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Ellipse cx="86" cy="103" rx="12.5" ry="11.5" fill="#1FD4AE" stroke="#2A1810" strokeWidth="3.2" />
                <Ellipse cx="88" cy="104" rx="7.5" ry="8" fill="#084C41" />
                <Circle cx="84" cy="99" r="3.4" fill="#FFFFFF" />
                <Circle cx="92" cy="108" r="1.5" fill="#FFFFFF" />

                <Ellipse cx="134" cy="103" rx="12.5" ry="11.5" fill="#1FD4AE" stroke="#2A1810" strokeWidth="3.2" />
                <Ellipse cx="132" cy="104" rx="7.5" ry="8" fill="#084C41" />
                <Circle cx="129" cy="99" r="3.4" fill="#FFFFFF" />
                <Circle cx="137" cy="108" r="1.5" fill="#FFFFFF" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 3: SCANNER CAT (Wagging Tail, Tilting Head, Sweeping Laser Beam)
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

          <Animated.View style={[StyleSheet.absoluteFill, bodyBobStyle]}>
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

          <Animated.View style={[StyleSheet.absoluteFill, headArticulatedStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Defs>
                <LinearGradient id="scanConeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#28F59C" stopOpacity="0.48" />
                  <Stop offset="100%" stopColor="#28F59C" stopOpacity="0.05" />
                </LinearGradient>
              </Defs>
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
              <Circle cx="85" cy="99" r="14.5" fill="#28F59C" opacity={0.35} />
              <Circle cx="85" cy="99" r="12.5" fill="#22E592" stroke="#141F1A" strokeWidth="2.5" />
              <Polygon points="85,93 90,96 90,102 85,105 80,102 80,96" fill="#141F1A" />
              <Line x1="85" y1="93" x2="92" y2="88" stroke="#141F1A" strokeWidth="2.2" />
              <Line x1="90" y1="96" x2="97" y2="99" stroke="#141F1A" strokeWidth="2.2" />
              <Line x1="90" y1="102" x2="92" y2="110" stroke="#141F1A" strokeWidth="2.2" />
              <Line x1="85" y1="105" x2="78" y2="110" stroke="#141F1A" strokeWidth="2.2" />
              <Line x1="80" y1="102" x2="73" y2="99" stroke="#141F1A" strokeWidth="2.2" />
              <Line x1="80" y1="96" x2="78" y2="88" stroke="#141F1A" strokeWidth="2.2" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, propLayerStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Line x1="85" y1="120" x2="85" y2="142" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="85" y1="150" x2="85" y2="173" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="52" y1="145" x2="77" y2="145" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
              <Line x1="93" y1="145" x2="118" y2="145" stroke="#28F59C" strokeWidth="3" strokeLinecap="round" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 4: WATER CAT (Wagging Tail, Splashing Paws & Waves, Blinking Eyes)
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
              <Path d="M 171 63 Q 168 72 170 81" stroke="#2A1810" strokeWidth="3" strokeLinecap="round" fill="none" />
              <Path d="M 166 59 Q 162 67 164 75" stroke="#2A1810" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <Path d="M 206 71 Q 204 80 198 86" stroke="#2A1810" strokeWidth="3" strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, bodyBobStyle]}>
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

          <Animated.View style={[StyleSheet.absoluteFill, headArticulatedStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, sproutLocalStyle]}>
              <Svg width={size} height={size} viewBox="0 0 240 240">
                <Path d="M 110 56 L 110 44" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
                <Path d="M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
                <Path d="M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z" fill="#68D458" stroke="#2A1810" strokeWidth="3.2" strokeLinejoin="round" />
              </Svg>
            </Animated.View>

            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z" fill="#7D5243" />
              <Path d="M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z" fill="#4B3329" stroke="#2A1810" strokeWidth="5" strokeLinejoin="round" />
              <Path d="M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z" fill="#7D5243" />
              <Ellipse cx="110" cy="97" rx="54" ry="42" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
              <Path d="M 66 104 C 66 88 80 82 94 76 C 103 70 106 66 110 66 C 114 66 117 70 126 76 C 140 82 154 88 154 104 C 154 120 134 125 124 130 C 117 134 114 136 110 136 C 106 136 103 134 96 130 C 86 125 66 120 66 104 Z" fill="#4B3329" />
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

          <Animated.View style={[StyleSheet.absoluteFill, propLayerStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 35 117 C 40 115 44 122 41 126 C 38 129 31 123 35 117 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Path d="M 28 134 C 34 133 39 140 36 144 C 32 147 24 140 28 134 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="33" cy="159" r="3.5" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Path d="M 202 138 C 196 138 192 145 195 149 C 199 151 206 144 202 138 Z" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.8" />
              <Circle cx="195" cy="131" r="3.2" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Circle cx="196" cy="160" r="3.2" fill="#6EEEFF" stroke="#2A1810" strokeWidth="2.5" />
              <Path d="M 41 96 L 43 101 L 48 103 L 43 105 L 41 110 L 39 105 L 34 103 L 39 101 Z" fill="#7CE8F8" />
              <Path d="M 167 89 L 169 94 L 174 96 L 169 98 L 167 103 L 165 98 L 160 96 L 165 94 Z" fill="#7CE8F8" />
              <Path d="M 204 111 L 206 115 L 210 117 L 206 119 L 204 123 L 202 119 L 198 117 L 202 115 Z" fill="#7CE8F8" />
            </Svg>
          </Animated.View>
        </View>
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // SCENE 5: LOGO HEAD (Swaying Sprout, Twitching Ears, Blinking Eye, Focusing Shutter)
    // ───────────────────────────────────────────────────────────────────────
    return (
      <View style={{ width: size, height: size }}>
        <Animated.View style={[StyleSheet.absoluteFill, headArticulatedStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, sproutLocalStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path d="M 120 70 L 120 55" stroke="#25853E" strokeWidth="5" strokeLinecap="round" />
              <Path d="M 120 60 C 106 60 99 50 100 41 C 110 40 119 47 120 60 Z" fill="#68D458" stroke="#1E6F35" strokeWidth="2" strokeLinejoin="round" />
              <Path d="M 120 60 C 114 53 109 48 105 45" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <Path d="M 120 58 C 121 41 132 33 145 34 C 145 48 135 58 120 58 Z" fill="#68D458" stroke="#1E6F35" strokeWidth="2" strokeLinejoin="round" />
              <Path d="M 120 58 C 126 49 132 43 138 39" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </Svg>
          </Animated.View>

          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <RadialGradient id="shutterGlow" cx="50%" cy="50%" r="55%">
                <Stop offset="0%" stopColor="#28F59C" stopOpacity="0.55" />
                <Stop offset="65%" stopColor="#10B981" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="shutterIris" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#38F8A6" />
                <Stop offset="100%" stopColor="#0CAE6B" />
              </LinearGradient>
            </Defs>

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

            <Circle cx="151" cy="134" r="30" fill="url(#shutterGlow)" />
            <Line x1="151" y1="103" x2="151" y2="108" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="151" y1="160" x2="151" y2="165" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="120" y1="134" x2="125" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="177" y1="134" x2="182" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />

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

          <Animated.View style={[StyleSheet.absoluteFill, logoShutterLocalStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Circle cx="151" cy="134" r="21" fill="#141F1A" />
              <Circle cx="151" cy="134" r="17" fill="url(#shutterIris)" />
              <Polygon points="151,126 158,130 158,138 151,142 144,138 144,130" fill="#141F1A" />
              <Line x1="151" y1="126" x2="161" y2="118" stroke="#141F1A" strokeWidth="3" />
              <Line x1="158" y1="130" x2="168" y2="134" stroke="#141F1A" strokeWidth="3" />
              <Line x1="158" y1="138" x2="161" y2="150" stroke="#141F1A" strokeWidth="3" />
              <Line x1="151" y1="142" x2="141" y2="150" stroke="#141F1A" strokeWidth="3" />
              <Line x1="144" y1="138" x2="134" y2="134" stroke="#141F1A" strokeWidth="3" />
              <Line x1="144" y1="130" x2="141" y2="118" stroke="#141F1A" strokeWidth="3" />
            </Svg>
          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, logoEyeBlinkLocalStyle]}>
            <Svg width={size} height={size} viewBox="0 0 240 240">
              <Path
                d="M 73 139 C 79 121 96 121 102 139"
                stroke="#2A1810"
                strokeWidth="6.5"
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  const content = (
    <Animated.View style={[styles.root, { width: size, height: size }, rootPetStyle, style]}>
      {withGlow && (
        <View
          style={[
            styles.ambientGlow,
            {
              width: size * 0.78,
              height: size * 0.78,
              borderRadius: (size * 0.78) / 2,
              backgroundColor: glowColor,
            },
          ]}
        />
      )}

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
  ambientGlow: {
    position: 'absolute',
    opacity: 0.14,
  },
});
