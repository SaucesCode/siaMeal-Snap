import { calorieSummary, greetingName, macroProgress, siaStatusLine } from '../todaySummary';

describe('calorieSummary', () => {
  it('reports eaten, target and what is left, rounded', () => {
    expect(calorieSummary(1240.6, 2000)).toEqual({ eaten: 1241, target: 2000, left: 759, over: 0, fraction: 1240.6 / 2000 });
  });

  it('reports how far over the target instead of a negative "left", and caps the bar at full', () => {
    const s = calorieSummary(2350, 2000);
    expect(s.left).toBe(0);
    expect(s.over).toBe(350);
    expect(s.fraction).toBe(1);
  });

  it('treats a missing or zero target as nothing to fill (no division by zero)', () => {
    expect(calorieSummary(500, 0)).toEqual({ eaten: 500, target: 0, left: 0, over: 0, fraction: 0 });
  });

  it('ignores non-numeric or negative input', () => {
    expect(calorieSummary(Number.NaN, 2000).eaten).toBe(0);
    expect(calorieSummary(-50, 2000).eaten).toBe(0);
  });
});

describe('macroProgress', () => {
  it('rounds grams and caps the bar fraction at 1', () => {
    expect(macroProgress(88.4, 150)).toEqual({ eaten: 88, target: 150, fraction: 88.4 / 150 });
    expect(macroProgress(200, 150).fraction).toBe(1);
    expect(macroProgress(10, 0).fraction).toBe(0);
  });
});

describe('greetingName', () => {
  it('uses the first word of the full name', () => {
    expect(greetingName('James Patrick De Mesa', 'x@y.com')).toBe('James');
  });

  it('falls back to the email name, then to "there" — never "Athlete"', () => {
    expect(greetingName('   ', 'sauces@example.com')).toBe('sauces');
    expect(greetingName(null, undefined)).toBe('there');
  });
});

describe('siaStatusLine', () => {
  it('nothing eaten yet: the whole target to go', () => {
    expect(siaStatusLine(calorieSummary(0, 2000))).toBe("2,000 to go — let's start.");
  });

  it('plenty left vs. nearly there', () => {
    expect(siaStatusLine(calorieSummary(1240, 2000))).toBe('760 left — plenty of room.');
    expect(siaStatusLine(calorieSummary(1880, 2000))).toBe('120 left — almost there.');
  });

  it('over target: gentle, never scolding', () => {
    expect(siaStatusLine(calorieSummary(2350, 2000))).toBe("350 over today. That's okay.");
  });

  it('no target set: nothing to say', () => {
    expect(siaStatusLine(calorieSummary(500, 0))).toBe('');
  });
});
