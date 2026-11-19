import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { NotFoodSheet } from '../NotFoodSheet';

jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

describe('<NotFoodSheet />', () => {
  it("shows Sia's reason and offers to retake or type the meal", async () => {
    const onTryAgain = jest.fn();
    const onTypeInstead = jest.fn();
    await render(<NotFoodSheet reason="That's a keyboard, not a meal." onTryAgain={onTryAgain} onTypeInstead={onTypeInstead} />);
    expect(screen.getByText("That doesn't look like food")).toBeTruthy();
    expect(screen.getByText("That's a keyboard, not a meal.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    await fireEvent.press(screen.getByText('Type it instead'));
    expect(onTryAgain).toHaveBeenCalledTimes(1);
    expect(onTypeInstead).toHaveBeenCalledTimes(1);
  });
});
