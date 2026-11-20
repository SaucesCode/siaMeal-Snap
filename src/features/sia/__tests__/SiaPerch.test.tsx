import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';
import { useAuthStore } from '../../../stores/authStore';
import { useStreakStore } from '../../../stores/streakStore';
import { useWeightStore } from '../../../stores/weightStore';
import { useSiaStore } from '../siaStore';
import { useTabBarHeight } from '../SiaTabBar';
import { SiaPerchOverlay } from '../SiaPerch';

jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));
let mockSegments: string[] = ['(tabs)', 'profile'];
jest.mock('expo-router', () => ({ useSegments: () => mockSegments }));

configure({ defaultIncludeHiddenElements: true });

describe('<SiaPerchOverlay />', () => {
  beforeEach(() => {
    mockSegments = ['(tabs)', 'profile'];
    useTabBarHeight.setState({ height: 64 });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
    useAuthStore.setState({ profile: { weight_kg: 75, target_weight_kg: null } as any });
    useWeightStore.setState({ entries: [] });
    useStreakStore.setState({ streak: 12 });
  });

  it('perches on the tab bar on Me, with one line about your progress', async () => {
    await render(<SiaPerchOverlay />);
    expect(screen.getByLabelText('Chat with Sia')).toBeTruthy();
    expect(screen.getByText('12 days in a row')).toBeTruthy();
  });

  it.each([[['(tabs)', 'history']], [['(tabs)', 'water']], [['(tabs)']], [['(tabs)', 'index']], [['(tabs)', 'camera']]])(
    'is not on the bar for %j',
    async (segments) => {
      mockSegments = segments;
      await render(<SiaPerchOverlay />);
      expect(screen.queryByLabelText('Chat with Sia')).toBeNull();
    }
  );

  it('is not shown when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<SiaPerchOverlay />);
    expect(screen.queryByLabelText('Chat with Sia')).toBeNull();
  });
});
