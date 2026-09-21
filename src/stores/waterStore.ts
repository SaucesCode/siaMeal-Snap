import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WaterLog {
  id: string;
  amount_ml: number;
  logged_at: string;
}

interface WaterState {
  dailyGoalMl: number;
  logs: WaterLog[];
  todayMl: number;
  isLoading: boolean;
  loadTodayWater: () => Promise<void>;
  addWater: (amountMl: number) => Promise<void>;
  deleteWaterLog: (id: string) => Promise<void>;
  setDailyGoal: (goalMl: number) => Promise<void>;
}

const getTodayDateStr = () => new Date().toISOString().split('T')[0];
const WATER_STORAGE_KEY = '@calorie_tracker_water_logs';
const WATER_GOAL_KEY = '@calorie_tracker_water_goal';
const MAX_RETENTION_DAYS = 30; // Rolling 30-day retention for lightweight AsyncStorage

function pruneOldWaterLogs(logs: WaterLog[]): WaterLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_RETENTION_DAYS);
  const cutoffMs = cutoff.getTime();
  return logs.filter((l) => {
    const time = new Date(l.logged_at).getTime();
    return !isNaN(time) && time >= cutoffMs;
  });
}

export const useWaterStore = create<WaterState>((set, get) => ({
  dailyGoalMl: 2500,
  logs: [],
  todayMl: 0,
  isLoading: false,

  loadTodayWater: async () => {
    try {
      set({ isLoading: true });
      const todayStr = getTodayDateStr();

      // Load saved goal
      const savedGoal = await AsyncStorage.getItem(WATER_GOAL_KEY);
      const dailyGoalMl = savedGoal ? parseInt(savedGoal, 10) : 2500;

      // Load logs
      const rawLogs = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      let allLogs: WaterLog[] = rawLogs ? JSON.parse(rawLogs) : [];

      // Routine pruning if logs exceed retention window
      if (allLogs.length > 150) {
        allLogs = pruneOldWaterLogs(allLogs);
        AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(allLogs)).catch(() => {});
      }

      const todayLogs = allLogs.filter((l) => l.logged_at.startsWith(todayStr));
      const todayMl = todayLogs.reduce((sum, l) => sum + l.amount_ml, 0);

      set({ logs: todayLogs, todayMl, dailyGoalMl });
    } catch (err) {
      console.error('Error loading water data:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  addWater: async (amountMl: number) => {
    try {
      const newLog: WaterLog = {
        id: Date.now().toString(),
        amount_ml: amountMl,
        logged_at: new Date().toISOString(),
      };

      const rawLogs = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      const allLogs: WaterLog[] = rawLogs ? JSON.parse(rawLogs) : [];
      const updatedAllLogs = pruneOldWaterLogs([newLog, ...allLogs]);

      await AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(updatedAllLogs));

      const todayStr = getTodayDateStr();
      const todayLogs = updatedAllLogs.filter((l) => l.logged_at.startsWith(todayStr));
      const todayMl = todayLogs.reduce((sum, l) => sum + l.amount_ml, 0);

      set({ logs: todayLogs, todayMl });
    } catch (err) {
      console.error('Error adding water log:', err);
    }
  },

  deleteWaterLog: async (id: string) => {
    try {
      const rawLogs = await AsyncStorage.getItem(WATER_STORAGE_KEY);
      const allLogs: WaterLog[] = rawLogs ? JSON.parse(rawLogs) : [];
      const filtered = allLogs.filter((l) => l.id !== id);

      await AsyncStorage.setItem(WATER_STORAGE_KEY, JSON.stringify(filtered));

      const todayStr = getTodayDateStr();
      const todayLogs = filtered.filter((l) => l.logged_at.startsWith(todayStr));
      const todayMl = todayLogs.reduce((sum, l) => sum + l.amount_ml, 0);

      set({ logs: todayLogs, todayMl });
    } catch (err) {
      console.error('Error deleting water log:', err);
    }
  },

  setDailyGoal: async (goalMl: number) => {
    try {
      await AsyncStorage.setItem(WATER_GOAL_KEY, goalMl.toString());
      set({ dailyGoalMl: goalMl });
    } catch (err) {
      console.error('Error setting water goal:', err);
    }
  },
}));
