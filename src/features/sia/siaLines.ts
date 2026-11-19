import type { UserNutritionContext } from '../../services/aiService';

/** Sia's bubble holds one short line. */
export const MAX_LINE = 60;

/** Shortens `name` with an ellipsis so that `name + suffix` fits in MAX_LINE. */
function fitName(name: string, suffix: string): string {
  const room = MAX_LINE - suffix.length;
  const clean = name.trim();
  if (clean.length <= room) return clean;
  return `${clean.slice(0, Math.max(1, room - 1)).trimEnd()}…`;
}

export function mealLoggedLine(mealName: string, ctx: UserNutritionContext): string {
  const proteinLeft = Math.max(0, Math.round(ctx.remainingProtein ?? 0));
  const caloriesLeft = Math.max(0, Math.round(ctx.remainingCalories ?? 0));
  const suffix =
    proteinLeft > 0 ? ` logged. ${proteinLeft} g protein to go.` : ` logged. ${caloriesLeft} kcal left today.`;
  return `${fitName(mealName, suffix)}${suffix}`;
}

export const proteinGoalLine = (targetProtein: number) => `${Math.round(targetProtein)} g protein! Purr-fect day.`;
export const overBudgetLine = () => "A bit over today. Tomorrow's a fresh start.";
export const streakLine = (days: number) => `${days} days in a row!`;
export const morningLine = () => 'Morning! Breakfast first?';
export const waterGoalLine = () => 'Water goal done.';
