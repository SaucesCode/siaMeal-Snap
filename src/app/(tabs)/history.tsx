import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { useMealStore, getLocalDateString, getTodayString } from '../../stores/mealStore';
import { useAuthStore } from '../../stores/authStore';
import { useCoachStore } from '../../stores/coachStore';
import { DailyMacroSummary } from '../../components/MacroCard';
import { MealItemCard } from '../../components/MealItemCard';
import { MealDetailModal } from '../../components/MealDetailModal';
import { ToastBanner, ToastConfig } from '../../components/ToastBanner';
import { Tap } from '../../components/Tap';
import { WeekStrip, type StripDay } from '../../features/history/WeekStrip';
import { StripSia } from '../../features/history/StripSia';
import { MEAL_TYPES } from '../../constants/mealTypes';
import { Meal } from '../../types';
import { dayLabel, weekLine } from '../../utils/historyText';
import { hapticFeedback } from '../../utils/haptics';
import { palette, radius, space, type } from '../../theme';

const nf = new Intl.NumberFormat('en-US');

/** The 7 local dates of the week `offset` weeks back, oldest first, ending today for offset 0. */
function weekDates(offset: number): string[] {
  const end = new Date();
  end.setDate(end.getDate() - offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (6 - i));
    return getLocalDateString(d);
  });
}

function weekTitle(offset: number, dates: string[]): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Last week';
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  return `${fmt(dates[0])} – ${fmt(dates[6])}`;
}

/** Look back at any day: week strip, that day's totals, and what was eaten. */
export default function HistoryScreen() {
  const profile = useAuthStore((s) => s.profile);
  const openCoach = useCoachStore((s) => s.openCoach);
  const { meals, weeklySummary, fetchMealsForDate, fetchWeeklyStats, deleteMeal } = useMealStore(
    useShallow((s) => ({
      meals: s.meals,
      weeklySummary: s.weeklySummary,
      fetchMealsForDate: s.fetchMealsForDate,
      fetchWeeklyStats: s.fetchWeeklyStats,
      deleteMeal: s.deleteMeal,
    }))
  );

  const [weekOffset, setWeekOffset] = useState(0);
  const dates = useMemo(() => weekDates(weekOffset), [weekOffset]);
  const [selectedDate, setSelectedDate] = useState(dates[6]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastConfig | null>(null);

  const targetCalories = Number(profile?.target_calories) || 2000;
  const targetProtein = Number(profile?.target_protein_g) || 150;
  const targetCarbs = Number(profile?.target_carbs_g) || 200;
  const targetFat = Number(profile?.target_fat_g) || 65;

  useEffect(() => {
    setSelectedDate(dates[6]);
  }, [weekOffset]);

  useEffect(() => {
    fetchMealsForDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    fetchWeeklyStats(targetCalories, weekOffset);
  }, [targetCalories, weekOffset]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMealsForDate(selectedDate), fetchWeeklyStats(targetCalories, weekOffset)]);
    setRefreshing(false);
  };

  const stripDays: StripDay[] = useMemo(
    () =>
      dates.map((date) => {
        const stat = weeklySummary?.days.find((d) => d.date === date);
        const [y, m, d] = date.split('-').map(Number);
        return {
          date,
          weekday: new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' }),
          calories: Number(stat?.calories) || 0,
        };
      }),
    [dates, weeklySummary]
  );

  const totals = useMemo(
    () =>
      meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (Number(meal.calories) || 0),
          protein_g: acc.protein_g + (Number(meal.protein_g) || 0),
          carbs_g: acc.carbs_g + (Number(meal.carbs_g) || 0),
          fat_g: acc.fat_g + (Number(meal.fat_g) || 0),
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      ),
    [meals]
  );

  const sections = useMemo(
    () =>
      MEAL_TYPES.map((mt) => {
        const list = meals.filter((m) => (m.meal_type || 'snack') === mt.type);
        return { ...mt, meals: list, kcal: Math.round(list.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)) };
      }).filter((s) => s.meals.length > 0),
    [meals]
  );

  const label = dayLabel(selectedDate);
  const isToday = label === 'Today';

  const handleDelete = async (id: string) => {
    try {
      await deleteMeal(id);
      setToast({ title: 'Meal deleted', message: `${label}'s totals are updated.`, type: 'info' });
    } catch (err: any) {
      setToast({ title: "Couldn't delete that meal", message: err?.message || 'Please try again.', type: 'warning' });
    }
  };

  const changeWeek = (delta: number) => {
    hapticFeedback.selection();
    setWeekOffset((o) => Math.max(0, o + delta));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.text} colors={[palette.point]} />}
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.title} accessibilityRole="header">
              History
            </Text>
            <Text style={styles.week}>{weekTitle(weekOffset, dates)}</Text>
          </View>
          <Tap
            onPress={() => changeWeek(1)}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Tap>
          <Tap
            onPress={() => changeWeek(-1)}
            disabled={weekOffset === 0}
            accessibilityRole="button"
            accessibilityLabel="Next week"
            accessibilityState={{ disabled: weekOffset === 0 }}
            style={({ pressed }) => [styles.arrow, pressed && styles.pressed, weekOffset === 0 && styles.disabled]}
          >
            <Ionicons name="chevron-forward" size={20} color={palette.text} />
          </Tap>
        </View>

        <StripSia days={stripDays} selected={selectedDate} target={targetCalories} today={getTodayString()} />
        <WeekStrip days={stripDays} selected={selectedDate} target={targetCalories} onSelect={setSelectedDate} />
        <Text style={styles.weekLine}>{weekLine(weeklySummary)}</Text>

        <Text style={styles.dayTitle} accessibilityRole="header">
          {label}
        </Text>
        <DailyMacroSummary
          targetCalories={targetCalories}
          consumedCalories={totals.calories}
          protein={{ consumed: totals.protein_g, target: targetProtein }}
          carbs={{ consumed: totals.carbs_g, target: targetCarbs }}
          fat={{ consumed: totals.fat_g, target: targetFat }}
          variant={isToday ? 'today' : 'past'}
        />

        {sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing logged {isToday ? 'today' : `on ${label}`}.</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={section.icon} size={18} color={palette.textMuted} />
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <Text style={styles.sectionKcal}>{nf.format(section.kcal)} kcal</Text>
              </View>
              {section.meals.map((meal) => (
                <MealItemCard key={meal.id} meal={meal} onDelete={handleDelete} onPress={setSelectedMeal} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {selectedMeal && (
        <MealDetailModal
          meal={selectedMeal}
          visible
          onClose={() => setSelectedMeal(null)}
          onDuplicate={(meal) =>
            setToast({ title: 'Logged again', message: `${meal.name} · ${Math.round(meal.calories)} kcal added to today`, type: 'success' })
          }
          onAskCoach={(meal) => {
            setSelectedMeal(null);
            openCoach(
              `On ${label} I had "${meal.name}" (${Math.round(meal.calories)} kcal, ${Math.round(meal.protein_g)}g protein). How did that day go for my goals?`
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: 120 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[4] },
  title: { fontFamily: type.display, fontSize: type.size.title + 4, color: palette.text },
  week: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.textMuted, marginTop: 2 },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  weekLine: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.textMuted, marginBottom: space[6] },
  dayTitle: { fontFamily: type.displayBold, fontSize: type.size.section + 3, color: palette.text, marginBottom: space[2] },
  empty: {
    alignItems: 'center',
    paddingVertical: space[6],
    borderRadius: radius.card,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  emptyText: { fontFamily: type.bodySemibold, fontSize: type.size.body, color: palette.textMuted },
  section: { marginBottom: space[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 40 },
  sectionLabel: { flex: 1, fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  sectionKcal: { fontFamily: type.displayBold, fontSize: type.size.secondary, color: palette.textMuted, fontVariant: ['tabular-nums'] },
});
