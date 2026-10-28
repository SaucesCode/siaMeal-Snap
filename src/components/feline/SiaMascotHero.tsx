import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { hapticFeedback } from '../../utils/haptics';
import {
  SiaVectorCat,
  SiaVectorMood,
  SiaAnimationMode,
} from './SiaVectorCat';

export type MascotPose =
  | 'scanner'
  | 'chef'
  | 'water'
  | 'logo'
  | 'walking'
  | 'celebrating'
  | 'thinking';

interface SiaMascotHeroProps {
  pose?: MascotPose;
  size?: number;
  speechText?: string;
  badge?: string;
  onPress?: () => void;
  withGlow?: boolean;
  animation?: SiaAnimationMode;
  style?: StyleProp<ViewStyle>;
}

const POSE_TO_MOOD: Record<MascotPose, SiaVectorMood> = {
  scanner: 'scanning',
  chef: 'chef',
  water: 'water',
  logo: 'happy',
  walking: 'walking',
  celebrating: 'celebrating',
  thinking: 'thinking',
};

/**
 * SiaMascotHero - Signature 100% vector character hero displaying Sia in customized poses
 * with UI-thread animations, speech bubble, and subtle ambient glow.
 */
export function SiaMascotHero({
  pose = 'chef',
  size = 110,
  speechText,
  badge,
  onPress,
  withGlow = true,
  animation = 'auto',
  style,
}: SiaMascotHeroProps) {
  const handlePress = () => {
    hapticFeedback.purr();
    onPress?.();
  };

  const resolvedMood = POSE_TO_MOOD[pose] || 'idle';

  return (
    <View style={style} className="items-center my-2">
      {/* Optional Speech Bubble above Sia */}
      {speechText && (
        <View className="mb-2.5 max-w-[85%] bg-zinc-950/95 border border-emerald-500/30 px-3.5 py-2 rounded-2xl shadow-md items-center">
          <Text className="text-zinc-200 text-xs font-semibold text-center leading-4">
            {speechText}
          </Text>
          {/* Speech bubble pointer arrow */}
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 6,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#09090b',
            }}
          />
        </View>
      )}

      {/* Native Vector Character Illustration */}
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        style={({ pressed }) => [
          {
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View className="relative items-center justify-center">
          <SiaVectorCat
            size={size}
            mood={resolvedMood}
            animation={animation}
            withGlow={withGlow}
          />

          {/* Optional Badge Overlap */}
          {badge && (
            <View className="mt-1 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
              <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {badge}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
