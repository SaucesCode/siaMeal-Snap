import { supabase } from '../../lib/supabase';
import {
  crossedStreakMilestone,
  fetchLoggingStreak,
  mergeLocalStreak,
  STREAK_MILESTONES,
} from '../streakService';

jest.mock('../../lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const rpc = supabase.rpc as jest.Mock;

describe('mergeLocalStreak', () => {
  it('adds today when the server has not seen today but the phone has (offline log)', () => {
    expect(mergeLocalStreak({ streak: 4, includesToday: false }, true)).toBe(5);
  });

  it('does not double-count today when the server already includes it', () => {
    expect(mergeLocalStreak({ streak: 4, includesToday: true }, true)).toBe(4);
  });

  it('keeps the server streak when nothing is logged today anywhere', () => {
    expect(mergeLocalStreak({ streak: 4, includesToday: false }, false)).toBe(4);
  });

  it('starts a new streak at 1 from an offline meal today', () => {
    expect(mergeLocalStreak({ streak: 0, includesToday: false }, true)).toBe(1);
  });
});

describe('crossedStreakMilestone', () => {
  it('is 7 when the streak reaches 7', () => {
    expect(crossedStreakMilestone(6, 7)).toBe(7);
  });

  it('is null when no milestone is crossed', () => {
    expect(crossedStreakMilestone(7, 8)).toBeNull();
    expect(crossedStreakMilestone(5, 5)).toBeNull();
  });

  it('reports a milestone that was jumped over', () => {
    expect(crossedStreakMilestone(13, 15)).toBe(14);
  });

  it('never fires when the streak goes down', () => {
    expect(crossedStreakMilestone(30, 0)).toBeNull();
  });

  it('uses the milestones from the spec', () => {
    expect(STREAK_MILESTONES).toEqual([7, 14, 30, 60, 100]);
  });
});

describe('fetchLoggingStreak', () => {
  beforeEach(() => rpc.mockReset());

  it("asks the database for the streak in the device's time zone", async () => {
    rpc.mockResolvedValue({ data: [{ streak: 12, includes_today: true }], error: null });
    await expect(fetchLoggingStreak()).resolves.toEqual({ streak: 12, includesToday: true });
    expect(rpc).toHaveBeenCalledWith('get_logging_streak', {
      p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  });

  it('throws when the database call fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(fetchLoggingStreak()).rejects.toThrow('boom');
  });
});
