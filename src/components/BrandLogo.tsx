import React from 'react';
import { View, Text } from 'react-native';
import SiaCatMascot from './SiaCatMascot';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function BrandLogo({ size = 'md', showTagline = true }: BrandLogoProps) {
  const imageDimension = size === 'lg' ? 76 : size === 'md' ? 58 : 40;
  const titleSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg';

  return (
    <View className="items-center">
      {/* SiaMeal Cat Mascot Icon Avatar */}
      <View className="mb-3 items-center justify-center">
        <SiaCatMascot size={imageDimension} mood="happy" withGlow={true} />
      </View>

      {/* Styled Brand Title */}
      <View className="flex-row items-baseline">
        <Text
          style={{ fontFamily: 'Outfit_900Black' }}
          className={`${titleSize} text-white tracking-tight`}
        >
          Sia
        </Text>
        <Text
          style={{ fontFamily: 'Outfit_900Black' }}
          className={`${titleSize} text-emerald-400 tracking-tight`}
        >
          Meal
        </Text>
        <Text
          style={{ fontFamily: 'Outfit_900Black' }}
          className={`${titleSize} text-sky-400 tracking-tight ml-1`}
        >
          Snap
        </Text>
        <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1 mb-1" />
      </View>

      {showTagline && (
        <Text
          style={{ fontFamily: 'PlusJakartaSans_500Medium' }}
          className="text-zinc-400 text-xs mt-1 font-medium tracking-wide text-center"
        >
          AI Photo-First Nutrition & Macros
        </Text>
      )}
    </View>
  );
}
