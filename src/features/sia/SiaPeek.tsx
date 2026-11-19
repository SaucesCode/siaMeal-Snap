import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import { Sia, type SiaExpression } from '../../components/sia';
import { PAW_HEIGHT, PAW_WIDTH, SiaPaws } from '../../components/sia/SiaPaws';
import { motion } from '../../theme';
import { useCoachStore } from '../../stores/coachStore';
import { hapticFeedback } from '../../utils/haptics';
import {
  PEEK_HIDDEN_Y,
  PEEK_LEAN,
  PEEK_MS,
  PEEK_SHOWN_Y,
  PEEK_SIZE,
  PEEK_STRIP,
  peekX,
} from './peekMotion';
import type { SiaReaction, SiaSpot } from './siaReactions';
import { useSiaStore } from './siaStore';

const EASE_OUT = Easing.bezier(...motion.easeOut);
const EASE_IN = Easing.bezier(0.4, 0, 0.8, 0.3);
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
const PAWS_GAP = 23;
const PAWS_WIDTH = PAW_WIDTH * 2 + PAWS_GAP;
/** Paws drop this far as she lets go of the edge. */
const PAW_DROP = 16;

/**
 * Sia peeking over the top edge of Today's calories card. She stays put until a reaction
 * arrives, then ducks behind the card and rises at the reaction's spot (left over the ring,
 * right over the macros, centre to say hi). Under reduced motion she fades instead.
 * Render it after the card inside a wrapper whose top edge is the card's top edge. Screens
 * other than Today can pass their own `reaction` (e.g. Review, Camera).
 */
interface SiaPeekProps {
  /** Drive her from one screen (e.g. Review) instead of the shared reaction store. */
  reaction?: SiaReaction;
  /** Replaces opening the coach when she is tapped. */
  onPress?: () => void;
  /** Start ducked behind the edge, so her first reaction rises into view (screens she appears on mid-flow). */
  startHidden?: boolean;
}

export function SiaPeek({ reaction, onPress, startHidden = false }: SiaPeekProps = {}) {
  const { storeCurrent, hidden, pet } = useSiaStore(useShallow((s) => ({ storeCurrent: s.current, hidden: s.hidden, pet: s.pet })));
  const current = reaction ?? storeCurrent;
  const openCoach = useCoachStore((s) => s.openCoach);
  const reduceMotion = useReducedMotion();

  const [width, setWidth] = useState(0);
  /** Latest measured width, read when she actually moves (the card can resize mid-animation). */
  const widthRef = useRef(0);
  const [expression, setExpression] = useState<SiaExpression>('resting');
  const spot = useRef<SiaSpot>('center');
  const busy = useRef(false);
  const pending = useRef<SiaReaction | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const x = useSharedValue(0);
  const y = useSharedValue(startHidden ? PEEK_HIDDEN_Y : PEEK_SHOWN_Y);
  const tilt = useSharedValue(0);
  const opacity = useSharedValue(1);
  const pawY = useSharedValue(startHidden ? PAW_DROP : 0);
  const pawOpacity = useSharedValue(startHidden ? 0 : 1);
  const breath = useSharedValue(1);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const play = useCallback(
    (reaction: SiaReaction) => {
      const to = reaction.spot;
      // No spot (e.g. being petted): change face in place with a small nod.
      if (!to) {
        setExpression(reaction.expression);
        if (!reduceMotion) {
          y.set(withSequence(withTiming(PEEK_SHOWN_Y - 4, { duration: PEEK_MS.nod * 0.4, easing: EASE_IN_OUT }), withTiming(PEEK_SHOWN_Y, { duration: PEEK_MS.nod * 0.6, easing: EASE_IN_OUT })));
        }
        return;
      }

      busy.current = true;
      const finish = (afterMs: number) =>
        later(() => {
          busy.current = false;
          const next = pending.current;
          pending.current = null;
          if (next) play(next);
          else x.set(peekX(spot.current, widthRef.current));
        }, afterMs);

      if (reduceMotion) {
        opacity.set(withTiming(0, { duration: PEEK_MS.fade }));
        pawOpacity.set(withTiming(0, { duration: PEEK_MS.fade }));
        later(() => {
          spot.current = to;
          setExpression(reaction.expression);
          x.set(peekX(to, widthRef.current));
          opacity.set(withTiming(1, { duration: PEEK_MS.fade }));
          pawOpacity.set(withTiming(1, { duration: PEEK_MS.fade }));
        }, PEEK_MS.fade);
        finish(PEEK_MS.fade * 2);
        return;
      }

      // 1. Duck: head sinks with an ease-in; paws let go a beat later.
      y.set(withTiming(PEEK_HIDDEN_Y, { duration: PEEK_MS.duck, easing: EASE_IN }));
      pawOpacity.set(withDelay(PEEK_MS.pawsLetGoDelay, withTiming(0, { duration: PEEK_MS.pawsLetGo, easing: EASE_IN })));
      pawY.set(withDelay(PEEK_MS.pawsLetGoDelay, withTiming(PAW_DROP, { duration: PEEK_MS.pawsLetGo, easing: EASE_IN })));

      // 2. Hidden: move to the new spot and change face out of sight.
      later(() => {
        spot.current = to;
        setExpression(reaction.expression);
        x.set(peekX(to, widthRef.current));
      }, PEEK_MS.duck);

      // 3. Rise with a small settle, leaning toward the middle; paws grab the edge once her chin clears it.
      // Her app-open greeting (sleepy) rises slowly, like waking up.
      const slow = reaction.expression === 'sleepy';
      const riseMs = slow ? PEEK_MS.riseSlow : PEEK_MS.rise;
      later(() => {
        if (slow) {
          y.set(withSequence(withTiming(PEEK_SHOWN_Y + 10, { duration: riseMs * 0.55, easing: EASE_OUT }), withTiming(PEEK_SHOWN_Y, { duration: riseMs * 0.45, easing: EASE_OUT })));
        } else {
          y.set(withSequence(withTiming(PEEK_SHOWN_Y - 7, { duration: riseMs * 0.62, easing: EASE_OUT }), withTiming(PEEK_SHOWN_Y, { duration: riseMs * 0.38, easing: EASE_IN_OUT })));
          tilt.set(withSequence(withTiming(PEEK_LEAN[to], { duration: riseMs * 0.62, easing: EASE_OUT }), withTiming(0, { duration: riseMs * 0.38, easing: EASE_IN_OUT })));
        }
        const grab = slow ? PEEK_MS.pawsGrabDelaySlow : PEEK_MS.pawsGrabDelay;
        pawOpacity.set(withDelay(grab, withTiming(1, { duration: PEEK_MS.pawsGrab, easing: EASE_OUT })));
        pawY.set(withDelay(grab, withTiming(0, { duration: PEEK_MS.pawsGrab, easing: EASE_OUT })));
      }, PEEK_MS.duck + PEEK_MS.hiddenPause);

      let total = PEEK_MS.duck + PEEK_MS.hiddenPause + riseMs;
      // 4. Celebrating: two soft hops, smaller each time.
      if (reaction.expression === 'celebrating') {
        const h = PEEK_MS.hops;
        later(() => {
          y.set(withSequence(
            withTiming(PEEK_SHOWN_Y - 12, { duration: h * 0.3, easing: EASE_OUT }),
            withTiming(PEEK_SHOWN_Y, { duration: h * 0.25, easing: EASE_IN }),
            withTiming(PEEK_SHOWN_Y - 5, { duration: h * 0.23, easing: EASE_OUT }),
            withTiming(PEEK_SHOWN_Y, { duration: h * 0.22, easing: EASE_IN }),
          ));
        }, total);
        total += h;
      }
      finish(total);
    },
    // Shared values and refs are stable; width and reduced motion decide where and how she moves.
    [width, reduceMotion]
  );

  // A new reaction from the store: play it now, or right after the one in progress.
  useEffect(() => {
    if (!current) {
      setExpression('resting');
      return;
    }
    if (current.line && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(current.line);
    // Before the card is measured she can't know where "right" is; wait for the width.
    if (busy.current || width === 0) pending.current = current;
    else play(current);
  }, [current]);

  // Keep her on her spot when the card is first measured or resized, and play anything that was waiting.
  useEffect(() => {
    if (width === 0 || busy.current) return;
    x.set(peekX(spot.current, width));
    const waiting = pending.current;
    pending.current = null;
    if (waiting) play(waiting);
  }, [width]);

  // A barely-there breath while she rests.
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.set(1);
      return;
    }
    breath.set(withRepeat(withTiming(1.015, { duration: PEEK_MS.breath, easing: EASE_IN_OUT }), -1, true));
    return () => cancelAnimation(breath);
  }, [reduceMotion]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const siaStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { rotate: `${tilt.get()}deg` }],
  }));
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: breath.get() }] }));
  const pawsStyle = useAnimatedStyle(() => ({
    opacity: pawOpacity.get() * opacity.get(),
    transform: [{ translateX: x.get() + (PEEK_SIZE - PAWS_WIDTH) / 2 }, { translateY: pawY.get() }],
  }));

  if (hidden) return null;

  return (
    <View testID="sia-peek-zone" style={styles.zone} pointerEvents="box-none" onLayout={(e: LayoutChangeEvent) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}>
      <View style={styles.strip} pointerEvents="box-none">
        <Animated.View testID="sia-peek" style={[styles.sia, siaStyle]}>
          <Pressable
            onPress={() => {
              hapticFeedback.light();
              if (onPress) onPress();
              else openCoach();
            }}
            onLongPress={() => {
              hapticFeedback.purr();
              if (reaction) play({ expression: 'loves', line: null });
              else pet();
            }}
            accessibilityRole="button"
            accessibilityLabel="Chat with Sia"
            accessibilityHint="Opens the nutrition coach"
          >
            <Animated.View style={[styles.breath, breathStyle]}>
              <Sia expression={expression} size={PEEK_SIZE} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>
      <Animated.View style={[styles.paws, pawsStyle]} pointerEvents="none">
        <SiaPaws gap={PAWS_GAP} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: PEEK_STRIP,
  },
  strip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  sia: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: PEEK_SIZE,
    height: PEEK_SIZE,
    transformOrigin: 'bottom',
  },
  breath: {
    transformOrigin: 'bottom',
  },
  paws: {
    position: 'absolute',
    left: 0,
    bottom: -PAW_HEIGHT * 0.4,
  },
});
