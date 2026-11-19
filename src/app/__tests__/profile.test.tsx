import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import ProfileScreen from '../(tabs)/profile';
import { useAuthStore } from '../../stores/authStore';
import { useSiaStore } from '../../features/sia/siaStore';

jest.mock('../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
jest.mock('../../services/notificationService', () => ({
  getNotificationStatus: jest.fn().mockResolvedValue({ isEnabled: false, isExpoGo: true }),
  setNotificationsEnabled: jest.fn(),
}));

configure({ defaultIncludeHiddenElements: true });

describe('<ProfileScreen />', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { email: 'sauces@example.com' } as any,
      profile: {
        full_name: 'James Patrick De Mesa', gender: 'male', age: 26, height_cm: 175, weight_kg: 75,
        activity_level: 'moderate', goal_pace: 'standard', diet_type: 'balanced',
        target_calories: 2100, target_protein_g: 150, target_carbs_g: 220, target_fat_g: 65, target_water_ml: 2600,
        target_weight_kg: 70, foods_avoided: ['No pork'], meal_times: ['08:00', '19:00'],
      } as any,
    });
    useSiaStore.setState({ hidden: false });
  });

  it('shows initials, name and the daily targets', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByText('JM')).toBeTruthy();
    expect(screen.getByText('James Patrick De Mesa')).toBeTruthy();
    expect(screen.getByText('2,100')).toBeTruthy();
    expect(screen.getByText('2.6 L')).toBeTruthy();
  });

  it('"Show Sia" turns Sia off and on', async () => {
    const setHidden = jest.fn().mockResolvedValue(undefined);
    useSiaStore.setState({ setHidden });
    await render(<ProfileScreen />);
    await fireEvent(screen.getByLabelText('Show Sia'), 'valueChange', false);
    expect(setHidden).toHaveBeenCalledWith(true);
  });

  it('shows goal weight, foods you avoid and meal times from onboarding', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByLabelText('Goal weight: 70 kg')).toBeTruthy();
    expect(screen.getByLabelText('Foods you avoid: No pork')).toBeTruthy();
    expect(screen.getByLabelText('Meal times: 8:00 AM, 7:00 PM')).toBeTruthy();
  });
});
