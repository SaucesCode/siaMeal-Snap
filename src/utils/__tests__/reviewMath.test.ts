import { mealFit, scaleMacros } from '../reviewMath';

const adobo = { calories: 680, protein_g: 42, carbs_g: 72, fat_g: 22 };

describe('scaleMacros', () => {
  it('scales every number and rounds to whole units', () => {
    expect(scaleMacros(adobo, 1)).toEqual(adobo);
    expect(scaleMacros(adobo, 2)).toEqual({ calories: 1360, protein_g: 84, carbs_g: 144, fat_g: 44 });
    expect(scaleMacros({ calories: 75, protein_g: 5, carbs_g: 3, fat_g: 1 }, 0.5)).toEqual({ calories: 38, protein_g: 3, carbs_g: 2, fat_g: 1 });
    expect(scaleMacros(adobo, 1.5).calories).toBe(1020);
  });
});

describe('mealFit', () => {
  it('under target: shows what was eaten before, the meal on top, and what is left after', () => {
    const fit = mealFit(560, 33, adobo, 2000, 150);
    expect(fit.beforeFraction).toBeCloseTo(0.28);
    expect(fit.afterFraction).toBeCloseTo(0.62);
    expect(fit.left).toBe(760);
    expect(fit.over).toBe(0);
    expect(fit.expression).toBe('happy');
  });

  it('going over: says how far over after, caps the ring, and Sia is concerned', () => {
    const fit = mealFit(1800, 60, adobo, 2000, 150);
    expect(fit.over).toBe(480);
    expect(fit.left).toBe(0);
    expect(fit.afterFraction).toBe(1);
    expect(fit.expression).toBe('concerned');
  });

  it('reaching the protein goal with this meal: celebrating', () => {
    const fit = mealFit(900, 110, adobo, 2000, 150);
    expect(fit.reachesProteinGoal).toBe(true);
    expect(fit.expression).toBe('celebrating');
  });

  it('protein goal already reached earlier today is not celebrated again', () => {
    expect(mealFit(900, 160, adobo, 2000, 150).reachesProteinGoal).toBe(false);
  });

  it('no target set: empty ring, nothing left or over', () => {
    expect(mealFit(500, 20, adobo, 0, 0)).toMatchObject({ beforeFraction: 0, afterFraction: 0, left: 0, over: 0, expression: 'happy' });
  });
});
