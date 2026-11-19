import { dayLabel, waterStatus, weekLine } from '../historyText';

describe('dayLabel', () => {
  const today = new Date(2026, 10, 19); // Thu 19 Nov 2026
  it('says Today and Yesterday, otherwise the short date', () => {
    expect(dayLabel('2026-11-19', today)).toBe('Today');
    expect(dayLabel('2026-11-18', today)).toBe('Yesterday');
    expect(dayLabel('2026-11-16', today)).toBe('Mon, Nov 16');
  });
});

describe('weekLine', () => {
  it('days logged and the daily average, or a plain empty message', () => {
    expect(weekLine({ daysLogged: 5, avgCalories: 1843.6 })).toBe('5 of 7 days logged · 1,844 kcal a day');
    expect(weekLine({ daysLogged: 1, avgCalories: 900 })).toBe('1 of 7 days logged · 900 kcal a day');
    expect(weekLine({ daysLogged: 0, avgCalories: 0 })).toBe('No meals logged this week yet.');
    expect(weekLine(null)).toBe('No meals logged this week yet.');
  });
});

describe('waterStatus', () => {
  it('litres to go, or goal reached', () => {
    expect(waterStatus(1250, 2500)).toBe('1.3 L to go');
    expect(waterStatus(2600, 2500)).toBe('Goal reached!');
    expect(waterStatus(0, 0)).toBe('');
  });
});
