import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface WeightEntry {
  id: string;
  weight_kg: number;
  logged_at: string;
}

interface WeightState {
  entries: WeightEntry[];
  isLoading: boolean;
  loadWeightHistory: () => Promise<void>;
  logWeight: (weightKg: number) => Promise<WeightEntry>;
  deleteWeightEntry: (id: string) => Promise<void>;
}

const WEIGHT_STORAGE_KEY = '@calorie_tracker_weight_history';
const MAX_WEIGHT_ENTRIES = 180; // Rolling 6 months of weigh-ins

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],
  isLoading: false,

  loadWeightHistory: async () => {
    try {
      set({ isLoading: true });
      const raw = await AsyncStorage.getItem(WEIGHT_STORAGE_KEY);
      let list: WeightEntry[] = raw ? JSON.parse(raw) : [];

      // Sort by date ascending for charts
      list.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

      // Bound to rolling cap
      if (list.length > MAX_WEIGHT_ENTRIES) {
        list = list.slice(-MAX_WEIGHT_ENTRIES);
      }

      set({ entries: list });
    } catch (err) {
      console.error('Error loading weight history:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  logWeight: async (weightKg: number) => {
    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      weight_kg: Math.round(weightKg * 10) / 10,
      logged_at: new Date().toISOString(),
    };

    const current = get().entries;
    const updated = [...current, newEntry];
    updated.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

    // Bound entries to prevent unbounded local storage growth
    const bounded = updated.length > MAX_WEIGHT_ENTRIES ? updated.slice(-MAX_WEIGHT_ENTRIES) : updated;

    await AsyncStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(bounded));
    set({ entries: bounded });

    // Also update Supabase profile weight if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ weight_kg: newEntry.weight_kg, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Could not sync weight to remote profile:', err);
    }

    return newEntry;
  },

  deleteWeightEntry: async (id: string) => {
    const filtered = get().entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(filtered));
    set({ entries: filtered });
  },
}));
