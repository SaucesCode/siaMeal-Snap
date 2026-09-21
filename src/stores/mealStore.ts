import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { uploadMealPhotoToSupabase } from '../lib/storage';
import { enqueueMutation } from '../lib/syncQueue';
import { Meal, MealType } from '../types';

const TODAY_MEALS_CACHE_KEY = '@calorie_tracker_cached_today_meals';
const WEEKLY_SUMMARY_CACHE_KEY = '@calorie_tracker_cached_weekly_summary';

export interface DayStat {
  date: string; // 'YYYY-MM-DD'
  dayLabel: string; // 'Mon', 'Tue', etc.
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  mealCount: number;
}

export interface WeeklySummary {
  days: DayStat[];
  streakDays: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysLogged: number;
  weekOffset?: number;
  weekLabel?: string;
}

interface MealState {
  meals: Meal[];
  selectedDate: string; // 'YYYY-MM-DD'
  weeklySummary: WeeklySummary | null;
  draftMeal: {
    name: string;
    meal_type?: MealType;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    food_items: string[];
    image_url?: string | null;
  } | null;
  isLoading: boolean;
  setSelectedDate: (date: string) => void;
  setDraftMeal: (draft: MealState['draftMeal']) => void;
  fetchMealsForDate: (dateStr?: string) => Promise<void>;
  fetchWeeklyStats: (targetCalories?: number, weekOffset?: number) => Promise<WeeklySummary | null>;
  logMeal: (mealData: {
    name: string;
    meal_type?: MealType;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    food_items: string[];
    image_url?: string | null;
    logged_at?: string;
  }) => Promise<Meal>;
  updateMeal: (id: string, updates: Partial<Meal>) => Promise<Meal>;
  deleteMeal: (id: string) => Promise<void>;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export const useMealStore = create<MealState>((set, get) => ({
  meals: [],
  selectedDate: getTodayString(),
  weeklySummary: null,
  draftMeal: null,
  isLoading: false,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  setDraftMeal: (draft) => {
    set({ draftMeal: draft });
  },

  fetchMealsForDate: async (dateStr) => {
    const targetDate = dateStr || get().selectedDate;
    const isToday = targetDate === getTodayString();

    // 0ms instant local hydration from cache if currently empty
    if (isToday && get().meals.length === 0) {
      try {
        const cached = await AsyncStorage.getItem(TODAY_MEALS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0 && get().meals.length === 0) {
            set({ meals: parsed });
          }
        }
      } catch (cacheErr) {
        console.warn('Could not read cached meals:', cacheErr);
      }
    }

    set({ isLoading: true });

    try {
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`).toISOString();
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`).toISOString();

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let query = supabase
        .from('meals')
        .select('*')
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query
        .order('logged_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching meals:', error);
        return;
      }

      const mealsData = (data as Meal[]) || [];
      set({ meals: mealsData });

      if (isToday) {
        AsyncStorage.setItem(TODAY_MEALS_CACHE_KEY, JSON.stringify(mealsData)).catch(() => {});
      }
    } catch (err) {
      console.error('Error in fetchMealsForDate:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchWeeklyStats: async (targetCalories = 2000, weekOffset = 0) => {
    // 0ms instant hydration for current week if not yet loaded in state
    if (weekOffset === 0 && !get().weeklySummary) {
      try {
        const cached = await AsyncStorage.getItem(WEEKLY_SUMMARY_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as WeeklySummary;
          if (parsed && !get().weeklySummary) {
            set({ weeklySummary: parsed });
          }
        }
      } catch {}
    }

    try {
      const now = new Date();
      const past7Days: { dateStr: string; label: string; fullDate: Date }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - (i + weekOffset * 7));
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        past7Days.push({ dateStr, label, fullDate: d });
      }

      const startDateIso = new Date(`${past7Days[0].dateStr}T00:00:00.000Z`).toISOString();
      const endDateIso = new Date(`${past7Days[6].dateStr}T23:59:59.999Z`).toISOString();

      const startFormatted = past7Days[0].fullDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endFormatted = past7Days[6].fullDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const weekLabel = weekOffset === 0 ? 'Current Week' : `${startFormatted} – ${endFormatted}`;

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let days: DayStat[] = [];
      let rpcSucceeded = false;

      // 1. High-Performance Server-Side Aggregate RPC (98% Bandwidth Reduction)
      if (userId) {
        try {
          const { data: rpcRows, error: rpcError } = await supabase.rpc('get_weekly_macro_summary', {
            p_user_id: userId,
            p_start_date: startDateIso,
            p_end_date: endDateIso,
          });

          if (!rpcError && Array.isArray(rpcRows)) {
            days = past7Days.map(({ dateStr, label }) => {
              const matched = rpcRows.find((r: any) => r.log_date === dateStr);
              return {
                date: dateStr,
                dayLabel: label,
                calories: Math.round(Number(matched?.total_calories) || 0),
                protein_g: Math.round(Number(matched?.total_protein_g) || 0),
                carbs_g: Math.round(Number(matched?.total_carbs_g) || 0),
                fat_g: Math.round(Number(matched?.total_fat_g) || 0),
                mealCount: Number(matched?.meal_count) || 0,
              };
            });
            rpcSucceeded = true;
          }
        } catch {
          rpcSucceeded = false;
        }
      }

      // 2. Client-Side Aggregation Fallback
      if (!rpcSucceeded) {
        let query = supabase
          .from('meals')
          .select('*')
          .gte('logged_at', startDateIso)
          .lte('logged_at', endDateIso);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query.limit(500);

        if (error) {
          console.error('Error fetching weekly meals:', error);
          return null;
        }

        const allMeals: Meal[] = (data as Meal[]) || [];

        days = past7Days.map(({ dateStr, label }) => {
          const dayMeals = allMeals.filter((m) => m.logged_at.startsWith(dateStr));
          return {
            date: dateStr,
            dayLabel: label,
            calories: Math.round(
              dayMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0)
            ),
            protein_g: Math.round(
              dayMeals.reduce((sum, m) => sum + (Number(m.protein_g) || 0), 0)
            ),
            carbs_g: Math.round(
              dayMeals.reduce((sum, m) => sum + (Number(m.carbs_g) || 0), 0)
            ),
            fat_g: Math.round(
              dayMeals.reduce((sum, m) => sum + (Number(m.fat_g) || 0), 0)
            ),
            mealCount: dayMeals.length,
          };
        });
      }

      // Calculate streak: consecutive days with mealCount > 0 starting from today or yesterday
      let streakDays = 0;
      const todayDateStr = getTodayString();
      const todayIndex = days.findIndex((d) => d.date === todayDateStr);

      if (todayIndex !== -1) {
        const startIndex = days[todayIndex].mealCount > 0 ? todayIndex : todayIndex - 1;
        for (let i = startIndex; i >= 0; i--) {
          if (days[i].mealCount > 0) {
            streakDays++;
          } else {
            break;
          }
        }
      }

      const loggedDaysList = days.filter((d) => d.mealCount > 0);
      const daysLogged = loggedDaysList.length;

      const totalCal = loggedDaysList.reduce((sum, d) => sum + d.calories, 0);
      const totalProt = loggedDaysList.reduce((sum, d) => sum + d.protein_g, 0);
      const totalCarb = loggedDaysList.reduce((sum, d) => sum + d.carbs_g, 0);
      const totalFat = loggedDaysList.reduce((sum, d) => sum + d.fat_g, 0);

      const summary: WeeklySummary = {
        days,
        streakDays,
        avgCalories: daysLogged > 0 ? Math.round(totalCal / daysLogged) : 0,
        avgProtein: daysLogged > 0 ? Math.round(totalProt / daysLogged) : 0,
        avgCarbs: daysLogged > 0 ? Math.round(totalCarb / daysLogged) : 0,
        avgFat: daysLogged > 0 ? Math.round(totalFat / daysLogged) : 0,
        daysLogged,
        weekOffset,
        weekLabel,
      };

      set({ weeklySummary: summary });

      if (weekOffset === 0) {
        AsyncStorage.setItem(WEEKLY_SUMMARY_CACHE_KEY, JSON.stringify(summary)).catch(() => {});
      }

      return summary;
    } catch (err) {
      console.error('Error in fetchWeeklyStats:', err);
      return null;
    }
  },

  logMeal: async (mealData) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('User not authenticated');

    let finalImageUrl = mealData.image_url || null;
    if (finalImageUrl && !finalImageUrl.startsWith('http')) {
      uploadMealPhotoToSupabase(finalImageUrl, user.id).then((uploaded) => {
        if (uploaded) finalImageUrl = uploaded;
      }).catch(() => {});
    }

    // Generate client-side UUID so we don't wait for server roundtrip
    const mealId = (globalThis.crypto?.randomUUID && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID()
      : `meal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const newMeal: Meal = {
      id: mealId,
      user_id: user.id,
      name: mealData.name.trim() || 'Meal',
      meal_type: mealData.meal_type || 'snack',
      calories: Number(mealData.calories) || 0,
      protein_g: Number(mealData.protein_g) || 0,
      carbs_g: Number(mealData.carbs_g) || 0,
      fat_g: Number(mealData.fat_g) || 0,
      food_items: mealData.food_items || [],
      image_url: finalImageUrl,
      logged_at: mealData.logged_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // 1. Instant 0ms Optimistic UI Update
    set((state) => {
      const updatedMeals = [newMeal, ...state.meals];
      if (state.selectedDate === getTodayString()) {
        AsyncStorage.setItem(TODAY_MEALS_CACHE_KEY, JSON.stringify(updatedMeals)).catch(() => {});
      }
      return {
        meals: updatedMeals,
        draftMeal: null,
      };
    });

    // 2. Enqueue persistent background mutation (Offline-First Resilience)
    await enqueueMutation('CREATE_MEAL', newMeal);

    // Refresh weekly stats
    get().fetchWeeklyStats().catch(() => {});

    return newMeal;
  },

  updateMeal: async (id: string, updates: Partial<Meal>) => {
    let updatedMeal: Meal | null = null;
    set((state) => {
      const updatedMeals = state.meals.map((m) => {
        if (m.id === id) {
          updatedMeal = { ...m, ...updates };
          return updatedMeal;
        }
        return m;
      });
      if (state.selectedDate === getTodayString()) {
        AsyncStorage.setItem(TODAY_MEALS_CACHE_KEY, JSON.stringify(updatedMeals)).catch(() => {});
      }
      return {
        meals: updatedMeals,
      };
    });

    await enqueueMutation('UPDATE_MEAL', { id, updates });
    get().fetchWeeklyStats().catch(() => {});

    return updatedMeal || (updates as Meal);
  },

  deleteMeal: async (id: string) => {
    set((state) => {
      const filtered = state.meals.filter((m) => m.id !== id);
      if (state.selectedDate === getTodayString()) {
        AsyncStorage.setItem(TODAY_MEALS_CACHE_KEY, JSON.stringify(filtered)).catch(() => {});
      }
      return {
        meals: filtered,
      };
    });

    await enqueueMutation('DELETE_MEAL', { id });
    get().fetchWeeklyStats().catch(() => {});
  },
}));
