import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { motion, palette, type } from '../../theme';
import { siaStatusLine, type CalorieSummary } from '../../utils/todaySummary';
import { useSiaStore } from './siaStore';

const FADE_OUT_MS = 160;
const FADE_IN_MS = 220;
const LINE_HEIGHT = 19;
const EASE_OUT = Easing.bezier(...motion.easeOut);

/**
 * Sia's line under the greeting on Today: her current reaction's line, or else how the day is
 * going. Cross-fades when it changes. With "Show Sia" off it shows the status without her name.
 */
export function SiaSays({ summary }: { summary: CalorieSummary }) {
  const { line, hidden } = useSiaStore(useShallow((s) => ({ line: s.current?.line ?? null, hidden: s.hidden })));
  const reduceMotion = useReducedMotion();
  const text = (!hidden && line) || siaStatusLine(summary);

  const [shown, setShown] = useState(text);
  const opacity = useSharedValue(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (text === shown) return;
    if (reduceMotion) {
      setShown(text);
      return;
    }
    opacity.set(withTiming(0, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) }));
    timer.current = setTimeout(() => {
      setShown(text);
      opacity.set(withTiming(1, { duration: FADE_IN_MS, easing: EASE_OUT }));
    }, FADE_OUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  // Room for two lines is always reserved, so a longer line never pushes the card down.
  return (
    <Animated.View style={[styles.box, style]} accessibilityLiveRegion="polite">
      <Text style={styles.line} numberOfLines={2}>
        {!hidden && shown !== '' && <Text style={styles.who}>Sia: </Text>}
        {shown}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: LINE_HEIGHT * 2,
    marginTop: 4,
  },
  line: {
    fontFamily: type.bodySemibold,
    fontSize: type.size.secondary,
    lineHeight: LINE_HEIGHT,
    color: palette.text,
  },
  who: {
    color: palette.textMuted,
  },
});
