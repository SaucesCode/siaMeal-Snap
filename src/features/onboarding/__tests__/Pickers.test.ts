import { slotsFromTimes } from '../Pickers';

describe('slotsFromTimes', () => {
  it('fills breakfast, lunch and dinner from saved times, earliest first', () => {
    expect(slotsFromTimes(['19:30', '07:30'])).toEqual([
      { label: 'Breakfast', time: '07:30', on: true },
      { label: 'Lunch', time: '19:30', on: true },
      { label: 'Dinner', time: '19:00', on: false },
    ]);
  });
  it('nothing saved: usual times, on for onboarding and off for Me', () => {
    expect(slotsFromTimes([]).every((s) => s.on)).toBe(true);
    expect(slotsFromTimes(undefined, false).every((s) => !s.on)).toBe(true);
  });
});
