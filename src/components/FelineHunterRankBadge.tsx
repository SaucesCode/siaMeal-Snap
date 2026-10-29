import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getFelineHunterRank, FELINE_TIERS } from '../utils/felineGamification';
import { hapticFeedback } from '../utils/haptics';
import SiaCatMascot from './SiaCatMascot';

interface FelineHunterRankBadgeProps {
  streakDays: number;
  compact?: boolean;
}

export function FelineHunterRankBadge({ streakDays, compact = false }: FelineHunterRankBadgeProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const rank = getFelineHunterRank(streakDays);

  const handleOpenModal = () => {
    hapticFeedback.light();
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    hapticFeedback.light();
    setModalVisible(false);
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          onPress={handleOpenModal}
          activeOpacity={0.75}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm"
        >
          <View
            className={`w-6 h-6 rounded-full ${rank.currentTier.badgeBg} border ${rank.currentTier.badgeBorder} items-center justify-center`}
          >
            <MaterialCommunityIcons
              name={rank.currentTier.icon}
              size={13}
              color={rank.currentTier.accentColor}
            />
          </View>

          <View className="flex-row items-center gap-1">
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-white text-xs"
            >
              {streakDays}d
            </Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold', color: rank.currentTier.accentColor }}
              className="text-[11px]"
            >
              {rank.currentTier.title}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={10} color="#71717a" />
        </TouchableOpacity>

        {/* Milestones Modal */}
        <MilestonesModal
          visible={modalVisible}
          onClose={handleCloseModal}
          currentStreak={streakDays}
          rank={rank}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleOpenModal}
        activeOpacity={0.85}
        className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 shadow-sm shadow-black"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/60 border border-zinc-700/60">
            <MaterialCommunityIcons
              name={rank.currentTier.icon}
              size={12}
              color={rank.currentTier.accentColor}
            />
            <Text
              style={{ fontFamily: 'Outfit_700Bold', color: rank.currentTier.accentColor }}
              className="text-[10px] tracking-wider uppercase"
            >
              Tier {rank.currentTier.tierNumber} of 6 • {rank.currentTier.tagline}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Text className="text-zinc-500 text-[11px] font-semibold">All Ranks</Text>
            <Ionicons name="chevron-forward" size={12} color="#71717a" />
          </View>
        </View>

        <View className="flex-row items-center gap-3.5 mb-3">
          <View className="items-center justify-center">
            <SiaCatMascot
              size={54}
              mood={rank.streakDays >= 7 ? 'celebrating' : 'happy'}
              withGlow={false}
            />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {rank.currentTier.title}
              </Text>
              <View className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                <Text className="text-emerald-400 text-[10px] font-bold">
                  {rank.streakDays} {rank.streakDays === 1 ? 'Day' : 'Days'} Streak
                </Text>
              </View>
            </View>
            <Text className="text-zinc-400 text-xs leading-4">
              {rank.currentTier.description}
            </Text>
          </View>
        </View>

        {/* Progress Bar toward next tier */}
        {!rank.isMaxTier && rank.nextTier && (
          <View className="bg-zinc-950/70 rounded-2xl p-3 border border-zinc-800/70">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-zinc-400 text-[11px] font-medium">
                Next Rank: <Text className="text-white font-bold">{rank.nextTier.title}</Text>
              </Text>
              <Text className="text-emerald-400 text-[11px] font-bold">
                {rank.daysToNextTier} {rank.daysToNextTier === 1 ? 'day' : 'days'} left
              </Text>
            </View>
            <View className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <View
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${rank.progressPercent}%` }}
              />
            </View>
          </View>
        )}
      </TouchableOpacity>

      <MilestonesModal
        visible={modalVisible}
        onClose={handleCloseModal}
        currentStreak={streakDays}
        rank={rank}
      />
    </>
  );
}

interface MilestonesModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  rank: ReturnType<typeof getFelineHunterRank>;
}

function MilestonesModal({ visible, onClose, currentStreak, rank }: MilestonesModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[85%] pb-8">
          {/* Modal Header */}
          <View className="p-5 border-b border-zinc-800/80 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
                <MaterialCommunityIcons name="trophy-award" size={20} color="#10b981" />
              </View>
              <View>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-base"
                >
                  Feline Hunter Dossier
                </Text>
                <Text className="text-zinc-400 text-xs">
                  Current Streak: <Text className="text-emerald-400 font-bold">{currentStreak} Days</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Ionicons name="close" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
            {/* Active Tier Highlight Card */}
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 mb-4 flex-row items-center gap-3.5">
              <SiaCatMascot size={46} mood="celebrating" withGlow={false} />
              <View className="flex-1">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-emerald-400 text-xs uppercase tracking-wider mb-0.5"
                >
                  Current Hunter Rank
                </Text>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-sm"
                >
                  {rank.currentTier.title} ({rank.streakDays} Days Active)
                </Text>
                <Text className="text-zinc-300 text-xs mt-1 leading-4">
                  "{rank.currentTier.siaWisdom}"
                </Text>
              </View>
            </View>

            {/* 7-Day Paw Trail Strip */}
            <View className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name="paw" size={14} color="#10b981" />
                  <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">
                    7-Day Hunting Trail
                  </Text>
                </View>
                <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-emerald-400 text-xs">
                  {currentStreak}d Consistency
                </Text>
              </View>

              {/* 7 Day Pods (Mon -> Sun) */}
              <View className="flex-row justify-between items-center mb-3">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLabel, index) => {
                  const todayDay = (new Date().getDay() + 6) % 7;
                  const isPastOrToday = index <= todayDay;
                  const isToday = index === todayDay;
                  const daysAgo = todayDay - index;
                  const isActive = isPastOrToday && daysAgo >= 0 && daysAgo < currentStreak;

                  return (
                    <View key={index} className="items-center gap-1.5">
                      <View
                        className={`w-9 h-9 rounded-2xl items-center justify-center border ${
                          isActive
                            ? 'bg-emerald-500/20 border-emerald-500 shadow-sm shadow-emerald-500/30'
                            : isToday
                            ? 'bg-zinc-900 border-cyan-500/60'
                            : 'bg-zinc-950 border-zinc-800/60'
                        }`}
                      >
                        <MaterialCommunityIcons
                          name={isActive ? 'paw' : 'paw-off'}
                          size={15}
                          color={isActive ? '#10b981' : isToday ? '#06b6d4' : '#3f3f46'}
                        />
                      </View>
                      <Text
                        style={{ fontFamily: isToday ? 'Outfit_800ExtraBold' : 'Outfit_600SemiBold' }}
                        className={`text-[10px] ${
                          isToday ? 'text-cyan-400' : isActive ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      >
                        {dayLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Next Rank Unlock Bar */}
              {!rank.isMaxTier && rank.nextTier && (
                <View className="bg-zinc-950 rounded-2xl p-2.5 border border-zinc-800/60">
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center gap-1.5">
                      <MaterialCommunityIcons name="lightning-bolt" size={12} color="#34d399" />
                      <Text className="text-zinc-400 text-[10px] font-semibold">
                        Next Tier: <Text className="text-white font-bold">{rank.nextTier.title}</Text>
                      </Text>
                    </View>
                    <Text className="text-emerald-400 text-[10px] font-extrabold">
                      {rank.daysToNextTier} {rank.daysToNextTier === 1 ? 'day' : 'days'} left
                    </Text>
                  </View>
                  <View className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${rank.progressPercent}%` }}
                    />
                  </View>
                </View>
              )}
            </View>

            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-3 px-1">
              All Milestone Ranks
            </Text>

            {/* List of Tiers */}
            {FELINE_TIERS.map((tier) => {
              const isCurrent = tier.tierNumber === rank.currentTier.tierNumber;
              const isUnlocked = currentStreak >= tier.minStreakDays;
              const isLocked = !isUnlocked;

              return (
                <View
                  key={tier.id}
                  className={`p-3.5 rounded-2xl mb-2.5 border ${
                    isCurrent
                      ? 'bg-zinc-900 border-emerald-500/50'
                      : isUnlocked
                      ? 'bg-zinc-900/60 border-zinc-800/80'
                      : 'bg-zinc-950/40 border-zinc-900 opacity-60'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View
                        className={`w-9 h-9 rounded-xl ${tier.badgeBg} border ${tier.badgeBorder} items-center justify-center`}
                      >
                        <MaterialCommunityIcons
                          name={tier.icon}
                          size={18}
                          color={tier.accentColor}
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className="text-white text-sm"
                          >
                            {tier.title}
                          </Text>
                          <Text className="text-zinc-500 text-[10px]">
                            {tier.minStreakDays === 0
                              ? 'Day 0'
                              : tier.maxStreakDays > 1000
                              ? '30+ Days'
                              : `${tier.minStreakDays}–${tier.maxStreakDays} Days`}
                          </Text>
                        </View>
                        <Text className="text-zinc-400 text-[11px] mt-0.5">
                          {tier.tagline}
                        </Text>
                      </View>
                    </View>

                    {isCurrent ? (
                      <View className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                        <Text className="text-emerald-400 text-[10px] font-bold uppercase">
                          Active
                        </Text>
                      </View>
                    ) : isUnlocked ? (
                      <View className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 items-center justify-center">
                        <Ionicons name="checkmark" size={12} color="#10b981" />
                      </View>
                    ) : (
                      <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        <Ionicons name="lock-closed" size={10} color="#71717a" />
                        <Text className="text-zinc-500 text-[10px] font-medium">
                          {tier.minStreakDays - currentStreak}d away
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
