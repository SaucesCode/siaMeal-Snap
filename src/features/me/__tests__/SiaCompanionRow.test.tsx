import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { useCoachStore } from '../../../stores/coachStore';
import { useSiaStore } from '../../sia/siaStore';
import { SiaCompanionRow } from '../SiaCompanionRow';

jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

describe('<SiaCompanionRow />', () => {
  const openCoach = jest.fn();

  beforeEach(() => {
    openCoach.mockReset();
    useCoachStore.setState({ openCoach });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
  });

  it('shows one progress line, and tapping the row opens the coach', async () => {
    await render(<SiaCompanionRow weightKg={77.1} targetWeightKg={75} streak={4} />);
    expect(screen.getByText('2.1 kg to your goal weight')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Sia: 2.1 kg to your goal weight. Opens the coach'));
    expect(openCoach).toHaveBeenCalledTimes(1);
  });

  it('is not shown when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<SiaCompanionRow weightKg={77.1} targetWeightKg={75} streak={4} />);
    expect(screen.queryByText('2.1 kg to your goal weight')).toBeNull();
  });
});
