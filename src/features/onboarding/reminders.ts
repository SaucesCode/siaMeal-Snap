import { mealReminderTimes } from './flow';

export interface ReminderSlot {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

const BODY = 'Snap your plate and Sia will count it.';

function titleFor(hour: number): string {
  if (hour < 11) return 'Breakfast time';
  if (hour < 16) return 'Lunch time';
  return 'Dinner time';
}

/** One daily reminder per chosen meal time, named after the meal it's near. */
export function reminderSchedule(times: string[]): ReminderSlot[] {
  return mealReminderTimes(times).map((t) => {
    const [hour, minute] = t.split(':').map(Number);
    return { hour, minute, title: titleFor(hour), body: BODY };
  });
}
