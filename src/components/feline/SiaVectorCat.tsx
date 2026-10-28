import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
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
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';

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
}

const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * SiaVectorCat - Renders the 5 distinct official SiaMeal SVG mascot scenes:
 * 1. Logo Head (assets/images/logo.svg)
 * 2. Chef Cat with Apron & Fork (assets/images/mascot-chef.svg)
 * 3. Scanner Cat with Salad Bowl & Laser Beam (assets/images/mascot-scanner.svg)
 * 4. Water Cat Splashing in Bowl (assets/images/mascot-water.svg)
 * 5. Walking Cat in Stride (assets/images/mascot-walking.svg)
 */
export function SiaVectorCat({
  size = 64,
  mood = 'idle',
  animation = 'auto',
  style,
  withGlow = true,
}: SiaVectorCatProps) {
  const reducedMotion = useReducedMotion();

  // Map mood to one of the 5 distinct mascot scenes
  const scene: 'logo' | 'chef' | 'scanner' | 'water' | 'walking' = React.useMemo(() => {
    if (animation === 'walk' || mood === 'walking' || mood === 'prowling') return 'walking';
    if (mood === 'scanning' || mood === 'scanner') return 'scanner';
    if (mood === 'water' || mood === 'hydrated') return 'water';
    if (mood === 'chef' || mood === 'thinking') return 'chef';
    return 'logo';
  }, [mood, animation]);

  // Shared values for UI-thread animations (Compiler-safe .get / .set)
  const bobY = useSharedValue(0);
  const bodyScale = useSharedValue(1);
  const tiltDeg = useSharedValue(0);
  const stridePhase = useSharedValue(0);
  const effectOffset = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(bobY);
    cancelAnimation(bodyScale);
    cancelAnimation(tiltDeg);
    cancelAnimation(stridePhase);
    cancelAnimation(effectOffset);
    cancelAnimation(pulseOpacity);

    bobY.set(0);
    bodyScale.set(1);
    tiltDeg.set(0);
    stridePhase.set(0);
    effectOffset.set(0);
    pulseOpacity.set(1);

    if (reducedMotion || animation === 'none') return;

    if (scene === 'walking') {
      // Brisk trotting walk cycle
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-3.5, { duration: 220, easing: EASE_OUT }),
            withTiming(1.5, { duration: 220, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      stridePhase.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: 220, easing: EASE_IN_OUT }),
            withTiming(-1, { duration: 220, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      tiltDeg.set(
        withRepeat(
          withSequence(
            withTiming(2.5, { duration: 440, easing: EASE_IN_OUT }),
            withTiming(-2, { duration: 440, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else if (scene === 'scanner') {
      // Laser crosshair sweep up and down over the salad bowl
      effectOffset.set(
        withRepeat(
          withSequence(
            withTiming(-4, { duration: 900, easing: EASE_IN_OUT }),
            withTiming(5, { duration: 900, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      pulseOpacity.set(
        withRepeat(
          withSequence(
            withTiming(0.6, { duration: 900, easing: EASE_IN_OUT }),
            withTiming(1, { duration: 900, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-1.8, { duration: 1400, easing: EASE_IN_OUT }),
            withTiming(0.8, { duration: 1400, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else if (scene === 'water') {
      // Joyful water splash bounce + floating droplets
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-3, { duration: 550, easing: EASE_OUT }),
            withTiming(1, { duration: 550, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      effectOffset.set(
        withRepeat(
          withSequence(
            withTiming(-4.5, { duration: 550, easing: EASE_OUT }),
            withTiming(1.5, { duration: 550, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else if (scene === 'chef') {
      //Gentle breathing + fork wave
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(-2, { duration: 1500, easing: EASE_IN_OUT }),
            withTiming(0.5, { duration: 1500, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      tiltDeg.set(
        withRepeat(
          withSequence(
            withTiming(-2, { duration: 1500, easing: EASE_IN_OUT }),
            withTiming(2, { duration: 1500, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    } else {
      // Logo head: gentle breathing or celebratory hop
      const isCeleb = mood === 'celebrating';
      bobY.set(
        withRepeat(
          withSequence(
            withTiming(isCeleb ? -4 : -2, { duration: isCeleb ? 350 : 1600, easing: EASE_IN_OUT }),
            withTiming(0, { duration: isCeleb ? 350 : 1600, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
      bodyScale.set(
        withRepeat(
          withSequence(
            withTiming(isCeleb ? 1.05 : 1.02, { duration: isCeleb ? 350 : 1600, easing: EASE_IN_OUT }),
            withTiming(1, { duration: isCeleb ? 350 : 1600, easing: EASE_IN_OUT })
          ),
          -1,
          true
        )
      );
    }

    return () => {
      cancelAnimation(bobY);
      cancelAnimation(bodyScale);
      cancelAnimation(tiltDeg);
      cancelAnimation(stridePhase);
      cancelAnimation(effectOffset);
      cancelAnimation(pulseOpacity);
    };
  }, [scene, mood, animation, reducedMotion]);

  const mainAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bobY.get() },
      { scale: bodyScale.get() },
      { rotate: `${tiltDeg.get()}deg` },
    ],
  }));

  const legPairFarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -stridePhase.get() * (size * 0.045) },
      { translateY: stridePhase.get() > 0 ? -stridePhase.get() * (size * 0.03) : 0 },
    ],
  }));

  const legPairNearStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: stridePhase.get() * (size * 0.045) },
      { translateY: stridePhase.get() < 0 ? stridePhase.get() * (size * 0.03) : 0 },
    ],
  }));

  const effectLayerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: effectOffset.get() }],
    opacity: pulseOpacity.get(),
  }));

  const glowColor = scene === 'water' ? '#06b6d4' : '#10b981';

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE 1: WALKING CAT (assets/images/mascot-walking.svg)
  // ─────────────────────────────────────────────────────────────────────────
  if (scene === 'walking') {
    return (
      <View style={[styles.root, { width: size, height: size }, style]}>
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

        {/* Far Striding Legs */}
        <Animated.View style={[StyleSheet.absoluteFill, legPairFarStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Path
              d="M 68 164 L 54 192 C 51 200 66 204 70 195 L 82 166 Z"
              fill="#E5CDB4"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 58 184 C 63 183 69 185 73 188 L 70 195 C 66 204 51 200 54 192 Z"
              fill="#3D2820"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
            <Path
              d="M 136 160 L 158 176 C 166 181 158 194 148 188 L 126 168 Z"
              fill="#E5CDB4"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 148 169 C 152 172 156 176 158 176 C 166 181 158 194 148 188 L 141 182 Z"
              fill="#3D2820"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
          </Svg>
        </Animated.View>

        {/* Main Walking Body, Tail & Head */}
        <Animated.View style={[StyleSheet.absoluteFill, mainAnimStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <LinearGradient id="walkLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#7EE058" />
                <Stop offset="100%" stopColor="#4EB338" />
              </LinearGradient>
              <LinearGradient id="walkIris" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#38F8A6" />
                <Stop offset="100%" stopColor="#0CAE6B" />
              </LinearGradient>
              <LinearGradient id="walkTeal" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#35ECC4" />
                <Stop offset="100%" stopColor="#0EA88A" />
              </LinearGradient>
            </Defs>

            {/* S-Curved Siamese Tail */}
            <Path
              d="M 68 148 C 44 140 50 104 46 84 C 43 70 26 72 28 86 C 30 100 38 112 36 128 C 34 144 46 156 64 158 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path d="M 55 72 Q 59 80 57 88" stroke="#2A1810" strokeWidth="3" strokeLinecap="round" fill="none" />
            <Path d="M 19 82 Q 21 90 26 96" stroke="#2A1810" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Walking Torso */}
            <Path
              d="M 62 142 C 58 158 64 172 86 174 L 138 174 C 154 172 158 154 148 136 C 136 122 76 124 62 142 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path
              d="M 118 136 C 126 148 138 152 149 144"
              stroke="#10B981"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx="139" cy="150" r="5" fill="#28F59C" stroke="#2A1810" strokeWidth="2.5" />

            {/* Pointed Ears & Top Sprout */}
            <Path
              d="M 80 86 C 76 56 81 34 90 31 C 99 29 115 46 123 60 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 86 80 C 84 58 87 41 93 39 C 99 38 110 50 116 61 Z" fill="#7D5243" />
            <Path
              d="M 179 86 C 183 56 178 34 169 31 C 160 29 144 46 136 60 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 173 80 C 175 58 172 41 166 39 C 160 38 149 50 143 61 Z" fill="#7D5243" />

            <Path d="M 130 54 L 130 42" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Path
              d="M 130 45 C 118 46 113 38 114 31 C 122 30 129 35 130 45 Z"
              fill="url(#walkLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Path
              d="M 130 45 C 131 34 139 28 148 29 C 148 39 141 46 130 45 Z"
              fill="url(#walkLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />

            {/* Head & Peaked Siamese Mask */}
            <Ellipse cx="130" cy="95" rx="52" ry="41" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
            <Path
              d="M 88 102 C 88 86 102 80 115 74 C 123 68 126 64 130 64 C 134 64 137 68 145 74 C 158 80 172 86 172 102 C 172 118 153 123 143 128 C 136 132 133 134 130 134 C 127 134 124 132 117 128 C 107 123 88 118 88 102 Z"
              fill="#4B3329"
            />

            {/* Left Glossy Teal Eye */}
            <Ellipse cx="108" cy="99" rx="11.5" ry="10.5" fill="url(#walkTeal)" stroke="#2A1810" strokeWidth="3" />
            <Ellipse cx="110" cy="100" rx="6.8" ry="7.2" fill="#084C41" />
            <Circle cx="106" cy="95" r="3" fill="#FFFFFF" />
            <Circle cx="113" cy="104" r="1.4" fill="#FFFFFF" />

            {/* Right 6-Blade Camera Shutter Eye */}
            <Circle cx="153" cy="99" r="14" fill="#28F59C" opacity={0.3} />
            <Circle cx="153" cy="99" r="12" fill="url(#walkIris)" stroke="#141F1A" strokeWidth="2.5" />
            <Polygon points="153,93 158,96 158,102 153,105 148,102 148,96" fill="#141F1A" />
            <Line x1="153" y1="93" x2="160" y2="88" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="158" y1="96" x2="165" y2="99" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="158" y1="102" x2="160" y2="110" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="153" y1="105" x2="146" y2="110" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="148" y1="102" x2="141" y2="99" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="148" y1="96" x2="146" y2="88" stroke="#141F1A" strokeWidth="2.2" />

            {/* Nose, Open Smile & Whiskers */}
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

        {/* Near Striding Legs */}
        <Animated.View style={[StyleSheet.absoluteFill, legPairNearStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Path
              d="M 78 165 L 84 196 C 85 204 102 204 102 195 L 96 165 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 82 184 C 87 182 95 182 100 184 L 102 195 C 102 204 85 204 84 196 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
            <Path
              d="M 122 165 L 116 196 C 115 204 132 205 134 196 L 140 165 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 118 184 C 123 182 131 182 136 184 L 134 196 C 132 205 115 204 116 196 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE 2: CHEF CAT WITH APRON & FORK (assets/images/mascot-chef.svg)
  // ─────────────────────────────────────────────────────────────────────────
  if (scene === 'chef') {
    return (
      <View style={[styles.root, { width: size, height: size }, style]}>
        {withGlow && (
          <View
            style={[
              styles.ambientGlow,
              {
                width: size * 0.82,
                height: size * 0.82,
                borderRadius: (size * 0.82) / 2,
                backgroundColor: glowColor,
              },
            ]}
          />
        )}
        <Animated.View style={[{ width: size, height: size }, mainAnimStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <LinearGradient id="chefEye" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#35ECC4" />
                <Stop offset="100%" stopColor="#0EA88A" />
              </LinearGradient>
              <LinearGradient id="chefLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#7EE058" />
                <Stop offset="100%" stopColor="#4EB338" />
              </LinearGradient>
            </Defs>

            {/* S-Curved Tail */}
            <Path
              d="M 164 195 C 188 189 175 154 176 132 C 177 118 194 114 196 127 C 198 140 189 148 189 162 C 189 182 183 200 165 202 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Lower Body Base */}
            <Path
              d="M 74 140 C 66 164 68 198 84 203 L 154 203 C 168 198 164 164 148 138 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path d="M 88 136 C 102 146 124 146 140 136 L 136 154 L 92 154 Z" fill="#E5CDB4" />

            {/* Silver 3-Prong Fork */}
            <Path
              d="M 69 176 L 55 144 C 50 142 46 136 44 128 L 48 126 L 52 135 L 54 134 L 50 125 L 54 123 L 58 132 L 60 131 L 56 122 L 60 120 C 64 128 64 135 61 140 L 74 173 Z"
              fill="#DCE3EA"
              stroke="#2A1810"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Right Arm & Paw Gripping Fork */}
            <Path
              d="M 86 141 C 76 152 72 162 64 162 C 56 162 54 150 64 148"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Ellipse cx="63" cy="159" rx="10" ry="9" fill="#4B3329" stroke="#2A1810" strokeWidth="4" />

            {/* White Chef Apron with Pocket & Side Bow */}
            <Path
              d="M 145 170 L 164 160 C 169 156 173 162 167 166 L 171 170 C 174 174 168 178 163 172 L 145 176 Z"
              fill="#FFFFFF"
              stroke="#2A1810"
              strokeWidth="3.8"
              strokeLinejoin="round"
            />
            <Path
              d="M 86 138 L 93 155 L 125 155 L 141 136 L 147 139 L 131 158 L 135 198 C 115 202 98 201 84 196 L 91 158 L 81 141 Z"
              fill="#FFFFFF"
              stroke="#2A1810"
              strokeWidth="4.2"
              strokeLinejoin="round"
            />
            <Circle cx="96" cy="159" r="2" fill="#2A1810" />
            <Circle cx="122" cy="159" r="2" fill="#2A1810" />
            <Path
              d="M 97 177 L 119 177 L 119 187 C 119 194 97 194 97 187 Z"
              fill="#F2F6FA"
              stroke="#2A1810"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Left Arm & Front Paw */}
            <Path
              d="M 136 144 C 145 160 144 184 140 198 L 125 198 C 124 184 126 164 129 154"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 124 192 C 124 185 141 185 141 192 L 141 201 C 141 206 124 206 124 201 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4"
            />

            {/* Back Paws with Pink Toe Beans */}
            <G transform="translate(73, 194)">
              <Ellipse cx="0" cy="0" rx="13" ry="12" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />
              <Ellipse cx="0" cy="4" rx="5.2" ry="4.2" fill="#A56E63" />
              <Circle cx="-5.5" cy="-3.5" r="2.3" fill="#A56E63" />
              <Circle cx="0" cy="-5" r="2.3" fill="#A56E63" />
              <Circle cx="5.5" cy="-3.5" r="2.3" fill="#A56E63" />
            </G>
            <G transform="translate(157, 194)">
              <Ellipse cx="0" cy="0" rx="13" ry="12" fill="#4B3329" stroke="#2A1810" strokeWidth="4.2" />
              <Ellipse cx="0" cy="4" rx="5.2" ry="4.2" fill="#A56E63" />
              <Circle cx="-5.5" cy="-3.5" r="2.3" fill="#A56E63" />
              <Circle cx="0" cy="-5" r="2.3" fill="#A56E63" />
              <Circle cx="5.5" cy="-3.5" r="2.3" fill="#A56E63" />
            </G>

            {/* Ears & Sprout */}
            <Path
              d="M 59 92 C 55 62 60 39 69 36 C 78 34 94 50 102 64 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 65 86 C 63 64 66 46 72 44 C 78 43 89 55 95 66 Z" fill="#7D5243" />
            <Path
              d="M 161 92 C 165 62 160 39 151 36 C 142 34 126 50 118 64 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 155 86 C 157 64 154 46 148 44 C 142 43 131 55 125 66 Z" fill="#7D5243" />

            <Path d="M 110 58 L 110 46" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Path
              d="M 110 49 C 98 50 93 42 94 35 C 102 34 109 39 110 49 Z"
              fill="url(#chefLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Path
              d="M 110 49 C 111 38 119 32 128 33 C 128 43 121 50 110 49 Z"
              fill="url(#chefLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />

            {/* Head & Peaked Siamese Mask */}
            <Ellipse cx="110" cy="101" rx="54" ry="43" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
            <Path
              d="M 66 108 C 66 92 80 86 94 80 C 103 74 106 68 110 68 C 114 68 117 74 126 80 C 140 86 154 92 154 108 C 154 124 134 129 124 134 C 117 138 114 140 110 140 C 106 140 103 138 96 134 C 86 129 66 124 66 108 Z"
              fill="#4B3329"
            />

            {/* Big Glossy Teal-Emerald Eyes */}
            <Ellipse cx="86" cy="103" rx="12.5" ry="11.5" fill="url(#chefEye)" stroke="#2A1810" strokeWidth="3.2" />
            <Ellipse cx="88" cy="104" rx="7.5" ry="8" fill="#084C41" />
            <Circle cx="84" cy="99" r="3.4" fill="#FFFFFF" />
            <Circle cx="92" cy="108" r="1.5" fill="#FFFFFF" />

            <Ellipse cx="134" cy="103" rx="12.5" ry="11.5" fill="url(#chefEye)" stroke="#2A1810" strokeWidth="3.2" />
            <Ellipse cx="132" cy="104" rx="7.5" ry="8" fill="#084C41" />
            <Circle cx="129" cy="99" r="3.4" fill="#FFFFFF" />
            <Circle cx="137" cy="108" r="1.5" fill="#FFFFFF" />

            {/* Nose, Open Happy Mouth & Whiskers */}
            <Path d="M 105 113 C 105 110 115 110 115 113 C 115 117 110 119 110 119 Z" fill="#2A1810" />
            <Path d="M 101 119 C 103 132 117 132 119 119 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
            <Ellipse cx="110" cy="126" rx="5.5" ry="3.2" fill="#F77E8B" />
            <Path d="M 98 117 C 102 122 108 122 110 117 C 112 122 118 122 122 117" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />

            <Line x1="47" y1="112" x2="64" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="50" y1="121" x2="65" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="173" y1="112" x2="156" y2="111" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="170" y1="121" x2="155" y2="117" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE 3: SCANNER CAT WITH SALAD BOWL & LASER BEAM (assets/images/mascot-scanner.svg)
  // ─────────────────────────────────────────────────────────────────────────
  if (scene === 'scanner') {
    return (
      <View style={[styles.root, { width: size, height: size }, style]}>
        {withGlow && (
          <View
            style={[
              styles.ambientGlow,
              {
                width: size * 0.82,
                height: size * 0.82,
                borderRadius: (size * 0.82) / 2,
                backgroundColor: glowColor,
              },
            ]}
          />
        )}
        <Animated.View style={[{ width: size, height: size }, mainAnimStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <LinearGradient id="scanConeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#28F59C" stopOpacity="0.48" />
                <Stop offset="100%" stopColor="#28F59C" stopOpacity="0.06" />
              </LinearGradient>
              <LinearGradient id="scannerIris" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#38F8A6" />
                <Stop offset="100%" stopColor="#0CAE6B" />
              </LinearGradient>
            </Defs>

            {/* S-Curved Tail */}
            <Path
              d="M 171 135 C 186 124 176 92 178 74 C 179 60 198 60 197 73 C 196 84 188 94 191 112 C 194 128 186 142 174 146 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Standing Body & 4 Legs with Dark Sock Paws */}
            <Path
              d="M 142 162 L 142 184 C 142 192 155 192 155 184 L 155 162 Z"
              fill="#3D2820"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
            <Path
              d="M 88 134 C 82 152 84 178 88 188 L 106 188 L 106 168 C 122 172 138 170 156 162 C 162 174 162 184 164 190 C 166 196 179 194 180 184 C 182 166 184 142 168 128 C 154 118 112 122 88 134 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path
              d="M 122 165 L 122 191 C 122 200 140 200 140 191 L 140 165 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 122 181 C 127 179 135 179 140 181 L 140 192 C 140 200 122 200 122 192 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.2"
            />
            <Path
              d="M 164 176 C 169 174 176 174 180 176 L 180 187 C 180 195 164 195 164 187 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.2"
            />

            {/* Ears & Head */}
            <Path
              d="M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z" fill="#7D5243" />
            <Path
              d="M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z" fill="#7D5243" />

            <Ellipse cx="110" cy="97" rx="54" ry="42" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
            <Path
              d="M 68 104 C 68 88 82 82 95 76 C 103 70 106 66 110 66 C 114 66 117 70 125 76 C 138 82 152 88 152 104 C 152 120 133 125 123 130 C 116 134 113 136 110 136 C 107 136 104 134 97 130 C 87 125 68 120 68 104 Z"
              fill="#4B3329"
            />

            {/* Winking Right Eye & Happy Mouth */}
            <Path
              d="M 140 93 C 132 95 126 99 124 102 C 129 102 135 103 140 106"
              stroke="#2A1810"
              strokeWidth="4.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path d="M 104 109 C 104 106 114 106 114 109 C 114 113 109 115 109 115 Z" fill="#2A1810" />
            <Path d="M 100 115 C 102 128 116 128 118 115 Z" fill="#331812" stroke="#2A1810" strokeWidth="3" strokeLinejoin="round" />
            <Ellipse cx="109" cy="122" rx="5.2" ry="3" fill="#F77E8B" />
            <Path d="M 97 113 C 101 118 107 118 109 113 C 111 118 117 118 121 113" stroke="#2A1810" strokeWidth="3.8" strokeLinecap="round" fill="none" />

            <Line x1="48" y1="108" x2="64" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="51" y1="117" x2="65" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="172" y1="108" x2="156" y2="107" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Line x1="169" y1="117" x2="155" y2="113" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />

            {/* Healthy Salad / Poke Bowl (Bottom Left) */}
            <Path
              d="M 48 175 C 44 164 53 156 61 162 C 63 153 74 152 79 160 C 86 151 98 153 101 162 C 109 156 119 162 117 173 L 120 176 L 46 176 Z"
              fill="#76C945"
              stroke="#2A1810"
              strokeWidth="3.8"
              strokeLinejoin="round"
            />
            <Ellipse cx="88" cy="169" rx="10" ry="7" fill="#FAF8F0" stroke="#2A1810" strokeWidth="3" />
            <Path
              d="M 88 177 C 92 165 108 164 116 171 C 118 176 112 182 94 182 Z"
              fill="#F97E52"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Path d="M 96 171 Q 102 174 104 179" stroke="#FFD6C4" strokeWidth="2" fill="none" />
            <Path d="M 103 169 Q 109 172 111 177" stroke="#FFD6C4" strokeWidth="2" fill="none" />
            <Circle cx="77" cy="173" r="5" fill="#E04848" stroke="#2A1810" strokeWidth="2.8" />
            <Circle cx="84" cy="177" r="4.8" fill="#E04848" stroke="#2A1810" strokeWidth="2.8" />
            <Circle cx="99" cy="182" r="3.8" fill="#C82838" stroke="#2A1810" strokeWidth="2.5" />
            <Circle cx="106" cy="181" r="3.8" fill="#C82838" stroke="#2A1810" strokeWidth="2.5" />
            <Path
              d="M 59 170 C 64 166 78 174 79 183 C 74 186 61 185 58 177 Z"
              fill="#C5E063"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Circle cx="69" cy="179" r="4" fill="#5C3824" stroke="#2A1810" strokeWidth="2.2" />
            <Path
              d="M 45 174 C 46 196 64 205 84 205 C 104 205 122 196 123 174 C 106 184 62 184 45 174 Z"
              fill="#E2F2EA"
              stroke="#2A1810"
              strokeWidth="4.2"
              strokeLinejoin="round"
            />
            <Path
              d="M 94 181 C 106 180 116 178 121 175 C 119 193 104 202 85 203 C 96 198 98 189 94 181 Z"
              fill="#94C2B0"
            />

            {/* Laser Scan Beam Cone */}
            <Polygon points="85,108 55,168 115,168" fill="url(#scanConeGrad)" />

            {/* Left Eye: Glowing 6-Blade Camera Shutter */}
            <Circle cx="85" cy="99" r="14.5" fill="#28F59C" opacity={0.35} />
            <Circle cx="85" cy="99" r="12.5" fill="url(#scannerIris)" stroke="#141F1A" strokeWidth="2.5" />
            <Polygon points="85,93 90,96 90,102 85,105 80,102 80,96" fill="#141F1A" />
            <Line x1="85" y1="93" x2="92" y2="88" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="90" y1="96" x2="97" y2="99" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="90" y1="102" x2="92" y2="110" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="85" y1="105" x2="78" y2="110" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="80" y1="102" x2="73" y2="99" stroke="#141F1A" strokeWidth="2.2" />
            <Line x1="80" y1="96" x2="78" y2="88" stroke="#141F1A" strokeWidth="2.2" />
          </Svg>
        </Animated.View>

        {/* Animated Sweeping Laser Target Crosshair */}
        <Animated.View style={[StyleSheet.absoluteFill, effectLayerStyle]} pointerEvents="none">
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

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE 4: WATER CAT SPLASHING IN BOWL (assets/images/mascot-water.svg)
  // ─────────────────────────────────────────────────────────────────────────
  if (scene === 'water') {
    return (
      <View style={[styles.root, { width: size, height: size }, style]}>
        {withGlow && (
          <View
            style={[
              styles.ambientGlow,
              {
                width: size * 0.82,
                height: size * 0.82,
                borderRadius: (size * 0.82) / 2,
                backgroundColor: glowColor,
              },
            ]}
          />
        )}
        <Animated.View style={[{ width: size, height: size }, mainAnimStyle]}>
          <Svg width={size} height={size} viewBox="0 0 240 240">
            <Defs>
              <LinearGradient id="poolWater" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#4DF2FF" />
                <Stop offset="100%" stopColor="#14B8D4" />
              </LinearGradient>
              <LinearGradient id="waterLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#7EE058" />
                <Stop offset="100%" stopColor="#4EB338" />
              </LinearGradient>
            </Defs>

            {/* Wagging S-Curved Tail & Motion Lines */}
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

            {/* Standing Body & Back Foot */}
            <Path
              d="M 168 156 L 176 184 C 179 194 162 196 159 186 L 154 162 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4.5"
            />
            <Path
              d="M 92 132 C 88 148 96 164 118 166 L 164 166 C 176 156 176 134 160 118 C 144 106 106 114 92 132 Z"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />

            {/* Water Bowl Base & Glowing Cyan Pool */}
            <Ellipse cx="112" cy="173" rx="69" ry="20" fill="#F2F8FC" stroke="#2A1810" strokeWidth="4.5" />
            <Ellipse cx="112" cy="175" rx="61" ry="14" fill="url(#poolWater)" stroke="#1E586B" strokeWidth="2.5" />
            <Ellipse cx="86" cy="176" rx="18" ry="5" stroke="#BFF8FF" strokeWidth="2" fill="none" />
            <Ellipse cx="128" cy="177" rx="20" ry="5.5" stroke="#BFF8FF" strokeWidth="2" fill="none" />

            {/* Splashing Waves & Front Paws in Water */}
            <Path
              d="M 60 175 C 52 162 41 158 43 151 C 45 145 55 151 58 156 C 51 144 43 135 49 131 C 55 128 63 142 66 151 C 68 142 74 142 76 151 C 80 156 84 164 84 173 Z"
              fill="#6EEEFF"
              stroke="#1E4B5C"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Path
              d="M 140 175 C 145 162 152 158 155 162 C 161 151 169 144 174 148 C 178 152 168 162 165 166 C 171 164 176 168 171 173 C 166 177 152 179 140 175 Z"
              fill="#6EEEFF"
              stroke="#1E4B5C"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />

            <Path
              d="M 91 134 L 78 164 C 75 173 91 177 96 168 L 108 147"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 79 156 C 85 153 94 156 98 162 L 95 171 C 89 176 75 173 77 164 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4"
            />
            <Path
              d="M 129 144 L 120 169 C 118 178 134 181 138 172 L 148 144"
              fill="#F7EBD6"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 122 159 C 128 157 137 160 141 165 L 138 174 C 132 180 118 177 120 168 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="4"
            />

            {/* Bowl Front Ceramic Body */}
            <Path
              d="M 43 173 C 46 202 74 214 112 214 C 150 214 178 202 181 173 C 162 188 62 188 43 173 Z"
              fill="#F2F8FC"
              stroke="#2A1810"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <Path
              d="M 136 185 C 156 183 171 179 179 174 C 175 198 150 210 116 211 C 130 205 138 196 136 185 Z"
              fill="#BBD2E0"
            />

            {/* Pointed Ears & Top Sprout */}
            <Path
              d="M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z" fill="#7D5243" />
            <Path
              d="M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z"
              fill="#4B3329"
              stroke="#2A1810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <Path d="M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z" fill="#7D5243" />

            <Path d="M 110 56 L 110 44" stroke="#2A1810" strokeWidth="4" strokeLinecap="round" />
            <Path
              d="M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z"
              fill="url(#waterLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Path
              d="M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z"
              fill="url(#waterLeaf)"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />

            {/* Head & Peaked Siamese Mask */}
            <Ellipse cx="110" cy="97" rx="54" ry="42" fill="#F7EBD6" stroke="#2A1810" strokeWidth="5" />
            <Path
              d="M 66 104 C 66 88 80 82 94 76 C 103 70 106 66 110 66 C 114 66 117 70 126 76 C 140 82 154 88 154 104 C 154 120 134 125 124 130 C 117 134 114 136 110 136 C 106 136 103 134 96 130 C 86 125 66 120 66 104 Z"
              fill="#4B3329"
            />

            {/* Squinting Joyful Eyes with Teal Glints */}
            <Path
              d="M 74 102 C 79 93 90 94 95 103 C 88 100 80 100 74 102 Z"
              fill="#1FE0BA"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Circle cx="82" cy="98" r="2" fill="#FFFFFF" />
            <Path
              d="M 122 103 C 127 94 138 93 143 102 C 137 100 129 100 122 103 Z"
              fill="#1FE0BA"
              stroke="#2A1810"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <Circle cx="129" cy="98" r="2" fill="#FFFFFF" />

            {/* Nose, Open Happy Mouth & Whiskers */}
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

        {/* Animated Flying Water Droplets & Cyan Sparkles */}
        <Animated.View style={[StyleSheet.absoluteFill, effectLayerStyle]} pointerEvents="none">
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

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE 5: ICONIC LOGO HEAD MASCOT (assets/images/logo.svg)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { width: size, height: size }, style]}>
      {withGlow && (
        <View
          style={[
            styles.ambientGlow,
            {
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: (size * 0.8) / 2,
              backgroundColor: glowColor,
            },
          ]}
        />
      )}
      <Animated.View style={[{ width: size, height: size }, mainAnimStyle]}>
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
            <LinearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#68D458" />
              <Stop offset="100%" stopColor="#43AA38" />
            </LinearGradient>
          </Defs>

          {/* Left Ear */}
          <Path
            d="M 48 116 C 43 76 50 44 61 37 C 71 31 95 54 109 73 Z"
            fill="#4B3329"
            stroke="#2A1810"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <Path d="M 55 108 C 52 78 57 53 64 48 C 72 44 90 62 101 76 Z" fill="#5E4136" />
          <Path d="M 62 50 C 70 64 78 78 83 89" stroke="#2A1810" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Right Ear */}
          <Path
            d="M 192 116 C 197 76 190 44 179 37 C 169 31 145 54 131 73 Z"
            fill="#4B3329"
            stroke="#2A1810"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <Path d="M 185 108 C 188 78 183 53 176 48 C 168 44 150 62 139 76 Z" fill="#5E4136" />
          <Path d="M 178 50 C 170 64 162 78 157 89" stroke="#2A1810" strokeWidth="5" strokeLinecap="round" fill="none" />

          {/* Top Nutrition Sprout */}
          <Path d="M 120 70 L 120 55" stroke="#25853E" strokeWidth="5" strokeLinecap="round" />
          <Path
            d="M 120 60 C 106 60 99 50 100 41 C 110 40 119 47 120 60 Z"
            fill="url(#leafGrad)"
            stroke="#1E6F35"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M 120 60 C 114 53 109 48 105 45" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <Path
            d="M 120 58 C 121 41 132 33 145 34 C 145 48 135 58 120 58 Z"
            fill="url(#leafGrad)"
            stroke="#1E6F35"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M 120 58 C 126 49 132 43 138 39" stroke="#1E6F35" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Head Silhouette with Cheek Tufts */}
          <Path
            d="M 48 112 C 42 128 38 147 36 154 L 44 157 L 39 164 C 54 192 84 206 120 206 C 156 206 186 192 201 164 L 196 157 L 204 154 C 202 147 198 128 192 112 C 176 78 150 68 120 68 C 90 68 64 78 48 112 Z"
            fill="#F5E8D0"
            stroke="#2A1810"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <Path
            d="M 46 166 C 62 190 88 202 120 202 C 152 202 178 190 194 166 C 176 184 150 193 120 193 C 90 193 64 184 46 166 Z"
            fill="#E6D2B5"
          />

          {/* Siamese Dark Brown Face Mask */}
          <Path
            d="M 56 136 C 56 106 82 90 120 90 C 158 90 184 106 184 136 C 184 158 164 172 146 181 C 134 187 127 189 120 189 C 113 189 106 187 94 181 C 76 172 56 158 56 136 Z"
            fill="#4B3329"
          />

          {/* Left Eye (Happy Wink Arch) */}
          <Path
            d="M 73 139 C 79 121 96 121 102 139"
            stroke="#2A1810"
            strokeWidth="6.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Eye (6-Blade Camera Aperture Shutter + Viewfinder Ticks) */}
          <Circle cx="151" cy="134" r="30" fill="url(#shutterGlow)" />
          <Line x1="151" y1="103" x2="151" y2="108" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="151" y1="160" x2="151" y2="165" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="120" y1="134" x2="125" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="177" y1="134" x2="182" y2="134" stroke="#28F59C" strokeWidth="2.5" strokeLinecap="round" />

          <Circle cx="151" cy="134" r="21" fill="#141F1A" />
          <Circle cx="151" cy="134" r="17" fill="url(#shutterIris)" />
          <Polygon points="151,126 158,130 158,138 151,142 144,138 144,130" fill="#141F1A" />
          <Line x1="151" y1="126" x2="161" y2="118" stroke="#141F1A" strokeWidth="3" />
          <Line x1="158" y1="130" x2="168" y2="134" stroke="#141F1A" strokeWidth="3" />
          <Line x1="158" y1="138" x2="161" y2="150" stroke="#141F1A" strokeWidth="3" />
          <Line x1="151" y1="142" x2="141" y2="150" stroke="#141F1A" strokeWidth="3" />
          <Line x1="144" y1="138" x2="134" y2="134" stroke="#141F1A" strokeWidth="3" />
          <Line x1="144" y1="130" x2="141" y2="118" stroke="#141F1A" strokeWidth="3" />

          {/* Pink Nose & Cat Smile */}
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

          {/* Celebratory Sparkles when celebrating */}
          {mood === 'celebrating' && (
            <G>
              <Path d="M 24 44 L 27 52 L 35 55 L 27 58 L 24 66 L 21 58 L 13 55 L 21 52 Z" fill="#34D399" />
              <Path d="M 214 38 L 217 45 L 224 48 L 217 51 L 214 58 L 211 51 L 204 48 L 211 45 Z" fill="#FBBF24" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
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
