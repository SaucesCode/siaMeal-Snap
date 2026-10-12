import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface WhiskerDividerProps {
  label?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * WhiskerDivider - Sleek feline divider featuring subtle laser-emerald whiskers
 * flanking a central nose/paw or custom section label.
 */
export function WhiskerDivider({
  label,
  color = '#10b981',
  style,
}: WhiskerDividerProps) {
  return (
    <View style={style} className="flex-row items-center justify-center my-3 px-4">
      {/* Left Whiskers */}
      <View className="flex-1 items-end pr-2">
        <Svg width={46} height={16} viewBox="0 0 46 16" fill="none">
          {/* Top whisker */}
          <Path
            d="M44 8 C30 4, 15 2, 2 3"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
          {/* Center whisker */}
          <Path
            d="M44 8 C28 8, 14 8, 0 8"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeOpacity={0.8}
          />
          {/* Bottom whisker */}
          <Path
            d="M44 8 C30 12, 15 14, 2 13"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
        </Svg>
      </View>

      {/* Center Label or Feline Nose Dot */}
      {label ? (
        <View className="px-3 py-1 bg-zinc-950/90 border border-zinc-800/80 rounded-full flex-row items-center gap-1.5 shadow-sm">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <Text className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
            {label}
          </Text>
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </View>
      ) : (
        <View className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-400 items-center justify-center">
          <View className="w-1 h-1 rounded-full bg-emerald-400" />
        </View>
      )}

      {/* Right Whiskers */}
      <View className="flex-1 items-start pl-2">
        <Svg width={46} height={16} viewBox="0 0 46 16" fill="none">
          {/* Top whisker */}
          <Path
            d="M2 8 C16 4, 31 2, 44 3"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
          {/* Center whisker */}
          <Path
            d="M2 8 C18 8, 32 8, 46 8"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeOpacity={0.8}
          />
          {/* Bottom whisker */}
          <Path
            d="M2 8 C16 12, 31 14, 44 13"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeOpacity={0.45}
          />
        </Svg>
      </View>
    </View>
  );
}

export default WhiskerDivider;
