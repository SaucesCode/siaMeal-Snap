import { supabase } from '../lib/supabase';
import type { ServerStreak } from '../utils/streaks';

export {
  crossedStreakMilestone,
  mergeLocalStreak,
  STREAK_MILESTONES,
  type ServerStreak,
  type StreakMilestone,
} from '../utils/streaks';

/** Fetches the streak from Postgres (`get_logging_streak`) in the device's time zone. */
export async function fetchLoggingStreak(): Promise<ServerStreak> {
  const { data, error } = await supabase.rpc('get_logging_streak', {
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return { streak: Number(row?.streak) || 0, includesToday: Boolean(row?.includes_today) };
}
