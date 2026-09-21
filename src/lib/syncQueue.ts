import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from './supabase';

const SYNC_QUEUE_KEY = '@calorie_tracker_mutation_queue';

export interface QueuedMutation {
  id: string;
  type: 'CREATE_MEAL' | 'UPDATE_MEAL' | 'DELETE_MEAL';
  payload: any;
  createdAt: number;
  retryCount: number;
}

let isSyncing = false;
let isInitialized = false;

/**
 * Retrieves all pending offline mutations from AsyncStorage.
 */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a new mutation to the persistent offline sync queue and triggers processing.
 */
export async function enqueueMutation(
  type: QueuedMutation['type'],
  payload: any
): Promise<void> {
  try {
    const queue = await getQueuedMutations();
    const newMutation: QueuedMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    const updated = [...queue, newMutation];
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));

    // Silently attempt to process in the background
    processSyncQueue().catch(() => {});
  } catch (err) {
    console.warn('Could not enqueue offline mutation:', err);
  }
}

/**
 * Drains pending mutations in the queue sequentially with idempotent execution.
 */
export async function processSyncQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const queue = await getQueuedMutations();
    if (queue.length === 0) {
      isSyncing = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // User not authenticated yet; defer sync until sign-in
      isSyncing = false;
      return;
    }

    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        let error: any = null;

        if (item.type === 'CREATE_MEAL') {
          // Idempotent upsert so retries never produce duplicates
          const res = await supabase.from('meals').upsert(item.payload, { onConflict: 'id' });
          error = res.error;
        } else if (item.type === 'UPDATE_MEAL') {
          const res = await supabase.from('meals').update(item.payload.updates).eq('id', item.payload.id);
          error = res.error;
        } else if (item.type === 'DELETE_MEAL') {
          const res = await supabase.from('meals').delete().eq('id', item.payload.id);
          error = res.error;
        }

        if (error) {
          console.warn(`Sync queue error on ${item.type}:`, error.message);
          // If offline / network failure, keep in queue and stop draining until connection resumes
          item.retryCount += 1;
          if (item.retryCount < 8) {
            remainingQueue.push(item);
          }
          break; // Stop draining this cycle; network is likely degraded
        }
      } catch (ex: any) {
        console.warn(`Sync exception on ${item.type}:`, ex.message);
        item.retryCount += 1;
        if (item.retryCount < 8) {
          remainingQueue.push(item);
        }
        break;
      }
    }

    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
  } finally {
    isSyncing = false;
  }
}

/**
 * Initializes the background sync listener on app foreground events.
 */
export function initSyncQueue(): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  // Process queue immediately on start
  processSyncQueue().catch(() => {});

  // Drain queue whenever the user returns to the app
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      processSyncQueue().catch(() => {});
    }
  });

  return () => {
    sub.remove();
    isInitialized = false;
  };
}
