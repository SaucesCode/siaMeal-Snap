import type { SiaExpression } from '../../components/sia';
import type { UserNutritionContext } from '../../services/aiService';
import { crossedStreakMilestone } from '../../utils/streaks';
import {
  mealLoggedLine,
  morningLine,
  overBudgetLine,
  proteinGoalLine,
  streakLine,
  waterGoalLine,
} from './siaLines';

export type SiaEvent =
  | { type: 'mealLogged'; mealName: string; ctx: UserNutritionContext }
  | { type: 'waterGoalReached' }
  | { type: 'streakChanged'; prev: number; next: number }
  | { type: 'appOpened'; now: Date; hasMealsToday: boolean };

export interface SiaReaction {
  expression: SiaExpression;
  /** What Sia says in her bubble, or null for an expression without a line. */
  line: string | null;
  /** Shown at most once per key: `<rule>:<YYYY-MM-DD>` for daily rules, `streak:<n>` for milestones. */
  onceKey?: string;
}

const MAX_REACTIONS_PER_EVENT = 2;
const MORNING_END_HOUR = 10;
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;

/**
 * Turns an app event into Sia's reactions, highest priority first (concerned, then
 * celebrating, then happy), at most two. `done` holds onceKeys already shown; `today` is the
 * local YYYY-MM-DD, so daily rules naturally reset at local midnight.
 */
export function reactionsFor(event: SiaEvent, done: ReadonlySet<string>, today: string): SiaReaction[] {
  const once = (rule: string) => `${rule}:${today}`;
  const fresh = (key: string) => !done.has(key);

  switch (event.type) {
    case 'mealLogged': {
      const { ctx } = event;
      const reactions: SiaReaction[] = [];
      const overKey = once('overBudget');
      if ((ctx.consumedCalories ?? 0) > (ctx.targetCalories ?? Infinity) && fresh(overKey)) {
        reactions.push({ expression: 'concerned', line: overBudgetLine(), onceKey: overKey });
      }
      const proteinKey = once('proteinGoal');
      if (ctx.targetProtein && (ctx.consumedProtein ?? 0) >= ctx.targetProtein && fresh(proteinKey)) {
        reactions.push({ expression: 'celebrating', line: proteinGoalLine(ctx.targetProtein), onceKey: proteinKey });
      }
      reactions.push({ expression: 'happy', line: mealLoggedLine(event.mealName, ctx) });
      return reactions.slice(0, MAX_REACTIONS_PER_EVENT);
    }

    case 'streakChanged': {
      const milestone = crossedStreakMilestone(event.prev, event.next);
      if (!milestone) return [];
      const key = `streak:${milestone}`;
      return fresh(key) ? [{ expression: 'celebrating', line: streakLine(milestone), onceKey: key }] : [];
    }

    case 'appOpened': {
      const hour = event.now.getHours();
      if (hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR) {
        return [{ expression: 'sleepy', line: null }];
      }
      const key = once('morning');
      if (hour < MORNING_END_HOUR && !event.hasMealsToday && fresh(key)) {
        return [{ expression: 'sleepy', line: morningLine(), onceKey: key }];
      }
      return [];
    }

    case 'waterGoalReached': {
      const key = once('water');
      return fresh(key) ? [{ expression: 'happy', line: waterGoalLine(), onceKey: key }] : [];
    }
  }
}
