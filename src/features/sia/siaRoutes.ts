/** Today is the tabs group's index route; expo-router may or may not include "index" in segments. */
export function isTodayRoute(segments: readonly string[]): boolean {
  const last = segments[segments.length - 1];
  return last === '(tabs)' || (segments[0] === '(tabs)' && last === 'index');
}
