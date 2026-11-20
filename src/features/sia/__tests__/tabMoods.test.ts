import { dayMood, daySpot, meLine, nextSpot, stripSiaX, waterMood } from '../tabMoods';

describe('dayMood', () => {
  it('a past day with nothing logged is sleepy', () => {
    expect(dayMood(0, 2000, 'past')).toEqual({ expression: 'sleepy', label: 'Nothing logged this day' });
  });

  it('today is still in progress, and a future day has not happened', () => {
    expect(dayMood(500, 2000, 'today')).toEqual({ expression: 'resting', label: 'Today is still going' });
    expect(dayMood(0, 2000, 'future')).toEqual({ expression: 'resting', label: 'Not here yet' });
  });

  it('within 10 % of the target is happy, inclusive at both ends', () => {
    expect(dayMood(1900, 2000, 'past')).toEqual({ expression: 'happy', label: 'Right on target' });
    expect(dayMood(2200, 2000, 'past')).toEqual({ expression: 'happy', label: 'Right on target' });
  });

  it('well under is a light day; well over is concerned', () => {
    expect(dayMood(1500, 2000, 'past')).toEqual({ expression: 'resting', label: 'A light day' });
    expect(dayMood(2300, 2000, 'past')).toEqual({ expression: 'concerned', label: 'Over target' });
  });

  it('without a target it just reports the calories', () => {
    expect(dayMood(1200, 0, 'past')).toEqual({ expression: 'resting', label: '1200 kcal logged' });
  });
});

describe('waterMood', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 20, h, m);

  it('celebrates the goal', () => {
    expect(waterMood(2500, 2500, at(15))).toEqual({ expression: 'celebrating', label: 'Water goal reached' });
  });

  it('is sleepy before 9 with nothing yet, and waits before 7 once something is logged', () => {
    expect(waterMood(0, 2500, at(8))).toEqual({ expression: 'sleepy', label: 'Morning, nothing yet' });
    expect(waterMood(0, 2500, at(6))).toEqual({ expression: 'sleepy', label: 'Morning, nothing yet' });
    expect(waterMood(200, 2500, at(6))).toEqual({ expression: 'resting', label: 'Ready when you are' });
  });

  it('compares with the pace spread from 07:00 to 22:00', () => {
    expect(waterMood(1300, 2500, at(14, 30))).toEqual({ expression: 'happy', label: 'On pace' });
    expect(waterMood(700, 2500, at(14, 30))).toEqual({ expression: 'resting', label: 'A little behind' });
    expect(waterMood(300, 2500, at(14, 30))).toEqual({ expression: 'concerned', label: 'Thirsty — a glass would help' });
  });

  it('is never thirsty before 10:00', () => {
    expect(waterMood(200, 2500, at(9, 30))).toEqual({ expression: 'resting', label: 'A little behind' });
  });

  it('clamps the pace to the target late at night', () => {
    // 2100 / 2500 = 0.84 (happy) with the clamp; 2100 / 2667 = 0.79 (behind) without it.
    expect(waterMood(2100, 2500, at(23))).toEqual({ expression: 'happy', label: 'On pace' });
  });

  it('without a goal it waits', () => {
    expect(waterMood(500, 0, at(12))).toEqual({ expression: 'resting', label: 'Ready when you are' });
  });
});

describe('meLine', () => {
  it('leads with the distance to the goal weight', () => {
    expect(meLine({ weightKg: 77.1, targetWeightKg: 75 })).toBe('2.1 kg to your goal weight');
    expect(meLine({ weightKg: 77, targetWeightKg: 75, streak: 12 })).toBe('2.0 kg to your goal weight');
  });

  it('celebrates a reached goal weight', () => {
    expect(meLine({ weightKg: 75.04, targetWeightKg: 75 })).toBe("You've reached your goal weight");
  });

  it('falls back to the streak, then an invitation', () => {
    expect(meLine({ streak: 12 })).toBe('12 days in a row');
    expect(meLine({ streak: 1 })).toBe("Snap a meal and I'll start counting.");
  });
});

describe('stripSiaX', () => {
  const cell = (343 - 24) / 7;

  it('centres her over the day, clamped to the strip', () => {
    expect(stripSiaX(0, 343, 56)).toBe(0);
    expect(stripSiaX(6, 343, 56)).toBe(343 - 56);
    expect(stripSiaX(3, 343, 56)).toBe(Math.round(3 * (cell + 4) + cell / 2 - 28));
  });

  it('recomputes for a new width and is 0 before the strip is measured', () => {
    expect(stripSiaX(3, 600, 56)).toBeGreaterThan(stripSiaX(3, 343, 56));
    expect(stripSiaX(2, 0, 56)).toBe(0);
  });
});

describe('daySpot', () => {
  it('follows where the day sits in the week strip', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(daySpot)).toEqual(['left', 'left', 'center', 'center', 'center', 'right', 'right']);
    expect(daySpot(-1)).toBe('center');
  });
});

describe('nextSpot', () => {
  it('cycles left, centre, right', () => {
    expect(nextSpot('left')).toBe('center');
    expect(nextSpot('center')).toBe('right');
    expect(nextSpot('right')).toBe('left');
  });
});
