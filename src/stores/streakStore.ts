import { create } from 'zustand';
import { fetchLoggingStreak, mergeLocalStreak } from '../services/streakService';

interface StreakState {
  /** Current logging streak in days; null until first loaded. */
  streak: number | null;
  /**
   * Reloads the streak, counting today if this phone has meals the server hasn't seen yet.
   * Returns the change, or null if it couldn't be loaded.
   */
  refresh: (hasLocalMealsToday: boolean) => Promise<{ prev: number | null; next: number } | null>;
  reset: () => void;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  streak: null,

  refresh: async (hasLocalMealsToday) => {
    try {
      const next = mergeLocalStreak(await fetchLoggingStreak(), hasLocalMealsToday);
      const prev = get().streak;
      set({ streak: next });
      return { prev, next };
    } catch (err) {
      console.warn('Could not load streak:', err instanceof Error ? err.message : err);
      return null;
    }
  },

  reset: () => set({ streak: null }),
}));
