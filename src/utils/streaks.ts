// Pure streak math, shared by the streak service and Sia's reaction rules.

/** Streak lengths Sia celebrates. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export interface ServerStreak {
  /** Consecutive local days with a logged meal, ending today or yesterday. */
  streak: number;
  /** Whether the server already counted a meal for today. */
  includesToday: boolean;
}

/**
 * Today counts as soon as a meal is logged on this phone, even before it syncs: the server's
 * streak ends yesterday in that case, so today extends it by one.
 */
export function mergeLocalStreak(server: ServerStreak, hasLocalMealsToday: boolean): number {
  return !server.includesToday && hasLocalMealsToday ? server.streak + 1 : server.streak;
}

/** The highest milestone reached by going from `prev` to `next` days, or null. */
export function crossedStreakMilestone(prev: number, next: number): StreakMilestone | null {
  const crossed = STREAK_MILESTONES.filter((m) => prev < m && m <= next);
  return crossed.length > 0 ? crossed[crossed.length - 1] : null;
}
