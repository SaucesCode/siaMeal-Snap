import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { useCoachStore } from '../../../stores/coachStore';
import { useSiaStore } from '../../sia/siaStore';
import { stripSiaX } from '../../sia/tabMoods';
import { StripSia } from '../StripSia';
import type { StripDay } from '../WeekStrip';

jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

const days: StripDay[] = ['16', '17', '18', '19', '20', '21', '22'].map((d, i) => ({
  date: `2026-11-${d}`,
  weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
  calories: [2300, 1950, 0, 1500, 800, 0, 0][i],
}));
const TODAY = '2026-11-20';

describe('<StripSia />', () => {
  const openCoach = jest.fn();

  beforeEach(() => {
    openCoach.mockReset();
    useCoachStore.setState({ openCoach });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
  });

  it('shows how the selected day went, and tapping her opens the coach', async () => {
    await render(<StripSia days={days} selected="2026-11-16" target={2000} today={TODAY} />);
    await fireEvent.press(screen.getByLabelText('Sia: Over target'));
    expect(openCoach).toHaveBeenCalledTimes(1);
  });

  it('treats today and future days differently from past ones', async () => {
    const { rerender } = await render(<StripSia days={days} selected={TODAY} target={2000} today={TODAY} />);
    expect(screen.getByLabelText('Sia: Today is still going')).toBeTruthy();
    await rerender(<StripSia days={days} selected="2026-11-22" target={2000} today={TODAY} />);
    expect(screen.getByLabelText('Sia: Not here yet')).toBeTruthy();
  });

  it('is not shown when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<StripSia days={days} selected="2026-11-16" target={2000} today={TODAY} />);
    expect(screen.queryByLabelText(/^Sia:/)).toBeNull();
  });

  it('ends above the last day picked after several quick taps', async () => {
    const { rerender } = await render(<StripSia days={days} selected="2026-11-16" target={2000} today={TODAY} />);
    await fireEvent(screen.getByTestId('strip-sia-track'), 'layout', { nativeEvent: { layout: { width: 343, height: 56, x: 0, y: 0 } } });
    for (const d of ['2026-11-18', '2026-11-21', '2026-11-19']) {
      await rerender(<StripSia days={days} selected={d} target={2000} today={TODAY} />);
    }
    expect(screen.getByTestId('strip-sia').props.accessibilityValue).toEqual({ now: stripSiaX(3, 343, 56) });
  });
});
