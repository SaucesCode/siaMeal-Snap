import type { SiaExpression } from '../../components/sia';
import { space } from '../../theme';

export type TabMood = { expression: SiaExpression; label: string };

/** How a History day went, from its calories against the target. */
export function dayMood(calories: number, target: number, when: 'past' | 'today' | 'future'): TabMood {
  if (when === 'future') return { expression: 'resting', label: 'Not here yet' };
  if (when === 'today') return { expression: 'resting', label: 'Today is still going' };
  if (calories <= 0) return { expression: 'sleepy', label: 'Nothing logged this day' };
  if (target <= 0) return { expression: 'resting', label: `${Math.round(calories)} kcal logged` };
  const ratio = calories / target;
  if (ratio > 1.1) return { expression: 'concerned', label: 'Over target' };
  if (ratio >= 0.9) return { expression: 'happy', label: 'Right on target' };
  return { expression: 'resting', label: 'A light day' };
}

const PACE_START_MIN = 7 * 60;
const PACE_SPAN_MIN = 15 * 60;

/** How today's water compares with the target spread evenly from 07:00 to 22:00. */
export function waterMood(ml: number, target: number, now: Date): TabMood {
  if (target > 0 && ml >= target) return { expression: 'celebrating', label: 'Water goal reached' };
  const hour = now.getHours();
  if (hour < 9 && ml <= 0 && target > 0) return { expression: 'sleepy', label: 'Morning, nothing yet' };
  const minutes = hour * 60 + now.getMinutes() - PACE_START_MIN;
  const pace = target * Math.min(1, Math.max(0, minutes / PACE_SPAN_MIN));
  if (pace <= 0) return { expression: 'resting', label: 'Ready when you are' };
  const ratio = ml / pace;
  if (ratio >= 0.8) return { expression: 'happy', label: 'On pace' };
  if (ratio < 0.4 && hour >= 10) return { expression: 'concerned', label: 'Thirsty — a glass would help' };
  return { expression: 'resting', label: 'A little behind' };
}

/** Sia's one line on Me: distance to the goal weight, else the streak, else an invitation. */
export function meLine({ weightKg, targetWeightKg, streak }: { weightKg?: number | null; targetWeightKg?: number | null; streak?: number | null }): string {
  if (weightKg && targetWeightKg) {
    const gap = Math.abs(weightKg - targetWeightKg);
    return gap < 0.1 ? "You've reached your goal weight" : `${gap.toFixed(1)} kg to your goal weight`;
  }
  if (streak && streak >= 2) return `${streak} days in a row`;
  return "Snap a meal and I'll start counting.";
}

/** Sia's left edge so she is centred over day `index` of the week strip, kept inside the strip. */
export function stripSiaX(index: number, stripWidth: number, siaSize: number, count = 7, gap: number = space[1]): number {
  if (stripWidth <= siaSize) return 0;
  const cell = (stripWidth - gap * (count - 1)) / count;
  const x = index * (cell + gap) + cell / 2 - siaSize / 2;
  return Math.round(Math.min(stripWidth - siaSize, Math.max(0, x)));
}
