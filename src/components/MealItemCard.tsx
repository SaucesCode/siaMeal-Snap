import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../types';
import { hapticFeedback } from '../utils/haptics';

interface MealItemCardProps {
  meal: Meal;
  onDelete: (id: string) => void;
  onPress?: (meal: Meal) => void;
}

interface CategoryConfig {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  border: string;
}

const CATEGORY_CONFIG: Record<MealType, CategoryConfig> = {
  breakfast: {
    title: 'Morning Pounce',
    icon: 'cat',
    color: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  lunch: {
    title: 'Midday Catch',
    icon: 'fish',
    color: '#10b981',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  dinner: {
    title: 'Night Prowl',
    icon: 'weather-night',
    color: '#818cf8',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
  },
  snack: {
    title: 'Paws & Treats',
    icon: 'paw',
    color: '#06b6d4',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
};

export function MealItemCard({ meal, onDelete, onPress }: MealItemCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleDelete = () => {
    hapticFeedback.medium();
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            hapticFeedback.success();
            onDelete(meal.id);
          },
        },
      ]
    );
  };

  const mealType = meal.meal_type || 'snack';
  const config = CATEGORY_CONFIG[mealType] || CATEGORY_CONFIG.snack;
  const foodItems = meal.food_items && Array.isArray(meal.food_items) ? meal.food_items : [];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        hapticFeedback.light();
        onPress?.(meal);
      }}
      className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 mb-3 shadow-md shadow-black/40"
    >
      {/* Top Header: Image/Icon, Title & Delete Trigger */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 flex-row items-center gap-3.5 mr-2">
          {/* Photo or Category Icon Disc */}
          {meal.image_url && !imageError ? (
            <Image
              source={{ uri: meal.image_url }}
              className="w-13 h-13 rounded-2xl border border-zinc-800"
              style={{ width: 52, height: 52 }}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View
              className={`w-13 h-13 rounded-2xl ${config.bg} border ${config.border} items-center justify-center`}
              style={{ width: 52, height: 52 }}
            >
              <MaterialCommunityIcons name={config.icon} size={22} color={config.color} />
            </View>
          )}

          <View className="flex-1">
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-base"
              numberOfLines={1}
            >
              {meal.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Text className="text-zinc-500 text-xs font-semibold">
                {formatTime(meal.logged_at)}
              </Text>
              <Text className="text-zinc-700 text-xs">•</Text>
              <Text
                style={{ color: config.color }}
                className="text-[11px] font-bold uppercase tracking-wider"
              >
                {config.title}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="w-8 h-8 rounded-full bg-zinc-800/70 items-center justify-center"
        >
          <Ionicons name="trash-outline" size={15} color="#71717a" />
        </TouchableOpacity>
      </View>

      {/* Ingredients Chips Preview (if available) */}
      {foodItems.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {foodItems.slice(0, 3).map((item, idx) => (
            <View
              key={idx}
              className="bg-zinc-950/80 border border-zinc-800/80 px-2 py-0.5 rounded-lg"
            >
              <Text className="text-zinc-400 text-[10px] font-medium" numberOfLines={1}>
                {item}
              </Text>
            </View>
          ))}
          {foodItems.length > 3 && (
            <View className="bg-zinc-950/80 border border-zinc-800/80 px-1.5 py-0.5 rounded-lg">
              <Text className="text-zinc-500 text-[10px] font-bold">
                +{foodItems.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Macronutrient Metric Strip */}
      <View className="flex-row items-center justify-between pt-2.5 border-t border-zinc-800/60">
        <View className="flex-row items-baseline gap-1">
          <Text
            style={{ fontFamily: 'Outfit_900Black' }}
            className="text-white text-base"
          >
            {Math.round(meal.calories)}
          </Text>
          <Text className="text-emerald-400 text-xs font-bold">kcal</Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Protein */}
          <View className="bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <Text className="text-blue-400 text-xs font-extrabold">
              {Math.round(meal.protein_g)}g <Text className="text-zinc-500 font-normal text-[10px]">P</Text>
            </Text>
          </View>

          {/* Carbs */}
          <View className="bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
            <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <Text className="text-amber-400 text-xs font-extrabold">
              {Math.round(meal.carbs_g)}g <Text className="text-zinc-500 font-normal text-[10px]">C</Text>
            </Text>
          </View>

          {/* Fat */}
          <View className="bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
            <View className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <Text className="text-rose-400 text-xs font-extrabold">
              {Math.round(meal.fat_g)}g <Text className="text-zinc-500 font-normal text-[10px]">F</Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
