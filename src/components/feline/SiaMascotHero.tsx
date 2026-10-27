import React from 'react';
import { View, Text, Image, Pressable, StyleProp, ViewStyle } from 'react-native';
import { hapticFeedback } from '../../utils/haptics';

export type MascotPose = 'scanner' | 'chef' | 'water' | 'logo';

interface SiaMascotHeroProps {
  pose?: MascotPose;
  size?: number;
  speechText?: string;
  badge?: string;
  onPress?: () => void;
  withGlow?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MASCOT_IMAGES: Record<MascotPose, any> = {
  scanner: require('../../../assets/images/mascot-scanner.png'),
  chef: require('../../../assets/images/mascot-chef.png'),
  water: require('../../../assets/images/mascot-water.png'),
  logo: require('../../../assets/images/logo.png'),
};

/**
 * SiaMascotHero - Signature character hero displaying Sia in customized poses
 * with transparent native integration, speech bubble, and subtle emerald ambient glow.
 */
export function SiaMascotHero({
  pose = 'chef',
  size = 110,
  speechText,
  badge,
  onPress,
  withGlow = true,
  style,
}: SiaMascotHeroProps) {
  const handlePress = () => {
    hapticFeedback.purr();
    onPress?.();
  };

  const imageSource = MASCOT_IMAGES[pose] || MASCOT_IMAGES.logo;

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

      {/* Seamless Integrated Character Illustration (No white background, no circular crop) */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <View className="relative items-center justify-center">
          {/* Soft ambient emerald backlight */}
          {withGlow && (
            <View
              style={{
                position: 'absolute',
                width: size * 0.85,
                height: size * 0.85,
                borderRadius: (size * 0.85) / 2,
                backgroundColor: pose === 'water' ? '#06b6d4' : '#10b981',
                opacity: 0.12,
              }}
            />
          )}

          {/* Transparent Character Illustration */}
          <Image
            source={imageSource}
            style={{
              width: size,
              height: size,
            }}
            resizeMode="contain"
          />

          {/* Optional Badge Overlap */}
          {badge && (
            <View className="absolute -bottom-1 bg-emerald-500 border border-zinc-950 px-2.5 py-0.5 rounded-full shadow-sm">
              <Text className="text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                {badge}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

export default SiaMascotHero;
