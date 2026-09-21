import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SiaCatMascot, { SiaMood } from './SiaCatMascot';

interface FelineEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  mood?: SiaMood;
}

export function FelineEmptyState({
  title = 'Sia is Snoozing...',
  description = 'No catches logged yet today! Snap a photo or quick-type your meal to wake Sia up and feed your macro rings.',
  actionLabel = 'Snap Your First Catch',
  onAction,
  mood = 'idle',
}: FelineEmptyStateProps) {
  return (
    <View className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 items-center text-center my-3 shadow-sm shadow-black">
      <View className="mb-3.5">
        <SiaCatMascot size={68} mood={mood} withGlow={true} />
      </View>

      <Text
        style={{ fontFamily: 'Outfit_800ExtraBold' }}
        className="text-white text-base text-center mb-1.5"
      >
        {title}
      </Text>

      <Text className="text-zinc-400 text-xs text-center leading-relaxed max-w-[280px] mb-4">
        {description}
      </Text>

      {onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-2.5 px-5 flex-row items-center gap-2 shadow-sm shadow-emerald-500/20"
        >
          <MaterialCommunityIcons name="camera-iris" size={16} color="#ffffff" />
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-xs font-bold uppercase tracking-wider"
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
