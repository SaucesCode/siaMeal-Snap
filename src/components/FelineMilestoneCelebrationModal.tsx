import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { FelineHunterTier } from '../utils/felineGamification';
import { hapticFeedback } from '../utils/haptics';
import SiaCatMascot from './SiaCatMascot';

interface FelineMilestoneCelebrationModalProps {
  visible: boolean;
  tier: FelineHunterTier;
  streakDays: number;
  onClose: () => void;
}

export function FelineMilestoneCelebrationModal({
  visible,
  tier,
  streakDays,
  onClose,
}: FelineMilestoneCelebrationModalProps) {
  useEffect(() => {
    if (visible) {
      hapticFeedback.celebration();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/85 items-center justify-center px-6">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View className="w-full max-w-sm bg-zinc-950 border border-emerald-500/30 rounded-3xl p-6 items-center shadow-2xl relative overflow-hidden">
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center z-10"
          >
            <Ionicons name="close" size={16} color="#a1a1aa" />
          </TouchableOpacity>

          {/* Mascot in Celebratory Mood */}
          <View className="mb-3 mt-2">
            <SiaCatMascot size={84} mood="celebrating" withGlow={true} />
          </View>

          {/* Milestone Badge Pill */}
          <View
            className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full ${tier.badgeBg} border ${tier.badgeBorder} mb-2.5`}
          >
            <MaterialCommunityIcons name={tier.icon} size={14} color={tier.accentColor} />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold', color: tier.accentColor }}
              className="text-[11px] uppercase tracking-wider"
            >
              Tier {tier.tierNumber} Unlocked • {streakDays} Day Streak
            </Text>
          </View>

          {/* Title */}
          <Text
            style={{ fontFamily: 'Outfit_800ExtraBold' }}
            className="text-white text-2xl text-center tracking-tight mb-1"
          >
            {tier.title}
          </Text>

          {/* Tagline */}
          <Text
            style={{ fontFamily: 'Outfit_700Bold', color: tier.accentColor }}
            className="text-xs text-center mb-3"
          >
            "{tier.tagline}"
          </Text>

          {/* Tier Description */}
          <Text className="text-zinc-300 text-xs text-center leading-relaxed mb-4 px-2">
            {tier.description}
          </Text>

          {/* Sia's Personal Feline Wisdom Box */}
          <View className="w-full bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3.5 mb-5 flex-row items-start gap-2.5">
            <MaterialCommunityIcons name="paw" size={16} color="#10b981" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-emerald-400 text-[10px] font-extrabold uppercase mb-0.5">
                Sia's Coaching Note
              </Text>
              <Text className="text-zinc-300 text-[11px] leading-relaxed italic">
                "{tier.siaWisdom}"
              </Text>
            </View>
          </View>

          {/* Claim Action Button */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.purr();
              onClose();
            }}
            activeOpacity={0.85}
            className="w-full py-3.5 bg-emerald-500 rounded-2xl items-center justify-center flex-row gap-2 shadow-lg shadow-emerald-500/25"
          >
            <MaterialCommunityIcons name="crown" size={16} color="#ffffff" />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-white text-sm"
            >
              Claim Rank & Pounce Forward
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
