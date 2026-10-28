import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { hapticFeedback } from '../utils/haptics';
import { SiaVectorCat } from './feline/SiaVectorCat';

interface FloatingCoachWidgetProps {
  onPress: () => void;
  hasUnread?: boolean;
}

const WIDGET_SIZE = 68;

/**
 * FloatingCoachWidget - Draggable Live Animated Sia Companion Widget.
 * Replaces the generic sparkle circle with a borderless, living SVG Sia mascot
 * featuring blinking eyes, swaying sprout, and a compact "Ask Sia" pill.
 */
export function FloatingCoachWidget({ onPress, hasUnread = true }: FloatingCoachWidgetProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const MIN_X = 10;
  const MAX_X = SCREEN_WIDTH - WIDGET_SIZE - 12;
  const MIN_Y = Platform.OS === 'ios' ? 60 : 44;
  const MAX_Y = Platform.OS === 'ios' ? SCREEN_HEIGHT - 175 : SCREEN_HEIGHT - 155;

  const INITIAL_X = SCREEN_WIDTH - WIDGET_SIZE - 14;
  const INITIAL_Y = Platform.OS === 'ios' ? SCREEN_HEIGHT - 180 : SCREEN_HEIGHT - 160;

  const pan = useRef(new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const currentPos = useRef({ x: INITIAL_X, y: INITIAL_Y });

  useEffect(() => {
    const listenerId = pan.addListener((val) => {
      currentPos.current = val;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,

      onPanResponderGrant: () => {
        hapticFeedback.light();
        Animated.spring(pressScale, {
          toValue: 0.92,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }).start();

        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        Animated.spring(pressScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 120,
          friction: 7,
        }).start();

        // Tap detection -> open Sia Coach
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          hapticFeedback.purr();
          onPress();
          return;
        }

        let targetX = currentPos.current.x;
        let targetY = currentPos.current.y;

        if (targetX < SCREEN_WIDTH / 2 - WIDGET_SIZE / 2) {
          targetX = MIN_X;
        } else {
          targetX = MAX_X;
        }

        targetY = Math.max(MIN_Y, Math.min(MAX_Y, targetY));

        hapticFeedback.selection();
        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          tension: 75,
          friction: 9,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 9999,
        elevation: 9999,
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
      }}
    >
      <Animated.View
        style={[
          styles.characterStage,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        {/* Free-Standing Borderless Animated Sia Mascot */}
        <SiaVectorCat
          size={WIDGET_SIZE}
          mood="logo"
          withGlow={true}
        />

        {/* Compact Floating "Ask Sia" Tag Pill */}
        <View style={styles.coachPill}>
          {hasUnread && <View style={styles.liveDot} />}
          <Text style={styles.coachPillText}>Ask Sia</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  characterStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachPill: {
    marginTop: -10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#09090b',
    borderWidth: 1.2,
    borderColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  coachPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Outfit_800ExtraBold',
    letterSpacing: 0.3,
  },
});
