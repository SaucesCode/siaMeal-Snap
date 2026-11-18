import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { selectTodayMeals, useMealStore } from '../../stores/mealStore';
import { useStreakStore } from '../../stores/streakStore';
import { useWaterStore } from '../../stores/waterStore';
import { buildCoachContext } from '../../utils/coachContext';
import { getTodayString } from '../../utils/localDate';
import { useSiaStore } from './siaStore';

const hasMealsToday = () => selectTodayMeals(useMealStore.getState()).length > 0;

async function refreshStreak() {
  const change = await useStreakStore.getState().refresh(hasMealsToday());
  // The first load only establishes the baseline; milestones fire when the streak grows.
  if (change && change.prev !== null) {
    useSiaStore.getState().emit({ type: 'streakChanged', prev: change.prev, next: change.next });
  }
}

/**
 * Turns real app events into Sia reactions: opening the app (once per day), logging a meal,
 * reaching the water goal, and streak milestones. Mount once, on the signed-in tab layout.
 */
export function useSiaEvents() {
  useEffect(() => {
    let lastOpenedDay = '';
    let cancelled = false;

    const onOpened = async () => {
      const today = getTodayString();
      if (lastOpenedDay === today) return;
      lastOpenedDay = today;
      // Wait for today's meals so "nothing logged yet" is true, not just not-loaded-yet.
      await useMealStore.getState().fetchTodayMeals();
      if (cancelled) return;
      useSiaStore.getState().emit({ type: 'appOpened', now: new Date(), hasMealsToday: hasMealsToday() });
      await refreshStreak();
    };

    useSiaStore
      .getState()
      .hydrate()
      .then(() => {
        if (!cancelled) return onOpened();
      })
      .catch((err: unknown) => console.warn('Sia could not start:', err));

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        onOpened().catch((err: unknown) => console.warn('Sia could not react to app open:', err));
      }
    });

    const unsubscribeMeals = useMealStore.subscribe((state, prev) => {
      const logged = state.lastLoggedMeal;
      if (!logged || logged === prev.lastLoggedMeal) return;
      const { profile, user } = useAuthStore.getState();
      useSiaStore.getState().emit({
        type: 'mealLogged',
        mealName: logged.name,
        ctx: buildCoachContext(profile, user?.email, selectTodayMeals(state)),
      });
      refreshStreak().catch((err: unknown) => console.warn('Could not refresh streak:', err));
    });

    const unsubscribeWater = useWaterStore.subscribe((state, prev) => {
      const addedWater = state.logs.length > prev.logs.length;
      if (addedWater && prev.todayMl < state.dailyGoalMl && state.todayMl >= state.dailyGoalMl) {
        useSiaStore.getState().emit({ type: 'waterGoalReached' });
      }
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
      unsubscribeMeals();
      unsubscribeWater();
    };
  }, []);
}
