import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Sia } from '../../components/sia';
import { Tap } from '../../components/Tap';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import { motion } from '../../theme';
import { useSiaStore } from '../sia/siaStore';
import { dayMood, stripSiaX } from '../sia/tabMoods';
import type { StripDay } from './WeekStrip';

const SIZE = 56;
const HOP = 10;
const ease = Easing.bezier(...motion.easeOut);

/** Sia above the week strip: she hops to the day you pick and her face shows how it went. */
export function StripSia({ days, selected, target, today }: { days: StripDay[]; selected: string; target: number; today: string }) {
  const hidden = useSiaStore((s) => s.hidden);
  const openCoach = useCoachStore((s) => s.openCoach);
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, days.findIndex((d) => d.date === selected));
  const targetX = stripSiaX(index, width, SIZE, days.length);
  const x = useSharedValue(targetX);
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      x.set(targetX);
      return;
    }
    x.set(withTiming(targetX, { duration: motion.base, easing: ease }));
    y.set(withSequence(withTiming(-HOP, { duration: motion.base / 2, easing: ease }), withTiming(0, { duration: motion.base / 2, easing: ease })));
  }, [targetX, reduceMotion]);

  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: y.get() }] }));

  if (hidden) return null;

  const day = days[index];
  const when = selected === today ? 'today' : selected > today ? 'future' : 'past';
  const mood = dayMood(day?.calories ?? 0, target, when);

  return (
    <View testID="strip-sia-track" style={styles.track} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View testID="strip-sia" accessibilityValue={{ now: targetX }} style={[styles.sia, move]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: SIZE },
  sia: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE },
});
