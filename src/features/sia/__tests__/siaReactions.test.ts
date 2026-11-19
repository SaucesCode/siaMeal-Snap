import type { UserNutritionContext } from '../../../services/aiService';
import { MAX_LINE } from '../siaLines';
import { reactionsFor, type SiaEvent } from '../siaReactions';

const TODAY = '2026-11-18';
const NONE: ReadonlySet<string> = new Set();

function ctx(overrides: Partial<UserNutritionContext> = {}): UserNutritionContext {
  return {
    targetCalories: 2000,
    targetProtein: 150,
    consumedCalories: 1240,
    consumedProtein: 88,
    remainingCalories: 760,
    remainingProtein: 62,
    ...overrides,
  };
}
const meal = (mealName: string, c: Partial<UserNutritionContext> = {}): SiaEvent => ({
  type: 'mealLogged',
  mealName,
  ctx: ctx(c),
});
const at = (hhmm: string) => new Date(`${TODAY}T${hhmm}:00`);

describe('reactionsFor: meal logged', () => {
  it('under target: a happy line with the protein still to go', () => {
    expect(reactionsFor(meal('Adobo'), NONE, TODAY)).toEqual([
      { expression: 'happy', line: 'Adobo logged. 62 g protein to go.', spot: 'left' },
    ]);
  });

  it('once protein is covered: says calories left instead', () => {
    const [reaction] = reactionsFor(
      meal('Tuna', { consumedProtein: 160, remainingProtein: 0 }),
      new Set([`proteinGoal:${TODAY}`]),
      TODAY
    );
    expect(reaction).toEqual({ expression: 'happy', line: 'Tuna logged. 760 kcal left today.', spot: 'left' });
  });

  it('crossing the protein target the first time today: celebrates, then the meal line', () => {
    const reactions = reactionsFor(meal('Steak', { consumedProtein: 152, remainingProtein: 0 }), NONE, TODAY);
    expect(reactions[0]).toEqual({
      expression: 'celebrating',
      line: '150 g protein! Purr-fect day.',
      onceKey: `proteinGoal:${TODAY}`,
      spot: 'right',
    });
    expect(reactions[1].expression).toBe('happy');
  });

  it('protein goal already celebrated today: only the meal line', () => {
    const reactions = reactionsFor(
      meal('Eggs', { consumedProtein: 170, remainingProtein: 0 }),
      new Set([`proteinGoal:${TODAY}`]),
      TODAY
    );
    expect(reactions.map((r) => r.expression)).toEqual(['happy']);
  });

  it('going over calories the first time today: concerned first, gently', () => {
    const reactions = reactionsFor(
      meal('Pizza', { consumedCalories: 2300, remainingCalories: 0 }),
      NONE,
      TODAY
    );
    expect(reactions[0]).toEqual({
      expression: 'concerned',
      line: "A bit over today. Tomorrow's a fresh start.",
      onceKey: `overBudget:${TODAY}`,
      spot: 'left',
    });
  });

  it('over calories AND hitting protein: shows both, concerned then celebrating (max 2)', () => {
    const reactions = reactionsFor(
      meal('Feast', { consumedCalories: 2300, remainingCalories: 0, consumedProtein: 155, remainingProtein: 0 }),
      NONE,
      TODAY
    );
    expect(reactions.map((r) => r.expression)).toEqual(['concerned', 'celebrating']);
  });

  it('midnight rollover: yesterday\'s once-per-day reactions fire again today', () => {
    const reactions = reactionsFor(
      meal('Pizza', { consumedCalories: 2300, remainingCalories: 0 }),
      new Set(['overBudget:2026-11-17']),
      TODAY
    );
    expect(reactions[0].expression).toBe('concerned');
  });

  it('very long meal names never push a line past the limit', () => {
    const name = 'Grilled chicken breast with garlic butter rice, steamed broccoli and a side of '.repeat(2);
    for (const r of reactionsFor(meal(name), NONE, TODAY)) {
      expect(r.line?.length ?? 0).toBeLessThanOrEqual(MAX_LINE);
    }
    expect(reactionsFor(meal(name), NONE, TODAY)[0].line).toMatch(/… logged\. 62 g protein to go\.$/);
  });
});

describe('reactionsFor: other events', () => {
  it('streak milestone: celebrates once per milestone', () => {
    expect(reactionsFor({ type: 'streakChanged', prev: 6, next: 7 }, NONE, TODAY)).toEqual([
      { expression: 'celebrating', line: '7 days in a row!', onceKey: 'streak:7', spot: 'center' },
    ]);
    expect(reactionsFor({ type: 'streakChanged', prev: 6, next: 7 }, new Set(['streak:7']), TODAY)).toEqual([]);
    expect(reactionsFor({ type: 'streakChanged', prev: 7, next: 8 }, NONE, TODAY)).toEqual([]);
  });

  it('morning with nothing logged: sleepy nudge once per day', () => {
    const opened: SiaEvent = { type: 'appOpened', now: at('08:30'), hasMealsToday: false };
    expect(reactionsFor(opened, NONE, TODAY)).toEqual([
      { expression: 'sleepy', line: 'Morning! Breakfast first?', onceKey: `morning:${TODAY}`, spot: 'center' },
    ]);
    expect(reactionsFor(opened, new Set([`morning:${TODAY}`]), TODAY)).toEqual([]);
  });

  it('late at night: sleepy without a line', () => {
    expect(reactionsFor({ type: 'appOpened', now: at('23:15'), hasMealsToday: true }, NONE, TODAY)).toEqual([
      { expression: 'sleepy', line: null, spot: 'center' },
    ]);
    expect(reactionsFor({ type: 'appOpened', now: at('04:30'), hasMealsToday: false }, NONE, TODAY)[0].line).toBeNull();
  });

  it('afternoon open: nothing to say', () => {
    expect(reactionsFor({ type: 'appOpened', now: at('14:00'), hasMealsToday: false }, NONE, TODAY)).toEqual([]);
  });

  it('water goal reached: happy, once per day', () => {
    expect(reactionsFor({ type: 'waterGoalReached' }, NONE, TODAY)).toEqual([
      { expression: 'happy', line: 'Water goal done.', onceKey: `water:${TODAY}`, spot: 'center' },
    ]);
    expect(reactionsFor({ type: 'waterGoalReached' }, new Set([`water:${TODAY}`]), TODAY)).toEqual([]);
  });
});
