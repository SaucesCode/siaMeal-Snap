import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealStore } from '../../stores/mealStore';
import { useAuthStore } from '../../stores/authStore';
import { MealItemCard } from '../../components/MealItemCard';
import { MealDetailModal } from '../../components/MealDetailModal';
import { WeeklyAdherenceChart } from '../../components/WeeklyAdherenceChart';
import { AiNutritionCoachModal } from '../../components/AiNutritionCoachModal';
import { FloatingCoachWidget } from '../../components/FloatingCoachWidget';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { FelineEmptyState } from '../../components/FelineEmptyState';
import {
  generateWeeklyCoachingInsights,
  calculateMacroEnergySplit,
} from '../../utils/nutritionInsights';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Meal, MealType } from '../../types';
import { hapticFeedback } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface CategoryHeaderConfig {
  type: MealType;
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  badgeBg: string;
}

const CATEGORIES: CategoryHeaderConfig[] = [
  { type: 'breakfast', title: 'Breakfast', icon: 'cat', color: '#f59e0b', badgeBg: 'bg-amber-500/10 border-amber-500/30' },
  { type: 'lunch', title: 'Lunch', icon: 'fish', color: '#10b981', badgeBg: 'bg-emerald-500/10 border-emerald-500/30' },
  { type: 'dinner', title: 'Dinner', icon: 'weather-night', color: '#818cf8', badgeBg: 'bg-indigo-500/10 border-indigo-500/30' },
  { type: 'snack', title: 'Snacks & Treats', icon: 'paw', color: '#06b6d4', badgeBg: 'bg-cyan-500/10 border-cyan-500/30' },
];

export default function HistoryScreen() {
  const { profile } = useAuthStore();
  const {
    meals,
    weeklySummary,
    fetchMealsForDate,
    fetchWeeklyStats,
    deleteMeal,
  } = useMealStore();

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [coachModalVisible, setCoachModalVisible] = useState(false);

  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein_g || 150;
  const targetCarbs = profile?.target_carbs_g || 200;
  const targetFat = profile?.target_fat_g || 65;

  const displayName = profile?.full_name?.trim() || 'Athlete';

  // Compute daily totals for the selected date
  const totals = useMemo(() => {
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

  // Coach Context
  const coachUserContext = useMemo(() => ({
    displayName,
    goal: profile?.goal_pace || 'Fat Loss / Maintenance',
    dietType: profile?.diet_type || 'Balanced',
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    consumedCalories: totals.calories,
    consumedProtein: totals.protein_g,
    consumedCarbs: totals.carbs_g,
    consumedFat: totals.fat_g,
    remainingCalories: Math.max(0, targetCalories - totals.calories),
    remainingProtein: Math.max(0, targetProtein - totals.protein_g),
    remainingCarbs: Math.max(0, targetCarbs - totals.carbs_g),
    remainingFat: Math.max(0, targetFat - totals.fat_g),
    todayMeals: meals.map((m) => `${m.name} (${m.calories} kcal)`),
  }), [displayName, profile, targetCalories, targetProtein, targetCarbs, targetFat, totals, meals]);

  // Generate date list for the current weekOffset
  const dateList = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - (i + weekOffset * 7));
      const isoStr = d.toISOString().split('T')[0];
      const label =
        weekOffset === 0 && i === 0
          ? 'Today'
          : weekOffset === 0 && i === 1
          ? 'Yesterday'
          : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      dates.push({ date: isoStr, label });
    }
    return dates;
  }, [weekOffset]);

  const [selectedDate, setSelectedDate] = useState(dateList[0].date);

  // Sync selectedDate whenever weekOffset changes
  useEffect(() => {
    setSelectedDate(dateList[0].date);
  }, [weekOffset]);

  useEffect(() => {
    fetchMealsForDate(selectedDate);
    fetchWeeklyStats(targetCalories, weekOffset);
  }, [selectedDate, targetCalories, weekOffset]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchMealsForDate(selectedDate),
      fetchWeeklyStats(targetCalories, weekOffset),
    ]);
    setRefreshing(false);
  };

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

  const selectedDateLabel = useMemo(() => {
    const found = dateList.find((d) => d.date === selectedDate);
    return found ? found.label : selectedDate;
  }, [selectedDate, dateList]);

  // Generate Personalized AI Coaching Tips
  const coachingTips = useMemo(() => {
    return generateWeeklyCoachingInsights(weeklySummary, profile);
  }, [weeklySummary, profile]);

  // 7-Day Macro Energy Split
  const weeklySplit = useMemo(() => {
    if (!weeklySummary || weeklySummary.daysLogged === 0) {
      return calculateMacroEnergySplit(targetProtein, targetCarbs, targetFat);
    }
    return calculateMacroEnergySplit(
      weeklySummary.avgProtein,
      weeklySummary.avgCarbs,
      weeklySummary.avgFat
    );
  }, [weeklySummary, targetProtein, targetCarbs, targetFat]);

  const handleDeleteMealWithToast = async (id: string) => {
    try {
      await deleteMeal(id);
      setToast({
        title: 'Meal Deleted',
        message: 'Daily totals updated for this day',
        type: 'info',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    if (index !== activeTipIndex && index >= 0 && index < coachingTips.length) {
      setActiveTipIndex(index);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Dynamic Toast HUD */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* Clean Spacious Header */}
      <View className="px-5 pt-3 pb-3 border-b border-zinc-900 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 items-center justify-center">
            <Ionicons name="stats-chart" size={16} color="#10b981" />
          </View>
          <View>
            <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              Performance Lab
            </Text>
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-lg tracking-tight"
            >
              Analytics & Insights
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => {
              hapticFeedback.medium();
              setCoachModalVisible(true);
            }}
            activeOpacity={0.8}
            className="bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 rounded-2xl flex-row items-center gap-1.5 shadow-sm shadow-emerald-500/20"
          >
            <MaterialCommunityIcons name="cat" size={14} color="#10b981" />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-emerald-400 text-xs"
            >
              Sia Coach
            </Text>
          </TouchableOpacity>

          <View className="bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1.5 rounded-2xl flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="paw" size={13} color="#10b981" />
            <Text
              style={{ fontFamily: 'Outfit_800ExtraBold' }}
              className="text-emerald-400 text-xs"
            >
              {weeklySummary?.daysLogged || 0}/7d Logged
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
        {/* 1. 7-Day Interactive Adherence Chart with Week Stepper */}
        <WeeklyAdherenceChart
          summary={weeklySummary}
          targetCalories={targetCalories}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
          }}
          weekOffset={weekOffset}
          onChangeWeekOffset={(newOffset) => {
            setWeekOffset(newOffset);
          }}
        />

        {/* 2. Swipeable AI Coaching Intelligence Carousel */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="sparkles" size={13} color="#10b981" />
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
                Sia Diagnostics & Tips
              </Text>
            </View>
            <Text className="text-zinc-500 text-[10px] font-bold">
              {activeTipIndex + 1} of {coachingTips.length} • Swipe
            </Text>
          </View>

          {/* Horizontal Swiping Card Deck */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleCarouselScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 12}
            snapToAlignment="center"
            contentContainerStyle={{ gap: 12 }}
          >
            {coachingTips.map((tip) => (
              <View
                key={tip.id}
                style={{ width: CARD_WIDTH }}
                className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 shadow-lg shadow-black/50 justify-between"
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-2.5">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="w-8 h-8 rounded-xl items-center justify-center border"
                      style={{
                        backgroundColor: `${tip.badgeColor}15`,
                        borderColor: `${tip.badgeColor}40`,
                      }}
                    >
                      <Ionicons name={tip.icon as any} size={16} color={tip.badgeColor} />
                    </View>
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold' }}
                      className="text-white text-base"
                    >
                      {tip.title}
                    </Text>
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-xl border"
                    style={{
                      backgroundColor: `${tip.badgeColor}15`,
                      borderColor: `${tip.badgeColor}40`,
                    }}
                  >
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold', color: tip.badgeColor }}
                      className="text-[10px] font-bold uppercase"
                    >
                      {tip.badge}
                    </Text>
                  </View>
                </View>

                {/* Explanation */}
                <Text className="text-zinc-300 text-xs leading-5 mb-3">
                  {tip.message}
                </Text>

                {/* Actionable Protocol Box */}
                {tip.actionableStep && (
                  <View className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-3 flex-row items-start gap-2.5">
                    <Ionicons name="checkbox" size={16} color="#10b981" />
                    <View className="flex-1">
                      <Text className="text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                        Action Protocol
                      </Text>
                      <Text className="text-zinc-300 text-xs font-medium leading-4">
                        {tip.actionableStep}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Carousel Pagination Indicator Dots */}
          <View className="flex-row justify-center items-center gap-1.5 mt-3">
            {coachingTips.map((_, idx) => (
              <View
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  activeTipIndex === idx
                    ? 'w-6 bg-emerald-400'
                    : 'w-1.5 bg-zinc-800'
                }`}
              />
            ))}
          </View>
        </View>

        {/* 3. 7-Day Macro Energy Distribution Bar */}
        <View className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 mb-5 shadow-lg shadow-black/40">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
                7-Day Caloric Energy Ratio
              </Text>
              <Text
                style={{ fontFamily: 'Outfit_700Bold' }}
                className="text-white text-base mt-0.5"
              >
                Macro Caloric Split
              </Text>
            </View>
            <View className="bg-zinc-950 px-2.5 py-1 rounded-xl border border-zinc-800">
              <Text className="text-zinc-400 text-[10px] font-bold">Target: 30P • 40C • 30F</Text>
            </View>
          </View>

          {/* Segmented Macro Bar */}
          <View className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex-row mb-3.5 border border-zinc-800/60 p-0.5">
            <View
              className="bg-sky-400 h-full rounded-l-full"
              style={{ width: `${Math.max(8, weeklySplit.proteinPct)}%` }}
            />
            <View
              className="bg-amber-400 h-full"
              style={{ width: `${Math.max(8, weeklySplit.carbsPct)}%` }}
            />
            <View
              className="bg-rose-400 h-full rounded-r-full"
              style={{ width: `${Math.max(8, weeklySplit.fatPct)}%` }}
            />
          </View>

          {/* 3 Macro Breakdown Columns */}
          <View className="flex-row gap-2">
            {/* Protein */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-2.5 rounded-2xl">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="w-2 h-2 rounded-full bg-sky-400" />
                <Text className="text-sky-400 text-[10px] font-bold uppercase">Protein</Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {weeklySplit.proteinPct}%
              </Text>
              <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">
                {Math.round(weeklySummary?.avgProtein || 0)}g avg/day
              </Text>
            </View>

            {/* Carbs */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-2.5 rounded-2xl">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="w-2 h-2 rounded-full bg-amber-400" />
                <Text className="text-amber-400 text-[10px] font-bold uppercase">Carbs</Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {weeklySplit.carbsPct}%
              </Text>
              <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">
                {Math.round(weeklySummary?.avgCarbs || 0)}g avg/day
              </Text>
            </View>

            {/* Fat */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-2.5 rounded-2xl">
              <View className="flex-row items-center gap-1.5 mb-1">
                <View className="w-2 h-2 rounded-full bg-rose-400" />
                <Text className="text-rose-400 text-[10px] font-bold uppercase">Fat</Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {weeklySplit.fatPct}%
              </Text>
              <Text className="text-zinc-500 text-[10px] font-semibold mt-0.5">
                {Math.round(weeklySummary?.avgFat || 0)}g avg/day
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Selected Day Inspector Bento */}
        <View className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 mb-4 shadow-lg shadow-black/40">
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-zinc-800/70">
            <View>
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
                Day Inspector
              </Text>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base mt-0.5"
              >
                {selectedDateLabel}
              </Text>
            </View>

            <View className="bg-zinc-950 px-3 py-1.5 rounded-2xl border border-zinc-800 flex-row items-baseline gap-1">
              <Text
                style={{ fontFamily: 'Outfit_900Black' }}
                className="text-white text-base"
              >
                {Math.round(totals.calories)}
              </Text>
              <Text className="text-zinc-500 text-xs font-bold">/ {targetCalories} kcal</Text>
            </View>
          </View>

          {/* 3 Macro Pillars for Selected Day */}
          <View className="flex-row gap-2">
            {/* Protein */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-2xl">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sky-400 text-[9px] font-black uppercase">Protein</Text>
                <Text className="text-zinc-400 text-[10px] font-bold">
                  {Math.round((totals.protein_g / targetProtein) * 100)}%
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {Math.round(totals.protein_g)} <Text className="text-xs text-zinc-500 font-normal">/ {targetProtein}g</Text>
              </Text>
            </View>

            {/* Carbs */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-2xl">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-amber-400 text-[9px] font-black uppercase">Carbs</Text>
                <Text className="text-zinc-400 text-[10px] font-bold">
                  {Math.round((totals.carbs_g / targetCarbs) * 100)}%
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {Math.round(totals.carbs_g)} <Text className="text-xs text-zinc-500 font-normal">/ {targetCarbs}g</Text>
              </Text>
            </View>

            {/* Fat */}
            <View className="flex-1 bg-zinc-950/80 border border-zinc-800/80 p-3 rounded-2xl">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-rose-400 text-[9px] font-black uppercase">Fat</Text>
                <Text className="text-zinc-400 text-[10px] font-bold">
                  {Math.round((totals.fat_g / targetFat) * 100)}%
                </Text>
              </View>
              <Text
                style={{ fontFamily: 'Outfit_800ExtraBold' }}
                className="text-white text-base"
              >
                {Math.round(totals.fat_g)} <Text className="text-xs text-zinc-500 font-normal">/ {targetFat}g</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 5. Selected Day's Logged Meals Feed */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text
              style={{ fontFamily: 'Outfit_700Bold' }}
              className="text-white text-base"
            >
              Logged Meals ({selectedDateLabel})
            </Text>
            <Text className="text-zinc-500 text-xs font-semibold">
              {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
            </Text>
          </View>

          {meals.length === 0 ? (
            <FelineEmptyState
              title="No Catches on This Day"
              description={`Sia has no hunting records for ${selectedDateLabel}. Tap any bar in the weekly chart above to inspect another day.`}
              actionLabel="Return to Today"
              onAction={() => {
                hapticFeedback.light();
                setSelectedDate(new Date().toISOString().split('T')[0]);
              }}
              mood="thinking"
            />
          ) : (
            mealSections.map((section) => {
              if (section.meals.length === 0) return null;
              return (
                <View key={section.type} className="mb-4">
                  {/* Category Header Row */}
                  <View className="flex-row items-center justify-between mb-2 px-1">
                    <View className="flex-row items-center gap-2">
                      <View className={`w-6 h-6 rounded-lg ${section.badgeBg} items-center justify-center border`}>
                        <MaterialCommunityIcons name={section.icon} size={13} color={section.color} />
                      </View>
                      <Text
                        style={{ fontFamily: 'Outfit_700Bold' }}
                        className="text-white text-sm"
                      >
                        {section.title}
                      </Text>
                    </View>
                    <Text className="text-zinc-400 text-xs font-bold">{section.totalCalories} kcal</Text>
                  </View>

                  {section.meals.map((meal) => (
                    <MealItemCard
                      key={meal.id}
                      meal={meal}
                      onDelete={handleDeleteMealWithToast}
                      onPress={(m) => setSelectedMeal(m)}
                    />
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          visible={!!selectedMeal}
          onClose={() => setSelectedMeal(null)}
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
