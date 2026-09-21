import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../stores/authStore';
import { useMealStore } from '../../stores/mealStore';
import { useWaterStore } from '../../stores/waterStore';
import { DailyMacroSummary } from '../../components/MacroCard';
import { MealItemCard } from '../../components/MealItemCard';
import { MealDetailModal } from '../../components/MealDetailModal';
import { TextLogModal } from '../../components/TextLogModal';
import { QuickLogActionSheet } from '../../components/QuickLogActionSheet';
import { AiNutritionCoachModal } from '../../components/AiNutritionCoachModal';
import { FloatingCoachWidget } from '../../components/FloatingCoachWidget';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { compressImage, analyzeMealPhoto } from '../../services/aiService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../../types';
import { hapticFeedback } from '../../utils/haptics';
import SiaCatMascot from '../../components/SiaCatMascot';
import { SiaNextCatchCard } from '../../components/SiaNextCatchCard';
import { FelineHunterRankBadge } from '../../components/FelineHunterRankBadge';
import { FelineEmptyState } from '../../components/FelineEmptyState';
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
  } = useMealStore();
  const { addWater, todayMl, dailyGoalMl, loadTodayWater } = useWaterStore();

  const [textModalVisible, setTextModalVisible] = useState(false);
  const [coachModalVisible, setCoachModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [actionSheetCategory, setActionSheetCategory] = useState<CategoryHeaderConfig | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    fetchMealsForDate(todayStr);
    fetchWeeklyStats(profile?.target_calories || 2000);
    loadTodayWater();
  }, [todayStr]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMealsForDate(todayStr),
      fetchWeeklyStats(profile?.target_calories || 2000),
      loadTodayWater(),
    ]);
    setRefreshing(false);
  };

  // Compute consumed macros
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

  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein_g || 150;
  const targetCarbs = profile?.target_carbs_g || 200;
  const targetFat = profile?.target_fat_g || 65;

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Athlete';
  const streakDays = weeklySummary?.streakDays || 1;

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

  // Hydration metrics
  const targetWaterMl = Number(profile?.target_water_ml) || Number(dailyGoalMl) || 2500;
  const waterPercentage = Math.min(100, Math.round((todayMl / targetWaterMl) * 100));

  // Quick hydration shortcut with Dynamic Toast HUD
  const handleQuickAddWater = async (amountMl = 250) => {
    hapticFeedback.medium();
    await addWater(amountMl);
    const newTotal = (todayMl + amountMl) / 1000;
    const goalL = (targetWaterMl / 1000).toFixed(1);
    setToast({
      title: 'Hydration Logged',
      message: `+${amountMl} ml added • Today: ${newTotal.toFixed(1)}L / ${goalL}L`,
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
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Dynamic Island Toast HUD */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* Header Bar */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
            Daily Dashboard
          </Text>
          <Text
            style={{ fontFamily: 'Outfit_700Bold' }}
            className="text-xl text-white tracking-tight mt-0.5"
          >
            Hey, {displayName}
          </Text>
        </View>
        <FelineHunterRankBadge streakDays={streakDays} compact={true} />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Smart Feline Notification Opt-In Prompt */}
        <NotificationPermissionBanner />

        {/* 1. Hero Energy & Macronutrient Blueprint Card (Animated SVG Rings) */}
        <DailyMacroSummary
          targetCalories={targetCalories}
          consumedCalories={consumedTotals.calories}
          protein={{ consumed: consumedTotals.protein_g, target: targetProtein }}
          carbs={{ consumed: consumedTotals.carbs_g, target: targetCarbs }}
          fat={{ consumed: consumedTotals.fat_g, target: targetFat }}
        />

        {/* Slim Hydration Chip */}
        <Pressable
          onPress={() => handleQuickAddWater(250)}
          style={({ pressed }) => [
            { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
          ]}
          className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl px-4 py-2.5 mb-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2.5">
            <View className="w-7 h-7 rounded-xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
              <Ionicons name="water" size={14} color="#06b6d4" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }} className="text-white text-xs">
              {(todayMl / 1000).toFixed(1)}L <Text className="text-zinc-500 font-normal">/ {(targetWaterMl / 1000).toFixed(1)}L</Text>
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
              <View className="h-full bg-cyan-500 rounded-full" style={{ width: `${waterPercentage}%` }} />
            </View>
            <View className="bg-cyan-500/15 border border-cyan-500/30 px-2 py-1 rounded-lg">
              <Text className="text-cyan-400 text-[10px] font-bold">+250ml</Text>
            </View>
          </View>
        </Pressable>

        {/* Quick Action Strip */}
        <View className="flex-row gap-2.5 mb-4">
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              setTextModalVisible(true);
            }}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
            ]}
            className="flex-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl py-3 px-4 flex-row items-center gap-2.5"
          >
            <View className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 items-center justify-center">
              <MaterialCommunityIcons name="text-box-edit-outline" size={15} color="#c084fc" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">Text Log</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              hapticFeedback.light();
              handlePickGalleryForCategory('snack');
            }}
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
            ]}
            className="flex-1 bg-zinc-900/80 border border-zinc-800/80 rounded-2xl py-3 px-4 flex-row items-center gap-2.5"
          >
            <View className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 items-center justify-center">
              <Ionicons name="images-outline" size={15} color="#fbbf24" />
            </View>
            <Text style={{ fontFamily: 'Outfit_700Bold' }} className="text-white text-xs">Photo Library</Text>
          </Pressable>
        </View>

        {/* 4. Proactive AI Nutrition Engine: Sia's Next Catch */}
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

        {/* Categorized Meal Feed */}
        <View className="mb-2">
          <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-3.5 px-0.5">
            Today's Logged Meals
          </Text>

          {meals.length === 0 ? (
            <FelineEmptyState
              title="Sia is Snoozing..."
              description="No catches logged yet today! Snap a photo or type your meal to start filling your macro rings."
              actionLabel="Snap Your First Catch"
              onAction={() => {
                hapticFeedback.light();
                router.push('/(tabs)/camera' as any);
              }}
              mood="idle"
            />
          ) : (
            mealSections.map((section) => {
              const hasMeals = section.meals.length > 0;
              return (
                <View key={section.type} className="mb-3">
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
                  ) : (
                    <Pressable
                      onPress={() => {
                        hapticFeedback.light();
                        setActionSheetCategory(section);
                      }}
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      className="border border-dashed border-zinc-800/60 rounded-2xl py-3 px-4 flex-row items-center justify-center gap-2"
                    >
                      <Ionicons name="add-circle-outline" size={14} color={section.color} />
                      <Text style={{ color: section.color }} className="text-xs font-semibold">
                        Log {section.title}
                      </Text>
                    </Pressable>
                  )}
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
        />
      )}

      {/* Meal Detail / Edit Modal */}
      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          visible={!!selectedMeal}
          onClose={() => setSelectedMeal(null)}
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

      {/* Floating AI Coach Widget */}
      <FloatingCoachWidget
        onPress={() => {
          hapticFeedback.medium();
          setCoachModalVisible(true);
        }}
      />

      {/* AI Nutrition Coach Modal — always mounted so chat history persists */}
      <AiNutritionCoachModal
        visible={coachModalVisible}
        onClose={() => setCoachModalVisible(false)}
        userContext={coachUserContext}
      />
    </SafeAreaView>
  );
}
