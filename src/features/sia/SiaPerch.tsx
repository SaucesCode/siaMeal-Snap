import React, { useEffect } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { Sia } from '../../components/sia';
import { PAW_HEIGHT, SiaPaws } from '../../components/sia/SiaPaws';
import { motion, palette, radius, space, type } from '../../theme';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import { useSiaStore } from './siaStore';

/** Sia's size on the perch. */
export const PERCH_SIA_SIZE = 78;
/** How much of her head is tucked behind the tab bar (≈15 %). */
const CHIN_TUCK = 12;
/**
 * Height of the strip reserved above the tab bar for Sia and her bubble. It is part of the tab
 * bar's own layout, so every tab screen's content ends above her automatically.
 */
export const PERCH_RESERVED_HEIGHT = 68;
const PERCH_RIGHT = 14;
/** Paws flank her face (viewBox x ≈ 62 and 178 on a 78 px Sia), clear of her mouth. */
const PAWS_RIGHT = 16;
const PAWS_GAP = 21;

/**
 * Sia peeking over the tab bar. Rendered by SiaTabBar *before* the bar so her chin is tucked
 * behind it; the paws are rendered after the bar so they grip its edge.
 */
export function SiaPerch() {
  const { current, pet } = useSiaStore(useShallow((s) => ({ current: s.current, pet: s.pet })));
  const openCoach = useCoachStore((s) => s.openCoach);
  const line = current?.line ?? null;

  useEffect(() => {
    if (line && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(line);
  }, [line]);

  const openChat = () => {
    hapticFeedback.light();
    openCoach();
  };

  return (
    <View style={styles.strip} pointerEvents="box-none">
      {line && <Bubble key={line} text={line} onPress={openChat} />}
      <Pressable
        onPress={openChat}
        onLongPress={() => {
          hapticFeedback.purr();
          pet();
        }}
        accessibilityRole="button"
        accessibilityLabel="Chat with Sia"
        accessibilityHint="Opens the nutrition coach"
        style={styles.siaButton}
      >
        <Sia expression={current?.expression ?? 'resting'} size={PERCH_SIA_SIZE} />
      </Pressable>
    </View>
  );
}

/** The paws, positioned over the tab bar's top edge (render after the bar). */
export function SiaPerchPaws() {
  return <SiaPaws gap={PAWS_GAP} style={styles.paws} />;
}

function Bubble({ text, onPress }: { text: string; onPress: () => void }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(withTiming(1, { duration: motion.fast }));
  }, [opacity]);
  const fadeIn = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={[styles.bubble, fadeIn]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Opens the nutrition coach">
        <Text accessibilityLiveRegion="polite" style={styles.bubbleText}>
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: {
    height: PERCH_RESERVED_HEIGHT,
    backgroundColor: palette.bg,
  },
  siaButton: {
    position: 'absolute',
    right: PERCH_RIGHT,
    bottom: -CHIN_TUCK,
    width: PERCH_SIA_SIZE,
    height: PERCH_SIA_SIZE,
  },
  paws: {
    position: 'absolute',
    top: PERCH_RESERVED_HEIGHT - PAW_HEIGHT / 2,
    right: PAWS_RIGHT,
  },
  bubble: {
    position: 'absolute',
    right: PERCH_RIGHT + PERCH_SIA_SIZE + space[2],
    bottom: space[3],
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
