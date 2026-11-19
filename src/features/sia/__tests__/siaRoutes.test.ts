import { isTodayRoute } from '../siaRoutes';

describe('isTodayRoute', () => {
  it('is true for the Today tab, however expo-router names it', () => {
    expect(isTodayRoute(['(tabs)'])).toBe(true);
    expect(isTodayRoute(['(tabs)', 'index'])).toBe(true);
  });

  it('is false for the other tabs and screens', () => {
    expect(isTodayRoute(['(tabs)', 'history'])).toBe(false);
    expect(isTodayRoute(['(tabs)', 'water'])).toBe(false);
    expect(isTodayRoute(['review'])).toBe(false);
    expect(isTodayRoute([])).toBe(false);
  });
});
