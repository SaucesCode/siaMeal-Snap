import { supabase } from '../lib/supabase';

/** Streak lengths Sia celebrates. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export interface ServerStreak {
  /** Consecutive local days with a logged meal, ending today or yesterday. */
  streak: number;
  /** Whether the server already counted a meal for today. */
  includesToday: boolean;
}

/** Fetches the streak from Postgres (`get_logging_streak`) in the device's time zone. */
export async function fetchLoggingStreak(): Promise<ServerStreak> {
  const { data, error } = await supabase.rpc('get_logging_streak', {
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return { streak: Number(row?.streak) || 0, includesToday: Boolean(row?.includes_today) };
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
