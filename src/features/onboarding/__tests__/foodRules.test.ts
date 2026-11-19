import { avoidsFood } from '../foodRules';
import { reminderSchedule } from '../reminders';

describe('avoidsFood', () => {
  it('matches common local and English names', () => {
    expect(avoidsFood('Pork sisig with rice', ['No pork'])).toBe(true);
    expect(avoidsFood('Lechon kawali', ['No pork'])).toBe(true);
    expect(avoidsFood('Lean Beef Sirloin & Roasted Sweet Potato', ['No beef'])).toBe(true);
    expect(avoidsFood('Greek Yogurt Parfait', ['No dairy'])).toBe(true);
    expect(avoidsFood('Grilled Chicken & Quinoa Bowl', ['Vegetarian'])).toBe(true);
    expect(avoidsFood('Boiled eggs & edamame', ['Vegan'])).toBe(true);
    expect(avoidsFood('Seared Ahi Tuna Bowl', ['No seafood'])).toBe(true);
    expect(avoidsFood('Whipped Cottage Cheese & Almond Crunch', ['Nut allergy'])).toBe(true);
  });

  it('leaves everything else alone', () => {
    expect(avoidsFood('Grilled Chicken & Quinoa Bowl', ['No pork', 'No beef'])).toBe(false);
    expect(avoidsFood('Turkey Bolognese', ['No beef'])).toBe(false);
    expect(avoidsFood('Anything', [])).toBe(false);
  });
});

describe('reminderSchedule', () => {
  it('names each reminder after the meal it is near, in plain words', () => {
    expect(reminderSchedule(['08:00', '12:30', '19:00'])).toEqual([
      { hour: 8, minute: 0, title: 'Breakfast time', body: 'Snap your plate and Sia will count it.' },
      { hour: 12, minute: 30, title: 'Lunch time', body: 'Snap your plate and Sia will count it.' },
      { hour: 19, minute: 0, title: 'Dinner time', body: 'Snap your plate and Sia will count it.' },
    ]);
    expect(reminderSchedule([])).toEqual([]);
  });
});
