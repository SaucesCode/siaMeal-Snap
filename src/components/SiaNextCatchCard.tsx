import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal } from '../types';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import SiaCatMascot from './SiaCatMascot';
import { getSiaForecastRecommendation } from '../utils/mealForecastEngine';

interface SiaNextCatchCardProps {
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  consumed: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  loggedMeals: Meal[];
}

export function SiaNextCatchCard({ targets, consumed, loggedMeals }: SiaNextCatchCardProps) {
  const router = useRouter();
  const { setDraftMeal } = useMealStore();
  const [cycleIndex, setCycleIndex] = useState(0);

  const forecast = useMemo(() => {
    return getSiaForecastRecommendation({
      targets,
      consumed,
      loggedMeals,
      cycleIndex,
    });
  }, [targets, consumed, loggedMeals, cycleIndex]);

  const handleCycleNext = () => {
    hapticFeedback.selection();
    setCycleIndex((prev) => prev + 1);
  };

  const handleLogCatch = () => {
    hapticFeedback.medium();
    const item = forecast.catch;

    setDraftMeal({
      name: item.name,
      meal_type: item.mealType,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      food_items: item.ingredients,
      image_url: null,
    });

    router.push('/review' as any);
  };

  return (
    <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 mb-5 shadow-sm shadow-black">
      {/* Top Header Row: Feline Status Badge & Paw Another Button */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <Ionicons
            name={(forecast.statusIcon as any) || 'restaurant-outline'}
            size={12}
            color={forecast.statusColor}
          />
          <Text
            style={{ fontFamily: 'Outfit_700Bold', color: forecast.statusColor }}
            className="text-[10px] tracking-wider uppercase"
          >
            {forecast.statusBadge}
          </Text>
        </View>

        {!forecast.isGoalMet && (
          <TouchableOpacity
            onPress={handleCycleNext}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-800/80 active:bg-zinc-700/80 border border-zinc-700/60"
          >
            <Ionicons name="refresh" size={11} color="#a1a1aa" />
            <Text className="text-zinc-400 text-[11px] font-semibold">Paw another</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content Area: Mascot + Catch Title & Tag */}
      <View className="flex-row items-center gap-3.5 mb-3.5">
        <View className="w-13 h-13 rounded-2xl bg-zinc-950/80 border border-emerald-500/20 items-center justify-center p-1">
          <SiaCatMascot
            size={48}
            mood={forecast.isGoalMet ? 'celebrating' : 'happy'}
            withGlow={false}
          />
        </View>

        <View className="flex-1 pr-1">
          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-[15px] leading-5 flex-1"
              numberOfLines={2}
            >
              {forecast.catch.name}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            <View className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <Text className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                {forecast.catch.tag}
              </Text>
            </View>
            <Text className="text-zinc-500 text-[11px] font-medium">
              {forecast.slotLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Macronutrient Pills */}
      {!forecast.isGoalMet && (
        <View className="flex-row items-center justify-between gap-1.5 mb-3 bg-zinc-950/60 rounded-2xl p-2.5 border border-zinc-800/40">
          <View className="flex-1 items-center">
            <Text className="text-zinc-500 text-[10px] font-semibold uppercase">Energy</Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-xs mt-0.5"
            >
              {forecast.catch.calories} kcal
            </Text>
          </View>

          <View className="h-4 w-[1px] bg-zinc-800" />

          <View className="flex-1 items-center">
            <Text className="text-zinc-500 text-[10px] font-semibold uppercase">Protein</Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-emerald-400 text-xs mt-0.5"
            >
              {forecast.catch.protein_g}g
            </Text>
          </View>

          <View className="h-4 w-[1px] bg-zinc-800" />

          <View className="flex-1 items-center">
            <Text className="text-zinc-500 text-[10px] font-semibold uppercase">Carbs</Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-amber-400 text-xs mt-0.5"
            >
              {forecast.catch.carbs_g}g
            </Text>
          </View>

          <View className="h-4 w-[1px] bg-zinc-800" />

          <View className="flex-1 items-center">
            <Text className="text-zinc-500 text-[10px] font-semibold uppercase">Fat</Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-rose-400 text-xs mt-0.5"
            >
              {forecast.catch.fat_g}g
            </Text>
          </View>
        </View>
      )}

      {/* Sia's Coach Wisdom Note */}
      <View className="bg-zinc-950/80 rounded-2xl p-3 border border-zinc-800/70 flex-row items-start gap-2.5">
        <MaterialCommunityIcons
          name={forecast.isGoalMet ? 'party-popper' : 'cat'}
          size={16}
          color={forecast.statusColor}
          style={{ marginTop: 1 }}
        />
        <Text className="text-zinc-300 text-xs leading-4 flex-1">
          {forecast.isGoalMet ? forecast.goalMetMessage : forecast.catch.felineNote}
        </Text>
      </View>

      {/* Action Button: Review & Log */}
      {!forecast.isGoalMet ? (
        <TouchableOpacity
          onPress={handleLogCatch}
          activeOpacity={0.85}
          className="mt-3 bg-emerald-500 active:bg-emerald-600 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2 shadow-sm"
        >
          <MaterialCommunityIcons name="silverware-fork-knife" size={15} color="#ffffff" />
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-white text-xs font-bold uppercase tracking-wider"
          >
            Review & Log Catch
          </Text>
          <Ionicons name="arrow-forward" size={13} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/water' as any)}
          activeOpacity={0.85}
          className="mt-3 bg-cyan-500/20 border border-cyan-500/40 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2"
        >
          <Ionicons name="water" size={15} color="#06b6d4" />
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-cyan-400 text-xs font-bold uppercase tracking-wider"
          >
            Hydration Station
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
