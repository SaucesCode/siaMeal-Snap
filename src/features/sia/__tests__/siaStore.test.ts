import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayString } from '../../../utils/localDate';
import { REACTION_MS, SIA_STORAGE_KEY, useSiaStore } from '../siaStore';
import type { SiaEvent } from '../siaReactions';

const TODAY = getTodayString();
const overAndProtein: SiaEvent = {
  type: 'mealLogged',
  mealName: 'Feast',
  ctx: {
    targetCalories: 2000,
    consumedCalories: 2300,
    remainingCalories: 0,
    targetProtein: 150,
    consumedProtein: 155,
    remainingProtein: 0,
  },
};
const water: SiaEvent = { type: 'waterGoalReached' };

const state = () => useSiaStore.getState();

describe('useSiaStore', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    state().reset();
    await state().setHidden(false);
  });
  afterEach(() => jest.useRealTimers());

  it('shows reactions one at a time, then returns to resting', () => {
    state().emit(overAndProtein);
    expect(state().current?.expression).toBe('concerned');

    jest.advanceTimersByTime(REACTION_MS);
    expect(state().current?.expression).toBe('celebrating');

    jest.advanceTimersByTime(REACTION_MS);
    expect(state().current).toBeNull();
  });

  it('never repeats a once-per-day reaction that was already shown', () => {
    state().emit(water);
    jest.advanceTimersByTime(REACTION_MS);
    state().emit(water);
    expect(state().current).toBeNull();
    expect(state().done).toContain(`water:${TODAY}`);
  });

  it('remembers what was shown across app restarts', async () => {
    state().emit(water);
    await jest.runOnlyPendingTimersAsync();
    const saved = JSON.parse((await AsyncStorage.getItem(SIA_STORAGE_KEY)) ?? '{}');
    expect(saved.done).toContain(`water:${TODAY}`);
  });

  it('stays quiet when Sia is hidden, and remembers the setting', async () => {
    await state().setHidden(true);
    state().emit(water);
    expect(state().current).toBeNull();
    const saved = JSON.parse((await AsyncStorage.getItem(SIA_STORAGE_KEY)) ?? '{}');
    expect(saved.hidden).toBe(true);
  });

  it('petting her shows "loves" right away', () => {
    state().pet();
    expect(state().current).toEqual({ expression: 'loves', line: null });
    jest.advanceTimersByTime(REACTION_MS);
    expect(state().current).toBeNull();
  });

  it('reset clears what is showing and what was shown (sign-out, account deletion)', () => {
    state().emit(water);
    state().reset();
    expect(state().current).toBeNull();
    expect(state().done).toEqual([]);
  });

  it('drops remembered keys from earlier days when loading', async () => {
    await AsyncStorage.setItem(
      SIA_STORAGE_KEY,
      JSON.stringify({ hidden: false, done: ['water:2000-01-01', `water:${TODAY}`, 'streak:7'] })
    );
    await state().hydrate();
    expect(state().done.sort()).toEqual(['streak:7', `water:${TODAY}`].sort());
  });
});
