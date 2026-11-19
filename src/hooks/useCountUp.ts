import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * A number that counts from its previous value to `value` with an ease-out curve.
 * Shows the value immediately on first render and under reduced motion.
 */
export function useCountUp(value: number, durationMs: number): number {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value || reduceMotion || durationMs <= 0) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / durationMs);
      const next = Math.round(from + (value - from) * (1 - (1 - p) ** 3));
      shownRef.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduceMotion]);

  return shown;
}
