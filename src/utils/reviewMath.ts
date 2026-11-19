import type { MealItem } from '../types';
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

/**
 * The meal after per-item fixes ("half the rice"). The AI's totals stay authoritative; the items only
 * say how much of them is left: total × (Σ item kcal × multiplier) / (Σ item kcal).
 */
export function itemsMeal(base: Macros, items: MealItem[], multipliers: number[]): Macros {
  const full = items.reduce((sum, item) => sum + item.calories, 0);
  if (full <= 0) return base;
  const kept = items.reduce((sum, item, i) => sum + item.calories * (multipliers[i] ?? 1), 0);
  return scaleMacros(base, kept / full);
}

const nf = new Intl.NumberFormat('en-US');
/** Protein supplying at least this share of a meal's calories makes it a "protein pick". */
const HIGH_PROTEIN_SHARE = 0.3;

/** Sia's one-line take on the review screen. */
export function siaTake(fit: MealFit, meal: Macros): string {
  if (fit.over > 0) return `This puts you ${nf.format(fit.over)} over. That's okay.`;
  if (fit.reachesProteinGoal) return 'Protein goal done with this one!';
  const left = `${nf.format(fit.left)} left after this.`;
  return meal.calories > 0 && (meal.protein_g * 4) / meal.calories >= HIGH_PROTEIN_SHARE ? `Great protein pick! ${left}` : left;
}
