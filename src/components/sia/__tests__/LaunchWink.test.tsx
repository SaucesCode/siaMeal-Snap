import React from 'react';
import { act, configure, render, screen } from '@testing-library/react-native';
import { LaunchWink, LAUNCH_FADE_MS } from '../LaunchWink';

configure({ defaultIncludeHiddenElements: true });

describe('<LaunchWink />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows Sia winking while the splash fades', async () => {
    await render(<LaunchWink onReady={() => {}} onDone={() => {}} />);
    expect(screen.getByTestId('sia-eye-wink')).toBeTruthy();
  });

  it('reports ready on first layout so the native splash can hide underneath', async () => {
    const onReady = jest.fn();
    await render(<LaunchWink onReady={onReady} onDone={() => {}} />);
    await act(async () => {
      screen.getByTestId('launch-wink').props.onLayout({ nativeEvent: { layout: { width: 1, height: 1, x: 0, y: 0 } } });
    });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('calls onDone once the fade has finished, not before', async () => {
    const onDone = jest.fn();
    await render(<LaunchWink onReady={() => {}} onDone={onDone} />);
    await act(async () => {
      jest.advanceTimersByTime(LAUNCH_FADE_MS - 1);
    });
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
