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
      <View className="px-5 pt-3 pb-3 border-b border-zinc-900 flex-row items-center justify-between">
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

        <View className="flex-row items-center gap-2">
          {/* Sia Cat Nutrition Coach Trigger */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.medium();
              setCoachModalVisible(true);
            }}
            activeOpacity={0.8}
            className={`${
              consumedTotals.protein_g >= targetProtein && targetProtein > 0
                ? 'bg-emerald-500/25 border-emerald-400/80 shadow-emerald-500/30'
                : 'bg-emerald-500/15 border-emerald-500/40 shadow-emerald-500/20'
            } border px-3 py-1.5 rounded-2xl flex-row items-center gap-1.5 shadow-sm`}
          >
            <MaterialCommunityIcons
              name={consumedTotals.protein_g >= targetProtein && targetProtein > 0 ? 'trophy' : 'cat'}
              size={15}
              color="#10b981"
            />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-emerald-400 text-xs"
            >
              {consumedTotals.protein_g >= targetProtein && targetProtein > 0 ? 'Goal Hit!' : 'Sia Coach'}
            </Text>
          </TouchableOpacity>

          {/* Feline Streak Badge */}
          <View className="bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1.5 rounded-2xl flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="paw" size={13} color="#10b981" />
            <Text
              style={{ fontFamily: 'Outfit_900Black' }}
              className="text-emerald-400 text-xs"
            >
              {streakDays}d Streak
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* 1. Hero Energy & Macronutrient Blueprint Card (Animated SVG Rings) */}
        <DailyMacroSummary
          targetCalories={targetCalories}
          consumedCalories={consumedTotals.calories}
          protein={{ consumed: consumedTotals.protein_g, target: targetProtein }}
          carbs={{ consumed: consumedTotals.carbs_g, target: targetCarbs }}
          fat={{ consumed: consumedTotals.fat_g, target: targetFat }}
        />

        {/* 2. Slim Inline Hydration Bar */}
        <View className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl px-4 py-3.5 mb-4 flex-row items-center justify-between shadow-sm shadow-black">
          <View className="flex-row items-center gap-3 flex-1 mr-3">
            <View className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 items-center justify-center">
              <Ionicons name="water" size={18} color="#06b6d4" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  style={{ fontFamily: 'Outfit_700Bold' }}
                  className="text-white text-xs"
                >
                  Hydration: {(todayMl / 1000).toFixed(1)}L <Text className="text-zinc-500 font-normal">/ {(targetWaterMl / 1000).toFixed(1)}L</Text>
                </Text>
                <Text className="text-cyan-400 text-[11px] font-bold">{waterPercentage}%</Text>
              </View>
              {/* Mini fill bar */}
              <View className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/40">
                <View
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${waterPercentage}%` }}
                />
              </View>
            </View>
          </View>

          {/* Quick 1-Tap Hydration Buttons */}
          <View className="flex-row items-center gap-1.5">
            <TouchableOpacity
              onPress={() => handleQuickAddWater(250)}
              activeOpacity={0.7}
              className="bg-cyan-500/15 active:bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl"
            >
              <Text className="text-cyan-400 text-xs font-bold">+250ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickAddWater(500)}
              activeOpacity={0.7}
              className="bg-cyan-500/15 active:bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl"
            >
              <Text className="text-cyan-400 text-xs font-bold">+500ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. High-Velocity Cyber-Feline Action Strip */}
        <View className="flex-row gap-3 mb-5">
          {/* Sia Optical Food Scan */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              router.push('/(tabs)/camera' as any);
            }}
            activeOpacity={0.8}
            className="flex-1 bg-emerald-500 active:bg-emerald-600 rounded-3xl p-4 flex-row items-center gap-3 shadow-lg shadow-emerald-500/25"
          >
            <View className="w-10 h-10 rounded-2xl bg-zinc-950/25 border border-white/20 items-center justify-center">
              <MaterialCommunityIcons name="camera-iris" size={22} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-white text-sm">
                Sia Vision Scan
              </Text>
              <Text className="text-white/80 text-[11px] font-semibold mt-0.5">
                Point camera & track
              </Text>
            </View>
          </TouchableOpacity>

          {/* Sia Natural Language Text Log */}
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.light();
              setTextModalVisible(true);
            }}
            activeOpacity={0.8}
            className="flex-1 bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-4 flex-row items-center gap-3 shadow-md shadow-black"
          >
            <View className="w-10 h-10 rounded-2xl bg-purple-500/15 items-center justify-center border border-purple-500/30">
              <MaterialCommunityIcons name="text-box-edit-outline" size={19} color="#c084fc" />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: 'Outfit_800ExtraBold' }} className="text-white text-sm">
                Sia Text Log
              </Text>
              <Text className="text-zinc-400 text-[11px] font-medium mt-0.5">
                Type what you ate
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Categorized Meal Feed */}
        <View className="mb-2">
          <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-3.5 px-0.5">
            Today's Logged Meals
          </Text>

          {mealSections.map((section) => {
            const hasMeals = section.meals.length > 0;
            return (
              <View key={section.type} className="mb-4">
                {/* Category Header Row */}
                <View className="flex-row items-center justify-between mb-2.5 px-1">
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
                          style={{ fontFamily: 'Outfit_700Bold' }}
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

                {/* Populated Meals or Empty State */}
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
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.light();
                      setActionSheetCategory(section);
                    }}
                    activeOpacity={0.7}
                    className="border border-dashed border-zinc-800/90 bg-zinc-950/40 rounded-3xl py-4 px-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3 flex-1 mr-2">
                        {/* Sia cat mascot avatar image */}
                        <View
                          style={{ borderColor: section.color + '40', borderWidth: 1 }}
                          className="w-9 h-9 rounded-2xl bg-zinc-900 items-center justify-center overflow-hidden"
                        >
                          <Image
                            source={require('../../../assets/images/logo.jpg')}
                            style={{ width: '100%', height: '100%', borderRadius: 12 }}
                            resizeMode="cover"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            style={{ fontFamily: 'Outfit_700Bold', color: section.color }}
                            className="text-xs"
                          >
                            Sia Coach
                          </Text>
                          <Text className="text-zinc-400 text-[11px] font-medium mt-0.5">
                            {section.type === 'breakfast'
                              ? "Nothing logged yet — fuel up for the day"
                              : section.type === 'lunch'
                              ? "Midday gap detected — log your lunch"
                              : section.type === 'dinner'
                              ? "Evening plate empty — log your dinner"
                              : "Any snacks or extras to record?"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{ borderColor: section.color + '55', backgroundColor: section.color + '18' }}
                        className="px-3 py-1.5 rounded-xl border flex-row items-center gap-1"
                      >
                        <Ionicons name="add" size={13} color={section.color} />
                        <Text style={{ color: section.color, fontFamily: 'Outfit_800ExtraBold' }} className="text-xs">
                          Log
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
