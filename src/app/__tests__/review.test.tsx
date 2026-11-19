import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import ReviewScreen from '../review';
import { useMealStore, getTodayString } from '../../stores/mealStore';
import { useAuthStore } from '../../stores/authStore';
import type { Meal } from '../../types';

jest.mock('../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
jest.mock('../../lib/mealImages', () => ({ useMealImageSource: () => null }));
const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

configure({ defaultIncludeHiddenElements: true });

const earlier: Meal = {
  id: 'm1', user_id: 'u', name: 'Oats', meal_type: 'breakfast', calories: 560, protein_g: 33, carbs_g: 70, fat_g: 14,
  food_items: [], image_url: null, logged_at: new Date().toISOString(),
};

describe('<ReviewScreen />', () => {
  const logMeal = jest.fn();

  beforeEach(() => {
    logMeal.mockReset().mockResolvedValue(undefined);
    mockRouter.replace.mockReset();
    useAuthStore.setState({ profile: { target_calories: 2000, target_protein_g: 150, target_carbs_g: 200, target_fat_g: 65 } as any });
    useMealStore.setState({
      todayMeals: [earlier],
      todayMealsDate: getTodayString(),
      logMeal,
      draftMeal: { name: 'Chicken adobo with rice', meal_type: 'lunch', calories: 680, protein_g: 42, carbs_g: 72, fat_g: 22, fiber_g: 3, sugar_g: 9, sodium_mg: 820, food_items: ['chicken', 'rice'], image_url: null },
    });
  });

  it('shows the meal, what it adds, and what is left after it', async () => {
    await render(<ReviewScreen />);
    expect(screen.getByDisplayValue('Chicken adobo with rice')).toBeTruthy();
    expect(screen.getByText('+680')).toBeTruthy();
    expect(screen.getByText('+42 g')).toBeTruthy();
    expect(screen.getByText('760 left after')).toBeTruthy();
  });

  it('portion 2× doubles the meal and saves the doubled numbers to the chosen meal', async () => {
    await render(<ReviewScreen />);
    await fireEvent.press(screen.getByLabelText('Portion 2×'));
    expect(screen.getByText('+1,360')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save'));
    expect(logMeal).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Chicken adobo with rice', meal_type: 'lunch', calories: 1360, protein_g: 84, carbs_g: 144, fat_g: 44 })
    );
    expect(mockRouter.replace).toHaveBeenCalled();
  });

  it('an empty name shows an inline message and does not save', async () => {
    await render(<ReviewScreen />);
    await fireEvent.changeText(screen.getByLabelText('Meal name'), '  ');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Give it a name')).toBeTruthy();
    expect(logMeal).not.toHaveBeenCalled();
  });

  it("shows where today's macros land after this meal, and the extras the AI found", async () => {
    await render(<ReviewScreen />);
    expect(screen.getByText('Today after this meal')).toBeTruthy();
    expect(screen.getByText('75 / 150 g')).toBeTruthy();
    expect(screen.getByText('142 / 200 g')).toBeTruthy();
    expect(screen.getByText('36 / 65 g')).toBeTruthy();
    expect(screen.getByText('Fiber 3 g')).toBeTruthy();
    expect(screen.getByText('Sodium 820 mg')).toBeTruthy();
  });
});
