import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getTodayString } from '../../utils/localDate';
import { reactionsFor, type SiaEvent, type SiaReaction } from './siaReactions';

/** How long each reaction (expression + line) stays before the next one or resting. */
export const REACTION_MS = 4000;
export const SIA_STORAGE_KEY = '@siameal_sia_v1';

interface SiaState {
  /** The reaction showing now; null means Sia is resting with no line. */
  current: SiaReaction | null;
  queue: SiaReaction[];
  /** The "Show Sia" setting, inverted. */
  hidden: boolean;
  /** onceKeys already shown (today's daily rules and reached streak milestones). */
  done: string[];
  hydrate: () => Promise<void>;
  emit: (event: SiaEvent) => void;
  setHidden: (hidden: boolean) => Promise<void>;
  pet: () => void;
  reset: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Today's daily keys and streak milestones survive; keys from earlier days are dropped. */
function keepRelevant(done: string[]): string[] {
  const today = getTodayString();
  return done.filter((key) => key.startsWith('streak:') || key.endsWith(`:${today}`));
}

function persist(state: Pick<SiaState, 'hidden' | 'done'>) {
  AsyncStorage.setItem(SIA_STORAGE_KEY, JSON.stringify({ hidden: state.hidden, done: state.done })).catch(
    (err: unknown) => console.warn('Could not save Sia settings:', err)
  );
}

export const useSiaStore = create<SiaState>((set, get) => {
  const showNext = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const [next, ...rest] = get().queue;
    set({ current: next ?? null, queue: rest });
    if (next) timer = setTimeout(showNext, REACTION_MS);
  };

  return {
    current: null,
    queue: [],
    hidden: false,
    done: [],

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(SIA_STORAGE_KEY);
        const saved = raw ? (JSON.parse(raw) as Partial<Pick<SiaState, 'hidden' | 'done'>>) : {};
        set({ hidden: Boolean(saved.hidden), done: keepRelevant(saved.done ?? []) });
      } catch (err) {
        console.warn('Could not load Sia settings:', err);
      }
    },

    emit: (event) => {
      const { hidden, done, queue, current } = get();
      if (hidden) return;
      const reactions = reactionsFor(event, new Set(done), getTodayString());
      if (reactions.length === 0) return;
      const newKeys = reactions.flatMap((r) => (r.onceKey ? [r.onceKey] : []));
      const nextDone = keepRelevant([...done, ...newKeys]);
      set({ queue: [...queue, ...reactions], done: nextDone });
      persist({ hidden, done: nextDone });
      if (!current) showNext();
    },

    setHidden: async (hidden) => {
      if (hidden) {
        if (timer) clearTimeout(timer);
        timer = null;
        set({ current: null, queue: [] });
      }
      set({ hidden });
      persist({ hidden, done: get().done });
    },

    pet: () => {
      if (get().hidden) return;
      set((s) => ({ queue: [{ expression: 'loves', line: null }, ...s.queue] }));
      showNext();
    },

    reset: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      set({ current: null, queue: [], done: [] });
      // The "Show Sia" setting belongs to the device, so it survives signing out.
      persist({ hidden: get().hidden, done: [] });
    },
  };
});
