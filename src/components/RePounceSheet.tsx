import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../types';
import { useMealStore } from '../stores/mealStore';
import { hapticFeedback } from '../utils/haptics';
import SiaCatMascot from './SiaCatMascot';

interface RePounceSheetProps {
  visible: boolean;
  categoryType: MealType;
  categoryTitle: string;
  categoryIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  categoryColor: string;
  onClose: () => void;
  onPounceMeal: (meal: Meal) => void;
}

export function RePounceSheet({
  visible,
  categoryType,
  categoryTitle,
  categoryIcon,
  categoryColor,
  onClose,
  onPounceMeal,
}: RePounceSheetProps) {
  const { getRecentMeals } = useMealStore();
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pouncingId, setPouncingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setSearchQuery('');
      setPouncingId(null);
      getRecentMeals(categoryType, 25)
        .then((items) => {
          setRecentMeals(items);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible, categoryType]);

  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return recentMeals;
    const q = searchQuery.toLowerCase().trim();
    return recentMeals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.food_items?.some((item) => item.toLowerCase().includes(q))
    );
  }, [recentMeals, searchQuery]);

  const formatLoggedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const handlePounce = async (meal: Meal) => {
    setPouncingId(meal.id);
    hapticFeedback.pounce();
    try {
      await onPounceMeal(meal);
      onClose();
    } catch (err) {
      console.error('Re-pounce failed:', err);
    } finally {
      setPouncingId(null);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/80"
      >
        <View className="bg-zinc-900 border-t border-zinc-800 rounded-t-3xl max-h-[85%] p-5 pb-8 shadow-2xl">
          {/* Header Bar */}
          <View className="flex-row items-center justify-between pb-4 border-b border-zinc-800/80">
            <View className="flex-row items-center gap-2.5">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center border"
                style={{
                  backgroundColor: `${categoryColor}20`,
                  borderColor: `${categoryColor}50`,
                }}
              >
                <MaterialCommunityIcons name={categoryIcon} size={20} color={categoryColor} />
              </View>
              <View>
                <Text
                  style={{ fontFamily: 'Outfit_800ExtraBold' }}
                  className="text-white text-lg tracking-tight"
                >
                  Quick Re-Pounce
                </Text>
                <Text className="text-zinc-400 text-xs">
                  Repeat recent {categoryTitle.toLowerCase()} catches in 1-tap
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-zinc-800/80 items-center justify-center border border-zinc-700/60"
            >
              <Ionicons name="close" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Search Filter Bar */}
          <View className="mt-4 mb-3 flex-row items-center bg-zinc-950 border border-zinc-800 rounded-2xl px-3.5 py-2.5 gap-2.5">
            <Ionicons name="search" size={16} color="#71717a" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search past ${categoryTitle.toLowerCase()} catches...`}
              placeholderTextColor="#71717a"
              className="flex-1 text-white text-xs font-semibold"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#71717a" />
              </TouchableOpacity>
            )}
          </View>

          {/* Meals List */}
          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator color="#10b981" size="small" />
              <Text className="text-zinc-500 text-xs font-medium mt-3">
                Fetching past prey vault...
              </Text>
            </View>
          ) : filteredMeals.length === 0 ? (
            <View className="py-12 items-center justify-center px-4">
              <SiaCatMascot mood="thinking" size={72} />
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-base mt-3 text-center"
              >
                No Recent Prey Found
              </Text>
              <Text className="text-zinc-400 text-xs text-center mt-1 max-w-[260px]">
                {searchQuery
                  ? `No past catches match "${searchQuery}". Try a different keyword.`
                  : `Log your next ${categoryTitle.toLowerCase()} catch to unlock 1-tap re-pounces here!`}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="mt-1"
              contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
            >
              {filteredMeals.map((meal) => {
                const isPouncing = pouncingId === meal.id;
                return (
                  <View
                    key={meal.id}
                    className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-3.5 flex-row items-center justify-between shadow-sm"
                  >
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text
                          style={{ fontFamily: 'Outfit_700Bold' }}
                          className="text-white text-sm"
                          numberOfLines={1}
                        >
                          {meal.name}
                        </Text>
                        <View className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md">
                          <Text className="text-zinc-400 text-[10px] font-medium">
                            {formatLoggedDate(meal.logged_at)}
                          </Text>
                        </View>
                      </View>

                      {/* Nutrition Badges */}
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text
                          style={{ fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }}
                          className="text-emerald-400 text-xs"
                        >
                          {Math.round(meal.calories)} kcal
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-zinc-700" />
                        <Text className="text-emerald-300 text-[11px] font-medium">
                          P: {Math.round(meal.protein_g)}g
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-zinc-700" />
                        <Text className="text-sky-300 text-[11px] font-medium">
                          C: {Math.round(meal.carbs_g)}g
                        </Text>
                        <View className="w-1 h-1 rounded-full bg-zinc-700" />
                        <Text className="text-amber-300 text-[11px] font-medium">
                          F: {Math.round(meal.fat_g)}g
                        </Text>
                      </View>
                    </View>

                    {/* 1-Tap Re-Pounce Action Button */}
                    <TouchableOpacity
                      onPress={() => handlePounce(meal)}
                      disabled={isPouncing}
                      activeOpacity={0.8}
                      className="bg-emerald-500/15 border border-emerald-500/40 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5"
                    >
                      {isPouncing ? (
                        <ActivityIndicator color="#10b981" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="repeat" size={15} color="#10b981" />
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold' }}
                            className="text-emerald-400 text-xs"
                          >
                            Pounce
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
