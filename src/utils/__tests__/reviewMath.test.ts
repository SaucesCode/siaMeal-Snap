import { itemsMeal, mealFit, scaleMacros, siaTake } from '../reviewMath';
import type { MealItem } from '../../types';

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

const items: MealItem[] = [
  { name: 'Chicken thigh', amount: '2 pcs', calories: 320, protein_g: 30, carbs_g: 0, fat_g: 21 },
  { name: 'White rice', amount: '1 cup', calories: 260, protein_g: 5, carbs_g: 57, fat_g: 1 },
  { name: 'Adobo sauce', amount: '3 tbsp', calories: 100, protein_g: 7, carbs_g: 15, fat_g: 0 },
];

describe('itemsMeal', () => {
  it("every item at 1x is the AI's own total", () => {
    expect(itemsMeal(adobo, items, [1, 1, 1])).toEqual(adobo);
  });

  it("half the rice shrinks the meal by the rice's share of the calories", () => {
    // 680 - 130 = 550 kcal, so everything scales by 550 / 680
    expect(itemsMeal(adobo, items, [1, 0.5, 1])).toEqual(scaleMacros(adobo, 550 / 680));
  });

  it('removing every item leaves nothing', () => {
    expect(itemsMeal(adobo, items, [0, 0, 0])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });

  it("items with no calories can't be proportioned, so the AI's total stands", () => {
    expect(itemsMeal(adobo, items.map((i) => ({ ...i, calories: 0 })), [0.5, 1, 1])).toEqual(adobo);
  });
});

describe('siaTake', () => {
  const take = (todayKcal: number, todayProtein: number, meal = adobo) => siaTake(mealFit(todayKcal, todayProtein, meal, 2000, 150), meal);

  it('high-protein meal under budget', () => {
    expect(take(560, 33, { calories: 400, protein_g: 40, carbs_g: 20, fat_g: 15 })).toBe('Great protein pick! 1,040 left after this.');
  });
  it('reaching the protein goal', () => {
    expect(take(900, 110)).toBe('Protein goal done with this one!');
  });
  it('going over, gently', () => {
    expect(take(1800, 60)).toBe("This puts you 480 over. That's okay.");
  });
  it('an ordinary meal', () => {
    expect(take(560, 33)).toBe('760 left after this.');
  });
  it('always fits on one line', () => {
    for (const t of [take(560, 33), take(900, 110), take(1800, 60), take(0, 0, { calories: 300, protein_g: 40, carbs_g: 0, fat_g: 5 })]) {
      expect(t.length).toBeLessThanOrEqual(60);
    }
  });
});
