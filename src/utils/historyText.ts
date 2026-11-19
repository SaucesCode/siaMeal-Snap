import { getLocalDateString } from './localDate';

const nf = new Intl.NumberFormat('en-US');

/** "Today", "Yesterday", or "Mon, Nov 16" for a local YYYY-MM-DD date. */
export function dayLabel(date: string, today = new Date()): string {
  if (date === getLocalDateString(today)) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date === getLocalDateString(yesterday)) return 'Yesterday';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** One plain line about the week shown in History. */
export function weekLine(summary: { daysLogged: number; avgCalories: number } | null): string {
  if (!summary || summary.daysLogged === 0) return 'No meals logged this week yet.';
  return `${summary.daysLogged} of 7 days logged · ${nf.format(Math.round(summary.avgCalories))} kcal a day`;
}

/** Under the water ring: litres still to drink, or that the goal is done. */
export function waterStatus(ml: number, goalMl: number): string {
  if (goalMl <= 0) return '';
  if (ml >= goalMl) return 'Goal reached!';
  return `${((goalMl - ml) / 1000).toFixed(1)} L to go`;
}
