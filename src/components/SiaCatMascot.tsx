import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import {
  SiaVectorCat,
  SiaVectorMood,
  SiaAnimationMode,
} from './feline/SiaVectorCat';

export type SiaMood = SiaVectorMood;

export interface SiaCatMascotProps {
  /** Diameter of the mascot in pixels. Default: 64 */
  size?: number;
  /** Emotional state or outfit of the mascot. Default: 'idle' */
  mood?: SiaMood;
  /** Explicit animation mode ('auto' | 'walk' | 'breathe' | 'scan' | 'celebrate' | 'water' | 'think' | 'none') */
  animation?: SiaAnimationMode;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to show outer emerald/cyan ambient glow */
  withGlow?: boolean;
  /** Kept for backwards compatibility — always renders as native uncropped SVG vector */
  standalone?: boolean;
  /** Enable interactive tap-to-pet squash & heart reaction */
  interactive?: boolean;
  /** Optional callback when mascot is tapped */
  onPress?: () => void;
}

/**
 * SiaCatMascot - Official 100% Native 2D Vector SVG Mascot for SiaMeal Snap.
 * Multi-part skeletal animation on the UI thread via Reanimated 4.
 */
export default function SiaCatMascot({
  size = 64,
  mood = 'idle',
  animation = 'auto',
  style,
  withGlow = true,
  interactive = false,
  onPress,
}: SiaCatMascotProps) {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <SiaVectorCat
        size={size}
        mood={mood}
        animation={animation}
        withGlow={withGlow}
        interactive={interactive}
        onPress={onPress}
      />
    </View>
  );
}

export { SiaCatMascot };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
