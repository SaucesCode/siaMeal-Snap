import { calorieSummary } from './todaySummary';

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Portion scaling on the review screen: every number times `multiplier`, in whole units. */
export function scaleMacros(base: Macros, multiplier: number): Macros {
  const s = (n: number) => Math.round((Number(n) || 0) * multiplier);
  return { calories: s(base.calories), protein_g: s(base.protein_g), carbs_g: s(base.carbs_g), fat_g: s(base.fat_g) };
}

export interface MealFit {
  /** How full today's ring is before this meal (0–1). */
  beforeFraction: number;
  /** …and after it (0–1). */
  afterFraction: number;
  left: number;
  over: number;
  reachesProteinGoal: boolean;
  expression: 'happy' | 'celebrating' | 'concerned';
}

/** How a meal on the review screen fits into what has been eaten today. */
export function mealFit(
  todayCalories: number,
  todayProtein: number,
  meal: Macros,
  targetCalories: number,
  targetProtein: number
): MealFit {
  const before = calorieSummary(todayCalories, targetCalories);
  const after = calorieSummary(todayCalories + (Number(meal.calories) || 0), targetCalories);
  const proteinAfter = todayProtein + (Number(meal.protein_g) || 0);
  const reachesProteinGoal = targetProtein > 0 && todayProtein < targetProtein && proteinAfter >= targetProtein;
  return {
    beforeFraction: before.fraction,
    afterFraction: after.fraction,
    left: after.left,
    over: after.over,
    reachesProteinGoal,
    expression: after.over > 0 ? 'concerned' : reachesProteinGoal ? 'celebrating' : 'happy',
  };
}
