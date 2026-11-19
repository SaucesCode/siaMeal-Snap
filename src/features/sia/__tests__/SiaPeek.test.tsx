import React from 'react';
import { configure, fireEvent, render, screen } from '@testing-library/react-native';
import { useCoachStore } from '../../../stores/coachStore';
import { useSiaStore } from '../siaStore';
import { SiaPeek } from '../SiaPeek';

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
