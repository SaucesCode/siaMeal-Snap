import React from 'react';
import { processColor } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { palette } from '../../theme';
import { DailyMacroSummary } from '../MacroCard';

/** react-native-svg hands colours to the host as processed ARGB numbers. */
const arcStroke = () => screen.getByTestId('calorie-eye-arc').props.stroke.payload;

const macros = {
  protein: { consumed: 75, target: 150 },
  carbs: { consumed: 145, target: 200 },
  fat: { consumed: 36, target: 65 },
};

describe('<DailyMacroSummary />', () => {
  it('shows calories eaten inside the eye ring, the target, what is left and each macro', async () => {
    await render(<DailyMacroSummary targetCalories={2000} consumedCalories={1240} {...macros} />);
    expect(screen.getByText('1,240')).toBeTruthy();
    expect(screen.getByText('of 2,000')).toBeTruthy();
    expect(screen.getByText('760 left')).toBeTruthy();
    expect(screen.getByText('Protein · 75 / 150 g')).toBeTruthy();
    expect(screen.getByText('Fat · 36 / 65 g')).toBeTruthy();
    expect(arcStroke()).toBe(processColor(palette.eye));
  });

  it('over target: says how far over and turns the arc amber', async () => {
    await render(<DailyMacroSummary targetCalories={2000} consumedCalories={2350} {...macros} />);
    expect(screen.getByText('350 over')).toBeTruthy();
    expect(screen.queryByText(/left/)).toBeNull();
    expect(arcStroke()).toBe(processColor(palette.carbs));
  });

  it('a past day says how far under or over the goal it ended', async () => {
    await render(<DailyMacroSummary targetCalories={2000} consumedCalories={1760} {...macros} variant="past" />);
    expect(screen.getByText('240 under goal')).toBeTruthy();
    expect(screen.queryByText(/today/)).toBeNull();
  });
});
