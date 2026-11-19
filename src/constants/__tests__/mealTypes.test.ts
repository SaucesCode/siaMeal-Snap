import { MEAL_TYPES, mealTypeLabel } from '../mealTypes';

describe('meal types', () => {
  it('use plain words, in the order of the day', () => {
    expect(MEAL_TYPES.map((m) => m.label)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    expect(MEAL_TYPES.map((m) => m.type)).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });

  it('label a meal type', () => {
    expect(mealTypeLabel('snack')).toBe('Snack');
    expect(mealTypeLabel('breakfast')).toBe('Breakfast');
  });

  it('give every type an icon', () => {
    for (const m of MEAL_TYPES) expect(m.icon).toBeTruthy();
  });
});
