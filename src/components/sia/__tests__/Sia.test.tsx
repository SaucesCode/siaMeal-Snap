import React from 'react';
import { configure, render, screen } from '@testing-library/react-native';
import { Sia } from '..';

// Sia is decorative and deliberately hidden from screen readers, which Testing Library
// excludes from queries by default; the last test asserts that hiding explicitly.
configure({ defaultIncludeHiddenElements: true });

// Testing Library 14 renders asynchronously.
const renderSia = (props: React.ComponentProps<typeof Sia>) =>
  render(<Sia animated={false} {...props} />);

describe('<Sia />', () => {
  it('happy shows her wink, not an open eye', async () => {
    await renderSia({ expression: 'happy', size: 120 });
    expect(screen.getByTestId('sia-eye-wink')).toBeTruthy();
    expect(screen.queryByTestId('sia-eye-open')).toBeNull();
  });

  it('resting has an open eye with a pupil; sleepy has closed eyes and no pupil', async () => {
    await renderSia({ expression: 'resting', size: 120 });
    expect(screen.getByTestId('sia-pupil')).toBeTruthy();
    await screen.unmount();

    await renderSia({ expression: 'sleepy', size: 120 });
    expect(screen.getByTestId('sia-eye-closed')).toBeTruthy();
    expect(screen.queryByTestId('sia-pupil')).toBeNull();
  });

  it('always keeps the camera shutter at full size', async () => {
    await renderSia({ expression: 'puzzled', size: 120 });
    expect(screen.getByTestId('sia-shutter')).toBeTruthy();
  });

  it('draws whiskers on the full art and switches to the simplified head below 48 px', async () => {
    await renderSia({ expression: 'resting', size: 78 });
    expect(screen.getByTestId('sia-whiskers')).toBeTruthy();
    expect(screen.queryByTestId('sia-simplified')).toBeNull();
    await screen.unmount();

    await renderSia({ expression: 'resting', size: 28 });
    expect(screen.getByTestId('sia-simplified')).toBeTruthy();
    expect(screen.queryByTestId('sia-whiskers')).toBeNull();
  });

  it('renders the mouth and extras of the pose', async () => {
    await renderSia({ expression: 'celebrating', size: 120 });
    expect(screen.getByTestId('sia-mouth-wOpen')).toBeTruthy();
    expect(screen.getByTestId('sia-extra-stars')).toBeTruthy();
    await screen.unmount();

    await renderSia({ expression: 'puzzled', size: 120 });
    expect(screen.getByTestId('sia-mouth-o')).toBeTruthy();
    expect(screen.getByTestId('sia-extra-question')).toBeTruthy();
  });

  it('is decorative: hidden from screen readers', async () => {
    await renderSia({ expression: 'resting', size: 120 });
    const root = screen.getByTestId('sia');
    expect(root.props.accessible).toBe(false);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(root.props.accessibilityElementsHidden).toBe(true);
  });
});
