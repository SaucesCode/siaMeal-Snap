import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { useCoachStore } from '../../../stores/coachStore';
import { useSiaStore } from '../siaStore';
import { SiaPeek } from '../SiaPeek';

// The coach store imports the Supabase client, which needs env vars this test doesn't use.
jest.mock('../../../lib/supabase', () => ({ supabase: {}, SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }));

configure({ defaultIncludeHiddenElements: true });

describe('<SiaPeek />', () => {
  const openCoach = jest.fn();

  beforeEach(() => {
    openCoach.mockReset();
    useCoachStore.setState({ openCoach });
    useSiaStore.setState({ hidden: false, current: null, queue: [] });
  });

  it('shows Sia over the card; tapping her opens the coach', async () => {
    await render(<SiaPeek />);
    expect(screen.getByTestId('sia')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Chat with Sia'));
    expect(openCoach).toHaveBeenCalledTimes(1);
  });

  it('is not shown when "Show Sia" is off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<SiaPeek />);
    expect(screen.queryByLabelText('Chat with Sia')).toBeNull();
  });
});

describe('<SiaPeek reaction={…} />', () => {
  beforeEach(() => useSiaStore.setState({ hidden: false, current: null, queue: [] }));

  it('can be driven by one screen instead of the shared store, with its own tap action', async () => {
    const onPress = jest.fn();
    const openCoach = jest.fn();
    useCoachStore.setState({ openCoach });
    await render(<SiaPeek reaction={{ expression: 'happy', line: null, spot: 'right' }} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Chat with Sia'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(openCoach).not.toHaveBeenCalled();
  });

  it('still respects "Show Sia" being off', async () => {
    useSiaStore.setState({ hidden: true });
    await render(<SiaPeek reaction={{ expression: 'happy', line: null, spot: 'right' }} />);
    expect(screen.queryByLabelText('Chat with Sia')).toBeNull();
  });
});
