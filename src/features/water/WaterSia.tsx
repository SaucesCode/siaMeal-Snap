import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { Sia } from '../../components/sia';
import { Tap } from '../../components/Tap';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import { space } from '../../theme';
import { useSiaStore } from '../sia/siaStore';
import { waterMood, type TabMood } from '../sia/tabMoods';
import { hop } from '../sia/hop';

const SIZE = 64;
const PLEASED_MS = 1500;
const PLEASED: TabMood = { expression: 'loves', label: 'Nice, keep going' };

/** Sia beside the water ring: her face follows your pace; she is pleased for a moment after each add. */
export function WaterSia({ ml, goal, addedAt }: { ml: number; goal: number; addedAt: number }) {
  const hidden = useSiaStore((s) => s.hidden);
  const openCoach = useCoachStore((s) => s.openCoach);
  const reduceMotion = useReducedMotion();
  const [pleased, setPleased] = useState(false);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!addedAt) return;
    setPleased(true);
    if (!reduceMotion) y.set(hop());
    const t = setTimeout(() => setPleased(false), PLEASED_MS);
    return () => clearTimeout(t);
  }, [addedAt]);

  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  if (hidden) return null;
  const mood = pleased ? PLEASED : waterMood(ml, goal, new Date());

  return (
    <Animated.View style={[styles.sia, lift]}>
      <Tap
        onPress={() => {
          hapticFeedback.light();
          openCoach();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Sia: ${mood.label}`}
        accessibilityHint="Opens the coach"
      >
        <Sia expression={mood.expression} size={SIZE} />
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sia: { position: 'absolute', top: space[3], right: space[3], width: SIZE, height: SIZE },
});
