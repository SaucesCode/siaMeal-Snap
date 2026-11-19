import type { Meal, Profile } from '../types';
import type { UserNutritionContext } from '../services/aiService';

const DEFAULT_TARGETS = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

const humanize = (value: string) => value.replace(/_/g, ' ');

/**
 * Builds the live nutrition context the AI coach receives: today's targets, what has been
 * eaten today, what remains, and the names of today's meals. `todayMeals` must be today's
 * meals (not whichever day is open in History).
 */
export function buildCoachContext(
  profile: Profile | null,
  email: string | null | undefined,
  todayMeals: Meal[]
): UserNutritionContext {
  const sum = (pick: (m: Meal) => number | null | undefined) =>
    Math.round(todayMeals.reduce((total, m) => total + (Number(pick(m)) || 0), 0));

  const consumed = {
    calories: sum((m) => m.calories),
    protein: sum((m) => m.protein_g),
    carbs: sum((m) => m.carbs_g),
    fat: sum((m) => m.fat_g),
  };
  const target = {
    calories: profile?.target_calories || DEFAULT_TARGETS.calories,
    protein: profile?.target_protein_g || DEFAULT_TARGETS.protein,
    carbs: profile?.target_carbs_g || DEFAULT_TARGETS.carbs,
    fat: profile?.target_fat_g || DEFAULT_TARGETS.fat,
  };

  return {
    displayName: profile?.full_name?.trim() || email?.split('@')[0] || undefined,
    goal: profile?.fitness_goal ? humanize(profile.fitness_goal) : 'fat loss',
    dietType: profile?.diet_type ? humanize(profile.diet_type) : 'balanced',
    foodsAvoided: profile?.foods_avoided ?? [],
    targetCalories: target.calories,
    targetProtein: target.protein,
    targetCarbs: target.carbs,
    targetFat: target.fat,
    consumedCalories: consumed.calories,
    consumedProtein: consumed.protein,
    consumedCarbs: consumed.carbs,
    consumedFat: consumed.fat,
    remainingCalories: Math.max(0, target.calories - consumed.calories),
    remainingProtein: Math.max(0, target.protein - consumed.protein),
    remainingCarbs: Math.max(0, target.carbs - consumed.carbs),
    remainingFat: Math.max(0, target.fat - consumed.fat),
    // Oldest first, so the coach reads the day in order.
    todayMeals: [...todayMeals]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((m) => `${m.name} (${Math.round(Number(m.calories) || 0)} kcal)`),
  };
}
