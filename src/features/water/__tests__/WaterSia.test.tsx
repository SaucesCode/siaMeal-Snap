import React from 'react';
import { act, configure, fireEvent, render, screen } from '@testing-library/react-native';
import { useCoachStore } from '../../../stores/coachStore';
import { useSiaStore } from '../../sia/siaStore';
import { WaterSia } from '../WaterSia';

jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

describe('<WaterSia />', () => {
  const openCoach = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 20, 14, 30));
    openCoach.mockReset();
    useCoachStore.setState({ openCoach });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
  });

  afterEach(() => jest.useRealTimers());

  it('looks thirsty when well behind the pace, and tapping her opens the coach', async () => {
    await render(<WaterSia ml={300} goal={2500} addedAt={0} />);
    await fireEvent.press(screen.getByLabelText('Sia: Thirsty — a glass would help'));
    expect(openCoach).toHaveBeenCalledTimes(1);
  });

  it('is pleased for a moment after you add water, then goes back to her mood', async () => {
    const { rerender } = await render(<WaterSia ml={300} goal={2500} addedAt={0} />);
    await rerender(<WaterSia ml={550} goal={2500} addedAt={Date.now()} />);
    expect(screen.getByLabelText('Sia: Nice, keep going')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    // 550 ml against a 1250 ml pace is 44 %: no longer thirsty, just behind.
    expect(screen.getByLabelText('Sia: A little behind')).toBeTruthy();
  });

  it('is not shown when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<WaterSia ml={300} goal={2500} addedAt={0} />);
    expect(screen.queryByLabelText(/^Sia:/)).toBeNull();
  });
});
