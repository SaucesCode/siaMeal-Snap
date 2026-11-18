import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { MealType } from '../types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Meal types in plain words, in the order of the day. Single source for every screen. */
export const MEAL_TYPES: ReadonlyArray<{ type: MealType; label: string; icon: IoniconName }> = [
  { type: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { type: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { type: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { type: 'snack', label: 'Snack', icon: 'nutrition-outline' },
];

export function mealTypeLabel(type: MealType): string {
  return MEAL_TYPES.find((m) => m.type === type)?.label ?? 'Snack';
}
