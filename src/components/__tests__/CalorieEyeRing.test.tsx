import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CalorieEyeRing } from '../CalorieEyeRing';

describe('<CalorieEyeRing />', () => {
  it("Today: shows calories eaten and the target, with no 'before' arc", async () => {
    await render(<CalorieEyeRing eaten={1240} target={2000} fraction={0.62} over={false} />);
    expect(screen.getByText('1,240')).toBeTruthy();
    expect(screen.getByText('of 2,000')).toBeTruthy();
    expect(screen.queryByTestId('calorie-eye-base')).toBeNull();
  });

  it('Review: draws what was eaten before as a muted arc under this meal, with custom centre text', async () => {
    await render(
      <CalorieEyeRing eaten={680} target={2000} fraction={0.62} baseFraction={0.28} over={false} centerLabel="+680" centerCaption="kcal" />
    );
    expect(screen.getByTestId('calorie-eye-base')).toBeTruthy();
    expect(screen.getByText('+680')).toBeTruthy();
    expect(screen.getByText('kcal')).toBeTruthy();
    expect(screen.queryByText('of 2,000')).toBeNull();
  });
});
