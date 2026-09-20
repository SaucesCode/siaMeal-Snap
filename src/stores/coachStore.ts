import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage } from '../services/aiService';

const COACH_STORAGE_KEY = '@siamessage_coach_history';

interface CoachState {
  messages: ChatMessage[];
  isLoaded: boolean;
  loadHistory: () => Promise<void>;
  addMessage: (msg: ChatMessage) => Promise<void>;
  setMessages: (messages: ChatMessage[]) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  messages: [],
  isLoaded: false,

  loadHistory: async () => {
    try {
      const stored = await AsyncStorage.getItem(COACH_STORAGE_KEY);
      if (stored) {
        const parsed: ChatMessage[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          set({ messages: parsed, isLoaded: true });
          return;
        }
      }
      set({ messages: [], isLoaded: true });
    } catch (err) {
      console.warn('Failed to load coach history from AsyncStorage:', err);
      set({ messages: [], isLoaded: true });
    }
  },

  addMessage: async (msg: ChatMessage) => {
    const updated = [...get().messages, msg];
    set({ messages: updated });
    try {
      await AsyncStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist coach message:', err);
    }
  },

  setMessages: async (messages: ChatMessage[]) => {
    set({ messages });
    try {
      await AsyncStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn('Failed to persist coach messages:', err);
    }
  },

  clearHistory: async () => {
    set({ messages: [] });
    try {
      await AsyncStorage.removeItem(COACH_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear coach history:', err);
    }
  },
}));
