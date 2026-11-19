import { FOODS_TO_AVOID, mealReminderTimes, onboardingSteps, validateGoalWeight, weeksToGoal } from '../flow';

describe('onboardingSteps', () => {
  it('asks for a name only when sign-up did not give one, and goal weight only when changing weight', () => {
    expect(onboardingSteps({ hasName: false, goal: 'fat_loss' })).toEqual([
      'name', 'body', 'activity', 'goal', 'goalWeight', 'diet', 'foods', 'meals', 'plan',
    ]);
    expect(onboardingSteps({ hasName: true, goal: 'maintenance' })).toEqual([
      'body', 'activity', 'goal', 'diet', 'foods', 'meals', 'plan',
    ]);
  });
});

describe('weeksToGoal', () => {
  it('7,700 kcal per kg: 5 kg at -500 kcal a day is about 11 weeks', () => {
    expect(weeksToGoal(75, 70, -500)).toBe(11);
    expect(weeksToGoal(60, 63, 300)).toBe(11);
  });
  it('no estimate when maintaining or when the goal is the wrong way', () => {
    expect(weeksToGoal(75, 70, 0)).toBeNull();
    expect(weeksToGoal(75, 80, -500)).toBeNull();
    expect(weeksToGoal(75, 75, -500)).toBeNull();
  });
});

describe('validateGoalWeight', () => {
  it('needs a realistic weight on the right side of today', () => {
    expect(validateGoalWeight(75, '70', 'fat_loss')).toBeNull();
    expect(validateGoalWeight(75, '', 'fat_loss')).toBe('Enter a weight from 30 to 300 kg.');
    expect(validateGoalWeight(75, '80', 'fat_loss')).toBe('Pick a weight below 75 kg to lose weight.');
    expect(validateGoalWeight(60, '58', 'muscle_gain')).toBe('Pick a weight above 60 kg to gain weight.');
  });
});

describe('mealReminderTimes', () => {
  it('keeps only valid HH:MM times, sorted, at most 6', () => {
    expect(mealReminderTimes(['19:00', '08:00', 'oops', '12:30'])).toEqual(['08:00', '12:30', '19:00']);
  });
});

describe('FOODS_TO_AVOID', () => {
  it('is a short local list', () => {
    expect(FOODS_TO_AVOID).toContain('No pork');
    expect(FOODS_TO_AVOID.length).toBeLessThanOrEqual(10);
  });
});
