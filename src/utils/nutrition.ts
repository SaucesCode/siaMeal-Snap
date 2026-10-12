import { Gender, MealType, FitnessGoal, ActivityLevel, GoalPace, DietType } from '../types';
import { Ionicons } from '@expo/vector-icons';

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_water_ml: number;
}

export const ACTIVITY_LEVELS: {
  level: ActivityLevel;
  title: string;
  desc: string;
  multiplier: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    level: 'sedentary',
    title: 'Sedentary',
    desc: 'Desk job, minimal walking, little or no exercise',
    multiplier: 1.2,
    icon: 'bed-outline',
    color: '#71717a',
  },
  {
    level: 'light',
    title: 'Lightly Active',
    desc: 'Light exercise or walking 1–3 days per week',
    multiplier: 1.375,
    icon: 'walk-outline',
    color: '#06b6d4',
  },
  {
    level: 'moderate',
    title: 'Moderately Active',
    desc: 'Moderate workouts, gym or sports 3–5 days/week',
    multiplier: 1.55,
    icon: 'bicycle-outline',
    color: '#10b981',
  },
  {
    level: 'very_active',
    title: 'Very Active',
    desc: 'Intense training or heavy sports 6–7 days/week',
    multiplier: 1.725,
    icon: 'barbell-outline',
    color: '#f59e0b',
  },
  {
    level: 'extra_active',
    title: 'Extremely Active',
    desc: 'Physical labor job & double daily training sessions',
    multiplier: 1.9,
    icon: 'flame-outline',
    color: '#fb7185',
  },
];

export const GOAL_OPTIONS: {
  goal: FitnessGoal;
  pace: GoalPace;
  title: string;
  desc: string;
  adjustment: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tag: string;
}[] = [
  {
    goal: 'fat_loss',
    pace: 'standard',
    title: 'Fat Loss (Recommended)',
    desc: 'Safe & sustainable deficit (~0.5 kg / 1.1 lbs fat loss per week)',
    adjustment: -500,
    icon: 'flame-outline',
    color: '#10b981',
    tag: '-500 kcal/day',
  },
  {
    goal: 'fat_loss',
    pace: 'steady',
    title: 'Steady & Gentle Cut',
    desc: 'Mild deficit for slow, easy fat loss with maximum muscle retention',
    adjustment: -300,
    icon: 'trending-down-outline',
    color: '#06b6d4',
    tag: '-300 kcal/day',
  },
  {
    goal: 'fat_loss',
    pace: 'aggressive',
    title: 'Aggressive Fat Loss',
    desc: 'Faster fat loss (~0.8 kg/week). Recommended for short periods only',
    adjustment: -750,
    icon: 'flash-outline',
    color: '#f59e0b',
    tag: '-750 kcal/day',
  },
  {
    goal: 'maintenance',
    pace: 'maintain',
    title: 'Maintain Weight & Recomp',
    desc: 'Eat at your exact energy expenditure to tone up & maintain current weight',
    adjustment: 0,
    icon: 'scale-outline',
    color: '#818cf8',
    tag: 'TDEE Equilibrium',
  },
  {
    goal: 'muscle_gain',
    pace: 'lean_bulk',
    title: 'Build Muscle (Lean Bulk)',
    desc: 'Controlled surplus to maximize muscle hypertrophy while minimizing fat gain',
    adjustment: 300,
    icon: 'trending-up-outline',
    color: '#38bdf8',
    tag: '+300 kcal/day',
  },
];

export const DIET_STYLES: {
  type: DietType;
  title: string;
  desc: string;
  split: { p: number; c: number; f: number };
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    type: 'high_protein',
    title: 'High Protein / Athletic',
    desc: '40% Protein, 35% Carbs, 25% Fat — Best for muscle building & satiety',
    split: { p: 0.40, c: 0.35, f: 0.25 },
    icon: 'barbell-outline',
    color: '#38bdf8',
  },
  {
    type: 'balanced',
    title: 'Balanced Fitness',
    desc: '30% Protein, 40% Carbs, 30% Fat — Scientifically balanced baseline',
    split: { p: 0.30, c: 0.40, f: 0.30 },
    icon: 'shield-checkmark-outline',
    color: '#10b981',
  },
  {
    type: 'keto',
    title: 'Keto / Low-Carb',
    desc: '25% Protein, 10% Carbs, 65% Fat — Ketogenic & low-glycemic eating',
    split: { p: 0.25, c: 0.10, f: 0.65 },
    icon: 'leaf-outline',
    color: '#f59e0b',
  },
  {
    type: 'endurance',
    title: 'High Carb / Endurance',
    desc: '25% Protein, 55% Carbs, 20% Fat — Optimal fuel for runners & cardio',
    split: { p: 0.25, c: 0.55, f: 0.20 },
    icon: 'flash-outline',
    color: '#fb7185',
  },
];

/**
 * Calculates BMR, TDEE, adjusted target calories, and exact macro grams
 */
export function calculateNutritionTargets(
  gender: Gender,
  age: number,
  weight_kg: number,
  height_cm: number,
  goal: FitnessGoal = 'fat_loss',
  activity_level: ActivityLevel = 'light',
  goal_pace: GoalPace = 'standard',
  diet_type: DietType = 'balanced'
): NutritionTargets {
  // 1. Mifflin-St Jeor BMR
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  bmr = Math.round(bmr);

  // 2. Activity Multiplier -> TDEE
  const act = ACTIVITY_LEVELS.find((a) => a.level === activity_level) || ACTIVITY_LEVELS[1];
  const tdee = Math.round(bmr * act.multiplier);

  // 3. Goal Adjustment
  const goalObj = GOAL_OPTIONS.find((g) => g.pace === goal_pace) || GOAL_OPTIONS[0];
  const target_calories = Math.max(1200, Math.round(tdee + goalObj.adjustment));

  // 4. Macro Ratios based on Diet Style
  const diet = DIET_STYLES.find((d) => d.type === diet_type) || DIET_STYLES[1];
  const target_protein_g = Math.round((target_calories * diet.split.p) / 4);
  const target_carbs_g = Math.round((target_calories * diet.split.c) / 4);
  const target_fat_g = Math.round((target_calories * diet.split.f) / 9);

  // 5. Recommended Daily Hydration (35ml per kg body weight)
  const target_water_ml = Math.round(weight_kg * 35);

  return {
    bmr,
    tdee,
    target_calories,
    target_protein_g,
    target_carbs_g,
    target_fat_g,
    target_water_ml,
  };
}

export function getDefaultMealType(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

export function getMealTypeLabel(type?: MealType): string {
  switch (type) {
    case 'breakfast':
      return 'Breakfast';
    case 'lunch':
      return 'Lunch';
    case 'dinner':
      return 'Dinner';
    case 'snack':
    default:
      return 'Snack';
  }
}

export function getMealTypeIcon(type?: MealType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'breakfast':
      return 'sunny-outline';
    case 'lunch':
      return 'restaurant-outline';
    case 'dinner':
      return 'moon-outline';
    case 'snack':
    default:
      return 'nutrition-outline';
  }
}

/**
 * Macro Conservation Law & Mathematical Validation (ISO/IEC 5055 Quality Standards)
 * Grounded in the USDA / Atwater General Factor System:
 * Energy (kcal) = (4 * Protein_g) + (4 * Carbs_g) + (9 * Fat_g)
 */
export interface MacroIntegrityReport {
  isValid: boolean;
  computedCalories: number;
  reportedCalories: number;
  variancePercentage: number;
  warningMessage?: string;
}

export function evaluateMacroIntegrity(
  calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number,
  allowedVarianceFraction = 0.20 // 20% tolerance to account for dietary fiber and FDA rounding guidelines
): MacroIntegrityReport {
  const p = Math.max(0, protein_g || 0);
  const c = Math.max(0, carbs_g || 0);
  const f = Math.max(0, fat_g || 0);
  const reported = Math.max(0, calories || 0);

  const computed = Math.round(p * 4 + c * 4 + f * 9);

  if (reported < 10 && computed < 10) {
    return {
      isValid: true,
      computedCalories: computed,
      reportedCalories: reported,
      variancePercentage: 0,
    };
  }

  // Anomaly: calories reported with 0 macros entered
  if (reported > 30 && p + c + f < 1) {
    return {
      isValid: false,
      computedCalories: computed,
      reportedCalories: reported,
      variancePercentage: 100,
      warningMessage: 'Calories entered without macronutrients.',
    };
  }

  // Anomaly: macros entered with 0 calories reported
  if (reported < 10 && computed > 30) {
    return {
      isValid: false,
      computedCalories: computed,
      reportedCalories: reported,
      variancePercentage: 100,
      warningMessage: 'Macronutrients entered without calories.',
    };
  }

  const denominator = Math.max(reported, computed, 1);
  const variance = Math.abs(reported - computed) / denominator;

  if (variance > allowedVarianceFraction) {
    const pct = Math.round(variance * 100);
    const isUnder = reported < computed;
    return {
      isValid: false,
      computedCalories: computed,
      reportedCalories: reported,
      variancePercentage: pct,
      warningMessage: isUnder
        ? `Reported calories (${reported} kcal) are ${pct}% lower than macro energy (${computed} kcal).`
        : `Reported calories (${reported} kcal) are ${pct}% higher than macro energy (${computed} kcal).`,
    };
  }

  return {
    isValid: true,
    computedCalories: computed,
    reportedCalories: reported,
    variancePercentage: Math.round(variance * 100),
  };
}

/**
 * Calibrates calories from macros if calories are missing or uninitialized.
 */
export function reconcileCaloriesWithMacros(
  calories: number,
  protein_g: number,
  carbs_g: number,
  fat_g: number
): number {
  const p = Math.max(0, protein_g || 0);
  const c = Math.max(0, carbs_g || 0);
  const f = Math.max(0, fat_g || 0);
  const rawCal = Math.max(0, calories || 0);

  const atwaterCal = Math.round(p * 4 + c * 4 + f * 9);
  if (rawCal <= 0 && atwaterCal > 0) {
    return atwaterCal;
  }
  return rawCal;
}

