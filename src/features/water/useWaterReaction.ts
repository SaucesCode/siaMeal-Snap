import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { SiaReaction, SiaSpot } from '../sia/siaReactions';
import { nextSpot, waterMood } from '../sia/tabMoods';

const PLEASED_MS = 1500;
/** Her mood depends on the clock, so it is re-read this often while the tab stays open. */
const CLOCK_MS = 60_000;

/**
 * Sia's reaction over the water card: her face follows today's pace; after each add she pops up at
 * a new spot, pleased for a moment; reaching the goal celebrates in the middle straight away.
 * The same object is returned until her face or spot changes, so the clock refresh never re-plays her.
 */
export function useWaterReaction(ml: number, goal: number, addedAt: number): SiaReaction {
  const [now, setNow] = useState(() => new Date());
  const [pleased, setPleased] = useState(false);
  const [spot, setSpot] = useState<SiaSpot>('center');

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), CLOCK_MS);
    const resumed = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(tick);
      resumed.remove();
    };
  }, []);

  useEffect(() => {
    if (!addedAt) return;
    setNow(new Date());
    if (goal > 0 && ml >= goal) {
      setPleased(false);
      return;
    }
    setPleased(true);
    setSpot((s) => nextSpot(s));
    const done = setTimeout(() => setPleased(false), PLEASED_MS);
    return () => clearTimeout(done);
  }, [addedAt]);

  const reached = goal > 0 && ml >= goal;
  const expression = reached ? 'celebrating' : pleased ? 'loves' : waterMood(ml, goal, now).expression;
  const at: SiaSpot = reached ? 'center' : spot;
  return useMemo(() => ({ expression, line: null, spot: at }), [expression, at]);
}
