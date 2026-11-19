export type Gender = 'male' | 'female';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FitnessGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
export type GoalPace = 'steady' | 'standard' | 'aggressive' | 'maintain' | 'lean_bulk';
export type DietType = 'balanced' | 'high_protein' | 'keto' | 'endurance';

export interface Profile {
  id: string;
  full_name?: string;
  avatar_icon?: string;
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level?: ActivityLevel;
  fitness_goal?: FitnessGoal;
  goal_pace?: GoalPace;
  diet_type?: DietType;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_water_ml?: number;
  /** Goal weight in kg (losing or gaining). */
  target_weight_kg?: number | null;
  /** Foods the coach and meal ideas should avoid, e.g. "no pork". */
  foods_avoided?: string[];
  /** Usual meal times as HH:MM, used for reminders. */
  meal_times?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  meal_type?: MealType;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  food_items: string[];
  image_url?: string | null;
  logged_at: string;
  created_at?: string;
}

/** One food the AI found on the plate (mirrors supabase/functions/analyze-meal/items.ts). */
export interface MealItem {
  name: string;
  /** Plain portion, e.g. "1 cup". */
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Centre of the item in the photo, 0–1 from the left/top. */
  x?: number;
  y?: number;
}

export interface AnalyzeMealResponse {
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  potassium_mg?: number;
  ingredients: string[];
  items?: MealItem[];
  confidence_score?: number;
  portion_notes?: string;
  dietary_tags?: string[];
  feline_verdict?: string;
  is_food?: boolean;
  non_food_reason?: string;
}
