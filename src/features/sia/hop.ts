import { Easing, withSequence, withTiming } from 'react-native-reanimated';
import { motion } from '../../theme';

export const siaEase = Easing.bezier(...motion.easeOut);

/** A small up-and-down hop (translateY) over one standard transition. */
export function hop(height = 10) {
  'worklet';
  return withSequence(
    withTiming(-height, { duration: motion.base / 2, easing: siaEase }),
    withTiming(0, { duration: motion.base / 2, easing: siaEase })
  );
}
