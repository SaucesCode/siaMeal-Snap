import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HistoryScreen from '../(tabs)/history';
import { useAuthStore } from '../../stores/authStore';
import { useMealStore } from '../../stores/mealStore';
import { useSiaStore } from '../../features/sia/siaStore';

jest.mock('../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

const noop = async () => {};
const metrics = { frame: { x: 0, y: 0, width: 375, height: 800 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderHistory = () => render(<SafeAreaProvider initialMetrics={metrics}><HistoryScreen /></SafeAreaProvider>);

describe('<HistoryScreen /> with nothing logged', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { email: 'a@b.co' } as any, profile: { target_calories: 2000 } as any });
    useMealStore.setState({ meals: [], isLoading: false, weeklySummary: null, fetchMealsForDate: noop as any, fetchWeeklyStats: noop as any });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
  });

  it('shows Sia once, not twice', async () => {
    await renderHistory();
    expect(screen.getAllByTestId('sia')).toHaveLength(1);
  });

  it('shows no Sia at all when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await renderHistory();
    expect(screen.queryAllByTestId('sia')).toHaveLength(0);
  });
});
