import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useCoachStore } from './coachStore';
import { useMealStore } from './mealStore';

const PROFILE_CACHE_KEY = '@calorie_tracker_cached_profile';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<Profile | null>;
  saveProfile: (profileData: Partial<Profile>) => Promise<Profile>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Immediate local hydration from cache so UI renders with zero flicker
      try {
        const cachedRaw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cachedRaw) {
          const cachedProfile = JSON.parse(cachedRaw) as Profile;
          if (cachedProfile && cachedProfile.target_calories) {
            set({ profile: cachedProfile });
          }
        }
      } catch (cacheErr) {
        console.warn('Could not read cached profile:', cacheErr);
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Error fetching session:', error.message);
      }

      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await get().fetchProfile();
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });
        if (newSession?.user) {
          await get().fetchProfile();
          useCoachStore.getState().loadHistory(newSession.user.id);
        } else {
          set({ profile: null });
          useCoachStore.getState().reset();
          useMealStore.getState().reset();
        }
      });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('Remote profiles table not found in schema cache. Using cached profile if present.');
        } else {
          console.warn('Notice fetching remote profile:', error.message || error);
        }

        // Return current local profile if remote fetch fails
        return get().profile;
      }

      if (data) {
        set({ profile: data as Profile });
        try {
          await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
        } catch (storageErr) {
          console.warn('Failed to cache profile:', storageErr);
        }
        return data as Profile;
      }

      return null;
    } catch (err) {
      console.warn('Offline or network failure in fetchProfile, using local profile state:', err);
      return get().profile;
    }
  },

  saveProfile: async (profileData: Partial<Profile>) => {
    const user = get().user;
    if (!user) throw new Error('User not authenticated');

    const updatedProfile = {
      id: user.id,
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('profiles')
      .upsert(updatedProfile)
      .select()
      .single();

    // Graceful fallback if new optional columns (activity_level, goal_pace, etc.) don't exist yet in Supabase schema
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
      console.warn('Saving with core schema fallback due to remote schema version:', error.message);
      const coreProfile = {
        id: user.id,
        gender: profileData.gender,
        age: profileData.age,
        weight_kg: profileData.weight_kg,
        height_cm: profileData.height_cm,
        target_calories: profileData.target_calories,
        target_protein_g: profileData.target_protein_g,
        target_carbs_g: profileData.target_carbs_g,
        target_fat_g: profileData.target_fat_g,
        updated_at: new Date().toISOString(),
      };

      const fallbackRes = await supabase
        .from('profiles')
        .upsert(coreProfile)
        .select()
        .single();

      if (fallbackRes.error) {
        throw fallbackRes.error;
      }

      data = { ...fallbackRes.data, ...profileData };
    } else if (error) {
      throw error;
    }

    set({ profile: data as Profile });
    try {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
    } catch (cacheErr) {
      console.warn('Failed to cache saved profile:', cacheErr);
    }
    return data as Profile;
  },

  signOut: async () => {
    try {
      useCoachStore.getState().reset();
      useMealStore.getState().reset();
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    } catch (cacheErr) {
      console.warn('Failed to clear caches on sign out:', cacheErr);
    }
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
}));
