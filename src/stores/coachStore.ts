import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../services/aiService';
import { supabase } from '../lib/supabase';

const getCoachStorageKey = (userId?: string | null) =>
  userId ? `@siamessage_coach_history_${userId}` : '@siamessage_coach_history_guest';

interface CoachState {
  messages: ChatMessage[];
  isLoaded: boolean;
  currentUserId: string | null;
  loadHistory: (userId?: string) => Promise<void>;
  addMessage: (msg: ChatMessage) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  reset: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  messages: [],
  isLoaded: false,
  currentUserId: null,

  loadHistory: async (userId?: string) => {
    try {
      // Determine effective user ID
      let resolvedUserId = userId || get().currentUserId;
      if (!resolvedUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        resolvedUserId = session?.user?.id || null;
      }

      // If user changed, reset current messages first
      if (resolvedUserId !== get().currentUserId) {
        set({ messages: [], isLoaded: false, currentUserId: resolvedUserId });
      }

      const key = getCoachStorageKey(resolvedUserId);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed: ChatMessage[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ messages: parsed, isLoaded: true, currentUserId: resolvedUserId });
          return;
        }
      }
      set({ messages: [], isLoaded: true, currentUserId: resolvedUserId });
    } catch (err) {
      console.warn('Failed to load coach history from AsyncStorage:', err);
      set({ messages: [], isLoaded: true });
    }
  },

  addMessage: async (msg: ChatMessage) => {
    const updated = [...get().messages, msg];
    set({ messages: updated });
    try {
      const key = getCoachStorageKey(get().currentUserId);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist coach message:', err);
    }
  },

  setMessages: async (messages: ChatMessage[]) => {
    set({ messages });
    try {
      const key = getCoachStorageKey(get().currentUserId);
      await AsyncStorage.setItem(key, JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to persist coach messages:', err);
    }
  },

  clearHistory: async () => {
    set({ messages: [] });
    try {
      const key = getCoachStorageKey(get().currentUserId);
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('Failed to clear coach history:', err);
    }
  },

  reset: () => {
    set({ messages: [], isLoaded: false, currentUserId: null });
  },
}));
