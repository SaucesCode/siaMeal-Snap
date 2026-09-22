import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import SiaCatMascot from '../../components/SiaCatMascot';
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

  // Macro helpers for Day Inspector
  const macroRows = [
    {
      label: 'Protein',
      consumed: Math.round(totals.protein_g),
      target: targetProtein,
      color: '#38bdf8',
      dotBg: 'bg-sky-400',
    },
    {
      label: 'Carbs',
      consumed: Math.round(totals.carbs_g),
      target: targetCarbs,
      color: '#f59e0b',
      dotBg: 'bg-amber-400',
    },
    {
      label: 'Fat',
      consumed: Math.round(totals.fat_g),
      target: targetFat,
      color: '#fb7185',
      dotBg: 'bg-rose-400',
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <StatusBar barStyle="light-content" />

      {/* Floating Dynamic Toast HUD */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      {/* Header — cleaned up, no redundant Sia Coach button */}
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

        {/* Streak Badge only */}
        <View className="bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1.5 rounded-2xl flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="paw" size={13} color="#10b981" />
          <Text
            style={{ fontFamily: 'Outfit_800ExtraBold', fontVariant: ['tabular-nums'] }}
            className="text-emerald-400 text-xs"
          >
            {weeklySummary?.daysLogged || 0}/7d Logged
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
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
              <MaterialCommunityIcons name="cat" size={14} color="#10b981" />
              <Text className="text-zinc-400 text-[10px] font-extrabold uppercase tracking-widest">
                Sia's Weekly Diagnostics
              </Text>
            </View>
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="text-zinc-500 text-[10px] font-bold"
            >
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
                {/* Header with Sia mascot accent */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden', marginRight: 8 }}>
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center border"
                      style={{
                        backgroundColor: `${tip.badgeColor}15`,
                        borderColor: `${tip.badgeColor}40`,
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name={tip.icon as any} size={17} color={tip.badgeColor} />
                    </View>
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold', flex: 1 }}
                      className="text-white text-sm"
                      numberOfLines={1}
                    >
                      {tip.title}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexShrink: 0,
                      maxWidth: 130,
                      backgroundColor: `${tip.badgeColor}15`,
                      borderColor: `${tip.badgeColor}40`,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{ fontFamily: 'Outfit_700Bold', color: tip.badgeColor, fontVariant: ['tabular-nums'], fontSize: 9, textTransform: 'uppercase' }}
                      numberOfLines={1}
                    >
                      {tip.badge}
                    </Text>
                  </View>
                </View>

                {/* Explanation */}
                <Text className="text-zinc-300 text-xs leading-5 mb-3">
                  {tip.message}
                </Text>

                {/* Actionable Protocol Box — feline-styled */}
                {tip.actionableStep && (
                  <View className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-3 flex-row items-start gap-2.5">
                    <MaterialCommunityIcons name="paw" size={14} color="#10b981" style={{ marginTop: 1 }} />
                    <View className="flex-1">
                      <Text className="text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                        Sia's Rx
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
                style={{
                  height: 5,
                  width: activeTipIndex === idx ? 20 : 5,
                  borderRadius: 3,
                  backgroundColor: activeTipIndex === idx ? '#10b981' : '#27272a',
                }}
              />
            ))}
          </View>
        </View>

        {/* 3. 7-Day Macro Energy Distribution — inline rows, not 3 identical boxes */}
        <View className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 mb-5 shadow-lg shadow-black/40">
          <View className="flex-row items-center justify-between mb-3.5">
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
          </View>

          {/* Segmented Macro Bar */}
          <View style={{ height: 10, backgroundColor: '#09090b', borderRadius: 8, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: '#1c1c1f' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.max(8, weeklySplit.proteinPct)}%`,
                backgroundColor: '#38bdf8',
                borderTopLeftRadius: 7,
                borderBottomLeftRadius: 7,
              }}
            />
            <View
              style={{
                height: '100%',
                width: `${Math.max(8, weeklySplit.carbsPct)}%`,
                backgroundColor: '#f59e0b',
              }}
            />
            <View
              style={{
                height: '100%',
                width: `${Math.max(8, weeklySplit.fatPct)}%`,
                backgroundColor: '#fb7185',
                borderTopRightRadius: 7,
                borderBottomRightRadius: 7,
              }}
            />
          </View>

          {/* Inline Macro Rows — not 3 identical cards */}
          <View style={{ marginTop: 16, gap: 10 }}>
            {[
              { label: 'Protein', pct: weeklySplit.proteinPct, avg: Math.round(weeklySummary?.avgProtein || 0), color: '#38bdf8', kcal: weeklySplit.proteinKcal },
              { label: 'Carbs', pct: weeklySplit.carbsPct, avg: Math.round(weeklySummary?.avgCarbs || 0), color: '#f59e0b', kcal: weeklySplit.carbsKcal },
              { label: 'Fat', pct: weeklySplit.fatPct, avg: Math.round(weeklySummary?.avgFat || 0), color: '#fb7185', kcal: weeklySplit.fatKcal },
            ].map((m) => (
              <View key={m.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color, marginRight: 8 }} />
                <Text style={{ color: '#a1a1aa', fontSize: 12, fontWeight: '600', width: 52 }}>{m.label}</Text>
                <Text style={{ fontFamily: 'Outfit_900Black', color: '#f4f4f5', fontSize: 18, fontVariant: ['tabular-nums'], width: 48 }}>
                  {m.pct}%
                </Text>
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                    {m.avg}g avg · {m.kcal} kcal
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Selected Day Inspector — redesigned with progress bars */}
        <View className="bg-zinc-900/95 border border-zinc-800/90 rounded-3xl p-5 mb-4 shadow-lg shadow-black/40">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-zinc-800/60">
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

            {/* Calorie hero badge */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text
                style={{ fontFamily: 'Outfit_900Black', fontVariant: ['tabular-nums'], fontSize: 22, color: '#f4f4f5' }}
              >
                {Math.round(totals.calories)}
              </Text>
              <Text style={{ color: '#52525b', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                / {targetCalories} kcal
              </Text>
            </View>
          </View>

          {/* Macro rows with progress bars */}
          <View style={{ gap: 14 }}>
            {macroRows.map((m) => {
              const pct = m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
              return (
                <View key={m.label}>
                  {/* Label row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.color }} />
                      <Text style={{ color: m.color, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {m.label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                      <Text style={{ fontFamily: 'Outfit_800ExtraBold', color: '#f4f4f5', fontSize: 15, fontVariant: ['tabular-nums'] }}>
                        {m.consumed}g
                      </Text>
                      <Text style={{ color: '#52525b', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                        / {m.target}g
                      </Text>
                      <Text style={{ color: '#3f3f46', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'], marginLeft: 4 }}>
                        {pct}%
                      </Text>
                    </View>
                  </View>
                  {/* Progress bar */}
                  <View style={{ height: 5, backgroundColor: '#18181b', borderRadius: 4, overflow: 'hidden' }}>
                    <View
                      style={{
                        height: 5,
                        width: `${pct}%`,
                        backgroundColor: m.color,
                        borderRadius: 4,
                        opacity: pct > 100 ? 1 : 0.85,
                      }}
                    />
                  </View>
                </View>
              );
            })}
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
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="text-zinc-500 text-xs font-semibold"
            >
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
                    <Text
                      style={{ fontVariant: ['tabular-nums'] }}
                      className="text-zinc-400 text-xs font-bold"
                    >
                      {section.totalCalories} kcal
                    </Text>
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
