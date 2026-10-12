import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, Pressable, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
  scanner: require('../../../assets/images/mascot-scanner.jpg'),
  chef: require('../../../assets/images/mascot-chef.jpg'),
  water: require('../../../assets/images/mascot-water.jpg'),
  logo: require('../../../assets/images/logo.jpg'),
};

/**
 * SiaMascotHero - Signature character hero displaying Sia in customized poses
 * with gentle floating physics, speech bubble, and emerald ring glow.
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
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

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

      {/* Floating Animated Mascot Avatar */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <Animated.View
          style={{
            transform: [{ translateY: floatAnim }],
          }}
          className="relative items-center justify-center"
        >
          {/* Glow backdrop disc */}
          <View
            style={{
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              shadowColor: '#10b981',
              shadowOpacity: withGlow ? 0.45 : 0,
              shadowRadius: 18,
              elevation: withGlow ? 12 : 0,
            }}
            className="items-center justify-center bg-zinc-950 border-2 border-emerald-500/35 overflow-hidden"
          >
            {/* Mascot Image */}
            <Image
              source={imageSource}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
              }}
              resizeMode="cover"
            />
          </View>

          {/* Optional Badge Overlap */}
          {badge && (
            <View className="absolute -bottom-1 bg-emerald-500 border border-zinc-950 px-2.5 py-0.5 rounded-full shadow-sm">
              <Text className="text-zinc-950 text-[10px] font-black uppercase tracking-wider">
                {badge}
              </Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

export default SiaMascotHero;
