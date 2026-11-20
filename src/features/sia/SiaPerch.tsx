import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSegments } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { Sia } from '../../components/sia';
import { PAW_HEIGHT, SiaPaws } from '../../components/sia/SiaPaws';
import { motion, palette, radius, space, type } from '../../theme';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import { useSiaStore } from './siaStore';
import { useTabBarHeight } from './SiaTabBar';
import { meLine } from './tabMoods';
import { useAuthStore } from '../../stores/authStore';
import { useStreakStore } from '../../stores/streakStore';
import { useWeightStore } from '../../stores/weightStore';

/** Sia's size on the perch. */
export const PERCH_SIA_SIZE = 78;
/** How much of her head is hidden below the tab bar's edge (≈15 %). */
const CHIN_TUCK = 12;
/** How far she rises above the bar. Tab screens keep at least this much bottom scroll padding. */
export const PERCH_SCROLL_INSET = PERCH_SIA_SIZE - CHIN_TUCK;
const PERCH_RIGHT = 14;
/** Paws flank her face (viewBox x ≈ 62 and 178 on a 78 px Sia), clear of her mouth. */
const PAWS_RIGHT = 16;
const PAWS_GAP = 21;
/** The toes hang over the bar's edge; the rest of the paw rests on top of it. */
const PAW_OVERHANG = PAW_HEIGHT * 0.4;

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** How long her progress line stays up on Me before she goes quiet. */
const LINE_MS = 5000;

/**
 * Sia on the tab bar's top edge above Me, head clipped at the bar's edge and paws resting on it.
 * Only on Me: on Today, History and Water she peeks over a card instead (SiaPeek), and never on the
 * camera, while typing, or when "Show Sia" is off. Her bubble shows one line about your progress.
 */
export function SiaPerchOverlay() {
  const { current, hidden, pet } = useSiaStore(
    useShallow((s) => ({ current: s.current, hidden: s.hidden, pet: s.pet }))
  );
  const barHeight = useTabBarHeight((s) => s.height);
  const openCoach = useCoachStore((s) => s.openCoach);
  const segments = useSegments() as string[];
  const keyboardVisible = useKeyboardVisible();
  const profile = useAuthStore((s) => s.profile);
  const latestKg = useWeightStore((s) => (s.entries.length ? s.entries[s.entries.length - 1].weight_kg : null));
  const streak = useStreakStore((s) => s.streak);
  const line = meLine({ weightKg: latestKg ?? profile?.weight_kg, targetWeightKg: profile?.target_weight_kg, streak });
  const onMe = segments.includes('profile');
  const [showLine, setShowLine] = useState(true);

  useEffect(() => {
    if (!onMe) return;
    setShowLine(true);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(line);
    const quiet = setTimeout(() => setShowLine(false), LINE_MS);
    return () => clearTimeout(quiet);
  }, [line, onMe]);

  if (hidden || barHeight === 0 || !onMe || keyboardVisible) return null;

  const openChat = () => {
    hapticFeedback.light();
    openCoach();
  };

  return (
    <>
      {showLine && <Bubble key={line} text={line} bottom={barHeight + space[3]} onPress={openChat} />}
      <Pressable
        onPress={openChat}
        onLongPress={() => {
          hapticFeedback.purr();
          pet();
        }}
        accessibilityRole="button"
        accessibilityLabel="Chat with Sia"
        accessibilityHint="Opens the nutrition coach"
        style={[styles.peek, { bottom: barHeight }]}
      >
        <Sia expression={current?.expression ?? 'resting'} size={PERCH_SIA_SIZE} />
      </Pressable>
      <SiaPaws gap={PAWS_GAP} style={[styles.paws, { bottom: barHeight - PAW_OVERHANG }]} />
    </>
  );
}

function Bubble({ text, bottom, onPress }: { text: string; bottom: number; onPress: () => void }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(withTiming(1, { duration: motion.fast }));
  }, [opacity]);
  const fadeIn = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={[styles.bubble, { bottom }, fadeIn]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Opens the nutrition coach">
        <Text accessibilityLiveRegion="polite" style={styles.bubbleText}>
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Only the part above the bar is visible: the view clips her chin at the bar's edge.
  peek: {
    position: 'absolute',
    right: PERCH_RIGHT,
    width: PERCH_SIA_SIZE,
    height: PERCH_SCROLL_INSET,
    overflow: 'hidden',
  },
  paws: {
    position: 'absolute',
    right: PAWS_RIGHT,
  },
  bubble: {
    position: 'absolute',
    right: PERCH_RIGHT + PERCH_SIA_SIZE + space[2],
    maxWidth: 220,
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.card,
    borderBottomRightRadius: 4,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    shadowColor: palette.text,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  bubbleText: {
    color: palette.text,
    fontFamily: type.bodySemibold,
    fontSize: type.size.secondary,
    lineHeight: 18,
  },
});
