/** Numbers shown on Today's hero card. */
export interface CalorieSummary {
  eaten: number;
  target: number;
  left: number;
  over: number;
  /** 0–1, how full the progress bar is. */
  fraction: number;
}

function clean(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function fill(eaten: number, target: number): number {
  return target > 0 ? Math.min(1, eaten / target) : 0;
}

export function calorieSummary(consumed: number, target: number): CalorieSummary {
  const eaten = clean(consumed);
  const goal = clean(target);
  const diff = Math.round(goal - eaten);
  return {
    eaten: Math.round(eaten),
    target: Math.round(goal),
    left: goal > 0 ? Math.max(0, diff) : 0,
    over: goal > 0 ? Math.max(0, -diff) : 0,
    fraction: fill(eaten, goal),
  };
}

export function macroProgress(consumed: number, target: number) {
  const eaten = clean(consumed);
  const goal = clean(target);
  return { eaten: Math.round(eaten), target: Math.round(goal), fraction: fill(eaten, goal) };
}

/** The name in "Hi {name}": first name, else the email's name, else "there". */
export function greetingName(fullName: string | null | undefined, email: string | null | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0];
  if (first) return first;
  const local = email?.split('@')[0]?.trim();
  return local || 'there';
}

const nf = new Intl.NumberFormat('en-US');
/** Below this share of the target left, "almost there" instead of "plenty of room". */
const NEARLY_DONE = 0.25;

/** What Sia says under the greeting when she has no reaction to share. */
export function siaStatusLine(s: CalorieSummary): string {
  if (s.target <= 0) return '';
  if (s.over > 0) return `${nf.format(s.over)} over today. That's okay.`;
  if (s.eaten === 0) return `${nf.format(s.target)} to go — let's start.`;
  return s.left / s.target < NEARLY_DONE
    ? `${nf.format(s.left)} left — almost there.`
    : `${nf.format(s.left)} left — plenty of room.`;
}
