import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import ReviewScreen from '../review';
import { useMealStore, getTodayString } from '../../stores/mealStore';
import { useAuthStore } from '../../stores/authStore';
import type { Meal } from '../../types';

jest.mock('../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
jest.mock('../../lib/mealImages', () => ({ useMealImageSource: (uri?: string | null) => (uri ? { uri } : null) }));
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

describe('<ReviewScreen /> with the foods Sia found', () => {
  const logMeal = jest.fn();
  const items = [
    { name: 'Chicken thigh', amount: '2 pcs', calories: 320, protein_g: 30, carbs_g: 0, fat_g: 21, x: 0.45, y: 0.4 },
    { name: 'White rice', amount: '1 cup', calories: 260, protein_g: 5, carbs_g: 57, fat_g: 1, x: 0.25, y: 0.7 },
    { name: 'Adobo sauce', amount: '3 tbsp', calories: 100, protein_g: 7, carbs_g: 15, fat_g: 0 },
  ];

  beforeEach(() => {
    logMeal.mockReset().mockResolvedValue(undefined);
    useAuthStore.setState({ profile: { target_calories: 2000, target_protein_g: 150, target_carbs_g: 200, target_fat_g: 65 } as any });
    useMealStore.setState({
      todayMeals: [earlier],
      todayMealsDate: getTodayString(),
      logMeal,
      draftMeal: { name: 'Chicken adobo with rice', meal_type: 'lunch', calories: 680, protein_g: 42, carbs_g: 72, fat_g: 22, food_items: [], items, image_url: 'file:///meal.jpg' },
    });
  });

  it("labels the foods on the photo, lists them, and shows Sia's take", async () => {
    await render(<ReviewScreen />);
    expect(screen.getByText('Chicken thigh · 320')).toBeTruthy();
    expect(screen.queryByText('Adobo sauce · 100')).toBeNull(); // no position from the AI, so no label
    expect(screen.getByText('White rice')).toBeTruthy();
    expect(screen.getByText('1 cup')).toBeTruthy();
    expect(screen.getByText(/760 left after this\./)).toBeTruthy();
    expect(screen.getByText(/680 kcal/)).toBeTruthy();
  });

  it('half the rice: the meal drops by half the rice and saves that', async () => {
    await render(<ReviewScreen />);
    await fireEvent.press(screen.getByText('White rice'));
    await fireEvent.press(screen.getByLabelText('Half'));
    expect(screen.getByText(/550 kcal/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Save'));
    expect(logMeal).toHaveBeenCalledWith(expect.objectContaining({ calories: 550 }));
  });

  it('removing every food asks for at least one before saving', async () => {
    await render(<ReviewScreen />);
    for (const name of ['Chicken thigh', 'White rice', 'Adobo sauce']) {
      await fireEvent.press(screen.getByText(name));
      await fireEvent.press(screen.getByLabelText(`Remove ${name}`));
    }
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Add at least one food')).toBeTruthy();
    expect(logMeal).not.toHaveBeenCalled();
  });
});
