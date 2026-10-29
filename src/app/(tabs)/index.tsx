import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import { useMealStore, getTodayString } from '../../stores/mealStore';
import { useWaterStore } from '../../stores/waterStore';
import { DailyMacroSummary } from '../../components/MacroCard';
import { MealItemCard } from '../../components/MealItemCard';
import { MealDetailModal } from '../../components/MealDetailModal';
import { TextLogModal } from '../../components/TextLogModal';
import { QuickLogActionSheet } from '../../components/QuickLogActionSheet';
import { RePounceSheet } from '../../components/RePounceSheet';
import { useCoachStore } from '../../stores/coachStore';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { compressImage, analyzeMealPhoto } from '../../services/aiService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../../types';
import { hapticFeedback } from '../../utils/haptics';
import { SiaNextCatchCard } from '../../components/SiaNextCatchCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFelineHunterRank, FelineHunterTier } from '../../utils/felineGamification';
import { FelineMilestoneCelebrationModal } from '../../components/FelineMilestoneCelebrationModal';
import { FelineHunterRankBadge } from '../../components/FelineHunterRankBadge';
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner';

interface CategoryHeaderConfig {
  type: MealType;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  badgeBg: string;
}

const CATEGORIES: CategoryHeaderConfig[] = [
  {
    type: 'breakfast',
    title: 'Morning Pounce',
    icon: 'cat',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    type: 'lunch',
    title: 'Midday Catch',
    icon: 'fish',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    type: 'dinner',
    title: 'Night Prowl',
    icon: 'weather-night',
    color: '#818cf8',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/30',
  },
  {
    type: 'snack',
    title: 'Paws & Treats',
    icon: 'paw',
    color: '#06b6d4',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
  },
];

const getCategoryEmptyPrompt = (type: MealType) => {
  switch (type) {
    case 'breakfast':
      return {
        prompt: 'Wake up Sia with breakfast prey',
        sub: 'Start your day with steady macro fuel',
      };
    case 'lunch':
      return {
        prompt: 'Stalk your midday protein catch',
        sub: 'Replenish energy & keep the hunt alive',
      };
    case 'dinner':
      return {
        prompt: 'Night prowl feast & macro recovery',
        sub: 'Feed muscle repair before rest',
      };
    case 'snack':
      return {
        prompt: 'Crunchy treats for active claws',
        sub: 'Top off remaining calories & protein',
      };
    default:
      return {
        prompt: 'Log your catch',
        sub: 'Keep your macro rings balanced',
      };
  }
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const {
    meals,
    fetchMealsForDate,
    deleteMeal,
    setDraftMeal,
    weeklySummary,
    fetchWeeklyStats,
    duplicateMeal,
    getYesterdayMeals,
  } = useMealStore();
  const { addWater, todayMl, dailyGoalMl, loadTodayWater } = useWaterStore();
  const openCoach = useCoachStore((state) => state.openCoach);

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [actionSheetCategory, setActionSheetCategory] = useState<CategoryHeaderConfig | null>(null);
  const [rePounceSheetCategory, setRePounceSheetCategory] = useState<CategoryHeaderConfig | null>(null);
  const [unlockedMilestoneTier, setUnlockedMilestoneTier] = useState<FelineHunterTier | null>(null);
  const [yesterdayMeals, setYesterdayMeals] = useState<Record<MealType, Meal | null>>({
    breakfast: null,
    lunch: null,
    dinner: null,
    snack: null,
  });

  const todayStr = useMemo(() => getTodayString(), []);

  const formattedDate = useMemo(() => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return `TODAY • ${now.toLocaleDateString('en-US', options).toUpperCase()}`;
  }, []);

  useEffect(() => {
    fetchMealsForDate(todayStr);
    fetchWeeklyStats(profile?.target_calories || 2000);
    loadTodayWater();
    getYesterdayMeals().then(setYesterdayMeals).catch(() => {});
  }, [todayStr]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMealsForDate(todayStr),
      fetchWeeklyStats(profile?.target_calories || 2000),
      loadTodayWater(),
      getYesterdayMeals().then(setYesterdayMeals).catch(() => {}),
    ]);
    setRefreshing(false);
  };

  const handleDirectRePounce = async (meal: Meal, targetType?: MealType) => {
    try {
      hapticFeedback.pounce();
      await duplicateMeal(meal, targetType);
      setToast({
        title: 'Re-Pounced Catch',
        message: `Logged "${meal.name}" (${Math.round(meal.calories)} kcal) to today's hunt`,
        type: 'success',
      });
    } catch (err: any) {
      Alert.alert('Re-Pounce Failed', err.message || 'Could not copy meal.');
    }
  };

  const streakDays = weeklySummary?.streakDays || 1;

  // Check and trigger milestone celebration once per tier unlock
  useEffect(() => {
    if (streakDays > 0) {
      const rank = getFelineHunterRank(streakDays);
      if (rank.currentTier.tierNumber > 1) {
        AsyncStorage.getItem('@siamessage_last_celebrated_tier')
          .then((last) => {
            if (last !== rank.currentTier.id) {
              setUnlockedMilestoneTier(rank.currentTier);
            }
          })
          .catch(() => {});
      }
    }
  }, [streakDays]);

  const handleDismissMilestone = async () => {
    if (unlockedMilestoneTier) {
      await AsyncStorage.setItem('@siamessage_last_celebrated_tier', unlockedMilestoneTier.id).catch(() => {});
      setUnlockedMilestoneTier(null);
    }
  };

  // Compute consumed macros with safe numeric parsing
  const consumedTotals = useMemo(() => {
    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (Number(meal.calories) || 0),
        protein_g: acc.protein_g + (Number(meal.protein_g) || 0),
        carbs_g: acc.carbs_g + (Number(meal.carbs_g) || 0),
        fat_g: acc.fat_g + (Number(meal.fat_g) || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [meals]);

  // Group meals by category
  const mealSections = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const categoryMeals = meals.filter((m) => (m.meal_type || 'snack') === cat.type);
      const totalCalories = categoryMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
      return {
        ...cat,
        meals: categoryMeals,
        totalCalories: Math.round(totalCalories),
      };
    });
  }, [meals]);

  const targetCalories = Number(profile?.target_calories) || 2000;
  const targetProtein = Number(profile?.target_protein_g) || 150;
  const targetCarbs = Number(profile?.target_carbs_g) || 200;
  const targetFat = Number(profile?.target_fat_g) || 65;

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Athlete';

  // Real-Time Nutrition Coach User Context Payload
  const coachUserContext = useMemo(() => ({
    displayName,
    goal: profile?.goal_pace || 'Fat Loss / Maintenance',
    dietType: profile?.diet_type || 'Balanced',
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    consumedCalories: consumedTotals.calories,
    consumedProtein: consumedTotals.protein_g,
    consumedCarbs: consumedTotals.carbs_g,
    consumedFat: consumedTotals.fat_g,
    remainingCalories: Math.max(0, targetCalories - consumedTotals.calories),
    remainingProtein: Math.max(0, targetProtein - consumedTotals.protein_g),
    remainingCarbs: Math.max(0, targetCarbs - consumedTotals.carbs_g),
    remainingFat: Math.max(0, targetFat - consumedTotals.fat_g),
    todayMeals: meals.map((m) => `${m.name} (${m.calories} kcal)`),
  }), [displayName, profile, targetCalories, targetProtein, targetCarbs, targetFat, consumedTotals, meals]);

  // Hydration metrics with bulletproof fallback
  const safeTodayMl = Number(todayMl) || 0;
  const targetWaterMl = Number(profile?.target_water_ml) || Number(dailyGoalMl) || 2500;
  const waterPercentage = targetWaterMl > 0 ? Math.max(0, Math.min(100, Math.round((safeTodayMl / targetWaterMl) * 100))) || 0 : 0;

  const handleOpenCoachWithPrompt = (prompt = '') => {
    hapticFeedback.light();
    openCoach(prompt);
  };

  // Quick hydration shortcut with Dynamic Toast HUD
  const handleQuickAddWater = async (amountMl = 250) => {
    hapticFeedback.medium();
    const prevTotal = safeTodayMl;
    const newTotal = safeTodayMl + amountMl;
    await addWater(amountMl);
    if (newTotal >= targetWaterMl && prevTotal < targetWaterMl) {
      hapticFeedback.success();
    }
    const newTotalL = (newTotal / 1000).toFixed(1);
    const goalL = (targetWaterMl / 1000).toFixed(1);
    setToast({
      title: 'Hydration Logged',
      message: `+${amountMl} ml added • Today: ${newTotalL}L / ${goalL}L`,
      type: 'water',
    });
  };

  const handleDeleteMealWithToast = async (id: string) => {
    try {
      await deleteMeal(id);
      setToast({
        title: 'Meal Deleted',
        message: 'Daily calorie and macro totals updated',
        type: 'info',
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Gallery Upload Handler
  const handlePickGalleryForCategory = async (mealType: MealType) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Media library access is needed to select food photos.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const selectedUri = pickerResult.assets[0].uri;
        hapticFeedback.medium();

        setToast({
          title: 'Analyzing Food Photo...',
          message: 'AI Vision model is calculating macronutrients',
          type: 'info',
        });

        const { base64, uri: compressedUri } = await compressImage(selectedUri);
        const result = await analyzeMealPhoto(base64);

        setDraftMeal({
          name: result.meal_name || 'Logged Meal',
          meal_type: mealType,
          calories: result.calories,
          protein_g: result.protein_g,
          carbs_g: result.carbs_g,
          fat_g: result.fat_g,
          food_items: result.ingredients,
          image_url: compressedUri || selectedUri,
        });

        hapticFeedback.success();
        router.push('/review' as any);
      }
    } catch (err: any) {
      console.error('Gallery pick error:', err);
      Alert.alert('Analysis Failed', err.message || 'Could not analyze selected photo.');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Dynamic Island Toast HUD */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* 1. Athletic Feline Command Header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center justify-between border-b border-zinc-900/60">
        <View>
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-zinc-500 text-[10px] font-extrabold uppercase tracking-widest">
              {formattedDate}
            </Text>
          </View>
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-xl text-white tracking-tight"
          >
            Hey, {displayName}
          </Text>
        </View>

        {/* Apex Hunter Streak Badge */}
        <FelineHunterRankBadge streakDays={streakDays} compact={true} />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-3.5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Smart Notification Opt-In Prompt */}
        <NotificationPermissionBanner />

        {/* 2. Hero Energy & Macronutrient Blueprint Card (Animated SVG Rings) */}
        <DailyMacroSummary
          targetCalories={targetCalories}
          consumedCalories={consumedTotals.calories}
          protein={{ consumed: consumedTotals.protein_g, target: targetProtein }}
          carbs={{ consumed: consumedTotals.carbs_g, target: targetCarbs }}
          fat={{ consumed: consumedTotals.fat_g, target: targetFat }}
        />

        {/* 4. Athletic Feline Hydration Telemetry Pod */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-3.5 mb-4 shadow-sm shadow-black">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
                <Ionicons name="water" size={16} color="#06b6d4" />
              </View>
              <View>
                <Text className="text-zinc-500 text-[9px] font-extrabold uppercase tracking-widest">
                  Daily Hydration
                </Text>
                <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }} className="text-white text-xs">
                  {(safeTodayMl / 1000).toFixed(1)}L <Text className="text-zinc-500 font-normal">/ {(targetWaterMl / 1000).toFixed(1)}L ({waterPercentage}%)</Text>
                </Text>
              </View>
            </View>

            {/* Quick 1-Tap Vessel Pods */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => handleQuickAddWater(250)}
                style={({ pressed }) => [
                  { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pressed ? 0.85 : 1 },
                ]}
                className="bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="cup-water" size={13} color="#06b6d4" />
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-cyan-300 text-[10px]">
                  +250ml
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleQuickAddWater(500)}
                style={({ pressed }) => [
                  { transform: [{ scale: pressed ? 0.94 : 1 }], opacity: pressed ? 0.85 : 1 },
                ]}
                className="bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl flex-row items-center gap-1"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="bottle-tonic-outline" size={13} color="#38bdf8" />
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-cyan-200 text-[10px]">
                  +500ml
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Liquid progress track */}
          <View className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <View
              className="h-full bg-cyan-500 rounded-full"
              style={{ width: `${waterPercentage}%` }}
            />
          </View>
        </View>

        {/* 5. 3-Column Tactile Action Dock */}
        <View className="flex-row gap-2.5 mb-4">
          {/* Snap Catch */}
          <Pressable
            onPress={() => {
              hapticFeedback.medium();
              router.push('/(tabs)/camera' as any);
            }}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.96 : 1 }], opacity: pressed ? 0.88 : 1 },
            ]}
            className="flex-1 bg-zinc-900/90 border border-emerald-500/30 rounded-2xl py-3 px-2 items-center justify-center gap-0.5 shadow-sm"
          >
            <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center mb-0.5">
              <Ionicons name="camera" size={16} color="#10b981" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">
              Snap Catch
            </Text>
            <Text className="text-zinc-500 text-[9px] font-semibold">AI Vision</Text>
          </Pressable>

          {/* AI Text Log */}
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              setTextModalVisible(true);
            }}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.96 : 1 }], opacity: pressed ? 0.88 : 1 },
            ]}
            className="flex-1 bg-zinc-900/90 border border-purple-500/30 rounded-2xl py-3 px-2 items-center justify-center gap-0.5 shadow-sm"
          >
            <View className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 items-center justify-center mb-0.5">
              <MaterialCommunityIcons name="text-box-edit-outline" size={16} color="#c084fc" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">
              Text Log
            </Text>
            <Text className="text-zinc-500 text-[9px] font-semibold">Quick Type</Text>
          </Pressable>

          {/* Photo Vault */}
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              handlePickGalleryForCategory('snack');
            }}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.96 : 1 }], opacity: pressed ? 0.88 : 1 },
            ]}
            className="flex-1 bg-zinc-900/90 border border-amber-500/30 rounded-2xl py-3 px-2 items-center justify-center gap-0.5 shadow-sm"
          >
            <View className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 items-center justify-center mb-0.5">
              <Ionicons name="images-outline" size={16} color="#fbbf24" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">
              Photo Vault
            </Text>
            <Text className="text-zinc-500 text-[9px] font-semibold">Gallery</Text>
          </Pressable>
        </View>

        {/* 6. Proactive AI Nutrition Engine: Sia's Next Catch */}
        <SiaNextCatchCard
          targets={{
            calories: targetCalories,
            protein_g: targetProtein,
            carbs_g: targetCarbs,
            fat_g: targetFat,
          }}
          consumed={consumedTotals}
          loggedMeals={meals}
        />

        {/* 7. Categorized Meal Feed */}
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-base">
              Today's Meals
            </Text>
            <Text style={{ fontVariant: ['tabular-nums'] }} className="text-zinc-500 text-xs font-semibold">
              {meals.length} {meals.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          {meals.length === 0 ? (
            <View className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-6 items-center my-2">
              <View className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center justify-center mb-2.5">
                <Ionicons name="restaurant-outline" size={22} color="#10b981" />
              </View>
              <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-sm mb-1 text-center">
                No Meals Logged Today
              </Text>
              <Text className="text-zinc-400 text-xs text-center mb-4 leading-relaxed max-w-[260px]">
                Snap a photo or type your meal to track your macros and hit your goals.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  router.push('/(tabs)/camera' as any);
                }}
                activeOpacity={0.8}
                className="bg-emerald-500/15 border border-emerald-500/35 px-4 py-2 rounded-xl flex-row items-center gap-1.5"
              >
                <Ionicons name="camera" size={16} color="#34d399" />
                <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-emerald-400 text-xs">
                  Scan Your First Meal
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            mealSections.map((section) => {
              const hasMeals = section.meals.length > 0;
              return (
                <View key={section.type} className="mb-3.5">
                  {/* Category Header Row */}
                  <View className="flex-row items-center justify-between mb-2 px-1">
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`w-7 h-7 rounded-xl ${section.badgeBg} items-center justify-center border`}
                      >
                        <MaterialCommunityIcons name={section.icon} size={15} color={section.color} />
                      </View>
                      <Text
                        style={{ fontFamily: 'Outfit_700Bold' }}
                        className="text-white text-sm"
                      >
                        {section.title}
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      {hasMeals && (
                        <View className="bg-zinc-900 px-2.5 py-0.5 rounded-lg border border-zinc-800">
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }}
                            className="text-zinc-300 text-xs"
                          >
                            {section.totalCalories} kcal
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          hapticFeedback.light();
                          setActionSheetCategory(section);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="w-7 h-7 rounded-xl bg-zinc-800/80 items-center justify-center border border-zinc-700/60"
                      >
                        <Ionicons name="add" size={16} color="#e4e4e7" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Meals or Minimal Empty Slot */}
                  {hasMeals ? (
                    section.meals.map((meal) => (
                      <MealItemCard
                        key={meal.id}
                        meal={meal}
                        onDelete={handleDeleteMealWithToast}
                        onPress={(m) => setSelectedMeal(m)}
                      />
                    ))
                  ) : (() => {
                    const emptyInfo = getCategoryEmptyPrompt(section.type);
                    const yesterdayCatch = yesterdayMeals[section.type];
                    return (
                      <View className="gap-2">
                        <Pressable
                          onPress={() => {
                            hapticFeedback.light();
                            setActionSheetCategory(section);
                          }}
                          style={({ pressed }) => [
                            { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.85 : 1 },
                          ]}
                          className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-3 flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center gap-3 flex-1 pr-2">
                            <View
                              className={`w-9 h-9 rounded-xl ${section.badgeBg} items-center justify-center border`}
                            >
                              <MaterialCommunityIcons name={section.icon} size={17} color={section.color} />
                            </View>
                            <View className="flex-1">
                              <Text
                                style={{ fontFamily: 'Outfit_700Bold' }}
                                className="text-zinc-200 text-xs"
                                numberOfLines={1}
                              >
                                {emptyInfo.prompt}
                              </Text>
                              <Text className="text-zinc-500 text-[10px]" numberOfLines={1}>
                                {emptyInfo.sub}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={{ borderColor: section.color + '45', backgroundColor: section.color + '18' }}
                            className="px-3 py-1.5 rounded-xl border flex-row items-center gap-1.5"
                          >
                            <Ionicons name="paw" size={12} color={section.color} />
                            <Text
                              style={{ fontFamily: 'Outfit_800ExtraBold', color: section.color }}
                              className="text-[11px]"
                            >
                              Pounce
                            </Text>
                          </View>
                        </Pressable>

                        {/* 1-Tap Inline Quick Re-Pounce Pill */}
                        {yesterdayCatch && (
                          <TouchableOpacity
                            onPress={() => handleDirectRePounce(yesterdayCatch, section.type)}
                            activeOpacity={0.8}
                            className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-3.5 py-2.5 flex-row items-center justify-between shadow-sm"
                          >
                            <View className="flex-row items-center gap-2 flex-1 pr-2">
                              <View className="w-6 h-6 rounded-lg bg-emerald-500/20 items-center justify-center border border-emerald-500/40">
                                <MaterialCommunityIcons name="repeat" size={13} color="#10b981" />
                              </View>
                              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                                Re-Pounce Yesterday: <Text className="text-white font-bold">{yesterdayCatch.name}</Text>
                              </Text>
                            </View>
                            <View className="bg-emerald-500/25 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                              <Text
                                style={{ fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }}
                                className="text-emerald-300 text-[10px]"
                              >
                                +{Math.round(yesterdayCatch.calories)} kcal
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })()}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Senior UX Quick Log Action Sheet */}
      {actionSheetCategory && (
        <QuickLogActionSheet
          visible={!!actionSheetCategory}
          mealType={actionSheetCategory.type}
          categoryTitle={actionSheetCategory.title}
          categoryIcon={actionSheetCategory.icon}
          categoryColor={actionSheetCategory.color}
          categoryBadgeBg={actionSheetCategory.badgeBg}
          onClose={() => setActionSheetCategory(null)}
          onSelectCamera={(type) =>
            router.push({ pathname: '/(tabs)/camera', params: { mode: 'photo', meal_type: type } } as any)
          }
          onSelectBarcode={(type) =>
            router.push({ pathname: '/(tabs)/camera', params: { mode: 'barcode', meal_type: type } } as any)
          }
          onSelectGallery={(type) => handlePickGalleryForCategory(type)}
          onSelectText={(type) => {
            setTextModalVisible(true);
          }}
          onSelectRePounce={(type) => {
            setRePounceSheetCategory(actionSheetCategory);
          }}
        />
      )}

      {/* Meal Detail / Edit Modal */}
      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          visible={!!selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onDuplicate={(meal) => {
            setToast({
              title: 'Meal Logged to Today',
              message: `Duplicated "${meal.name}" (${Math.round(meal.calories)} kcal) to today`,
              type: 'success',
            });
          }}
          onAskCoach={(meal) => {
            setSelectedMeal(null);
            openCoach(
              `I'm inspecting my logged meal "${meal.name}" (${Math.round(meal.calories)} kcal, ${Math.round(meal.protein_g)}g protein, ${Math.round(meal.carbs_g)}g carbs, ${Math.round(meal.fat_g)}g fat). How does this impact my daily deficit, and what should I eat next to hit my macros?`
            );
          }}
        />
      )}

      {/* Text Logging In-Tree Sheet */}
      {textModalVisible && (
        <TextLogModal
          visible={textModalVisible}
          onClose={() => setTextModalVisible(false)}
          onSuccess={() => {
            setTextModalVisible(false);
            router.push('/review' as any);
          }}
          initialMealType={actionSheetCategory?.type || 'snack'}
        />
      )}

      {/* Re-Pounce Recent Catches Vault Sheet */}
      {rePounceSheetCategory && (
        <RePounceSheet
          visible={!!rePounceSheetCategory}
          categoryType={rePounceSheetCategory.type}
          categoryTitle={rePounceSheetCategory.title}
          categoryIcon={rePounceSheetCategory.icon}
          categoryColor={rePounceSheetCategory.color}
          onClose={() => setRePounceSheetCategory(null)}
          onPounceMeal={(meal) => handleDirectRePounce(meal, rePounceSheetCategory.type)}
        />
      )}

      {/* Feline Hunter Milestone Celebration Modal */}
      {unlockedMilestoneTier && (
        <FelineMilestoneCelebrationModal
          visible={!!unlockedMilestoneTier}
          tier={unlockedMilestoneTier}
          streakDays={streakDays}
          onClose={handleDismissMilestone}
        />
      )}
    </SafeAreaView>
  );
}
