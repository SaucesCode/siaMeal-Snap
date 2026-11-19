import type { FitnessGoal } from '../../types';

export type StepId = 'name' | 'body' | 'activity' | 'goal' | 'goalWeight' | 'diet' | 'foods' | 'meals' | 'plan';

/** The onboarding screens for this person, in order. */
export function onboardingSteps({ hasName, goal }: { hasName: boolean; goal: FitnessGoal }): StepId[] {
  return [
    ...(hasName ? [] : (['name'] as StepId[])),
    'body',
    'activity',
    'goal',
    ...(goal === 'maintenance' ? [] : (['goalWeight'] as StepId[])),
    'diet',
    'foods',
    'meals',
    'plan',
  ];
}

/** Roughly 7,700 kcal of deficit or surplus per kg of body weight. */
const KCAL_PER_KG = 7700;

/** Weeks to reach the goal weight at a daily calorie adjustment; null when there's no honest estimate. */
export function weeksToGoal(currentKg: number, goalKg: number, dailyAdjustmentKcal: number): number | null {
  const change = goalKg - currentKg;
  if (change === 0 || dailyAdjustmentKcal === 0 || Math.sign(change) !== Math.sign(dailyAdjustmentKcal)) return null;
  return Math.ceil((Math.abs(change) * KCAL_PER_KG) / (Math.abs(dailyAdjustmentKcal) * 7));
}

/** Inline message for the goal-weight field, or null when it's usable. */
export function validateGoalWeight(currentKg: number, input: string, goal: FitnessGoal): string | null {
  const kg = Number(input.replace(',', '.'));
  if (!input.trim() || !Number.isFinite(kg) || kg < 30 || kg > 300) return 'Enter a weight from 30 to 300 kg.';
  if (goal === 'fat_loss' && kg >= currentKg) return `Pick a weight below ${currentKg} kg to lose weight.`;
  if (goal === 'muscle_gain' && kg <= currentKg) return `Pick a weight above ${currentKg} kg to gain weight.`;
  return null;
}

/** Foods people commonly avoid, kept short and local. */
export const FOODS_TO_AVOID = [
  'No pork',
  'No beef',
  'Vegetarian',
  'Vegan',
  'No seafood',
  'No dairy',
  'Gluten-free',
  'Nut allergy',
] as const;

/** Breakfast, lunch and dinner with sensible starting times. */
export const MEAL_SLOTS = [
  { label: 'Breakfast', time: '08:00' },
  { label: 'Lunch', time: '12:30' },
  { label: 'Dinner', time: '19:00' },
] as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valid HH:MM times only, earliest first, at most 6 (matches the database check). */
export function mealReminderTimes(times: string[]): string[] {
  return [...new Set(times.filter((t) => HHMM.test(t)))].sort().slice(0, 6);
}
