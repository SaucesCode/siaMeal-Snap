import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SiaMascotHero } from './feline/SiaMascotHero';
import { SiaMood } from './SiaCatMascot';

interface FelineEmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  mood?: SiaMood;
  timeAware?: boolean;
}

const getDynamicTimeState = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return {
      title: 'Sia is Yawning Awake...',
      description: 'Morning prowl has begun! Snap a photo or log your breakfast to awaken Sia and fill your macro rings.',
      actionLabel: 'Snap Morning Catch',
      mood: 'idle' as SiaMood,
    };
  }
  if (hour < 18) {
    return {
      title: 'Midday Hunt is Open...',
      description: 'Sia is scouting for lunch! Snap your meal to feed your protein targets and keep your day energized.',
      actionLabel: 'Snap Lunch Catch',
      mood: 'scanning' as SiaMood,
    };
  }
  return {
    title: "Sia's Claws Are Twitching!",
    description: "Night prowl is active and zero prey logged yet! Don't let your hunter streak slip before midnight.",
    actionLabel: 'Snap Evening Feast',
    mood: 'thinking' as SiaMood,
  };
};

export function FelineEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  mood,
  timeAware = true,
}: FelineEmptyStateProps) {
  const dynamic = timeAware ? getDynamicTimeState() : null;

  const resolvedTitle = title || dynamic?.title || 'Sia is Snoozing...';
  const resolvedDesc = description || dynamic?.description || 'No catches logged yet today! Snap a photo or quick-type your meal to wake Sia up and feed your macro rings.';
  const resolvedAction = actionLabel || dynamic?.actionLabel || 'Snap Your First Catch';
  const resolvedMood = mood || dynamic?.mood || 'idle';

  return (
    <View className="bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-6 items-center text-center my-3 shadow-sm shadow-black">
      <View className="mb-3.5">
        <SiaMascotHero
          size={86}
          pose={
            resolvedMood === 'scanning'
              ? 'scanner'
              : resolvedMood === 'sleeping'
              ? 'sleeping'
              : 'chef'
          }
          badge={timeAware ? 'Sia on Prowl' : undefined}
          withGlow={false}
          onPress={onAction}
        />
      </View>

      <Text
        style={{ fontFamily: 'Outfit_800ExtraBold' }}
        className="text-white text-base text-center mb-1.5"
      >
        {resolvedTitle}
      </Text>

      <Text className="text-zinc-400 text-xs text-center leading-relaxed max-w-[280px] mb-4">
        {resolvedDesc}
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
            {resolvedAction}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
