import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { hapticFeedback } from '../utils/haptics';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface FloatingCoachWidgetProps {
  onPress: () => void;
  hasUnread?: boolean;
}

const WIDGET_SIZE = 56;

export function FloatingCoachWidget({ onPress, hasUnread = true }: FloatingCoachWidgetProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const MIN_X = 12;
  const MAX_X = SCREEN_WIDTH - WIDGET_SIZE - 12;
  const MIN_Y = Platform.OS === 'ios' ? 60 : 44;
  const MAX_Y = Platform.OS === 'ios' ? SCREEN_HEIGHT - 170 : SCREEN_HEIGHT - 150;

  const INITIAL_X = SCREEN_WIDTH - WIDGET_SIZE - 18;
  const INITIAL_Y = Platform.OS === 'ios' ? SCREEN_HEIGHT - 175 : SCREEN_HEIGHT - 155;

  const pan = useRef(new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })).current;
  const currentPos = useRef({ x: INITIAL_X, y: INITIAL_Y });

  // Track position updates
  useEffect(() => {
    const listenerId = pan.addListener((val) => {
      currentPos.current = val;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  // 2D Drag PanResponder with edge-snapping and tap detection (Calm, no pulsing)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,

      onPanResponderGrant: () => {
        hapticFeedback.light();
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

        // If the finger hardly moved, count as a tap to open Sia Coach
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          hapticFeedback.medium();
          onPress();
          return;
        }

        // Clamp inside safe screen bounds
        let targetX = currentPos.current.x;
        let targetY = currentPos.current.y;

        // Magnetic snap to nearest edge (Left or Right)
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
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {/* Sleek Feline Ears Topping the FAB */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10,
            width: WIDGET_SIZE,
            height: 12,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Svg width={WIDGET_SIZE} height={12} viewBox={`0 0 ${WIDGET_SIZE} 12`}>
            {/* Left Ear */}
            <Path d="M 6 12 L 14 1 L 20 12 Z" fill="#09090B" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round" />
            <Path d="M 9 11 L 14 3 L 17 11 Z" fill="#10B981" opacity={0.3} />
            {/* Right Ear */}
            <Path d="M 36 12 L 44 1 L 50 12 Z" fill="#09090B" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round" />
            <Path d="M 39 11 L 44 3 L 47 11 Z" fill="#10B981" opacity={0.3} />
          </Svg>
        </View>

        {/* Main Circular Sports AI FAB Bubble */}
        <View
          style={{
            width: WIDGET_SIZE,
            height: WIDGET_SIZE,
            borderRadius: WIDGET_SIZE / 2,
            backgroundColor: '#09090b',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: '#10b981',
            shadowColor: '#10b981',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          {/* Inner Disc with Glowing AI Sparkles Icon */}
          <View
            style={{
              width: WIDGET_SIZE - 12,
              height: WIDGET_SIZE - 12,
              borderRadius: (WIDGET_SIZE - 12) / 2,
              backgroundColor: '#18181b',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.4)',
            }}
          >
            <Ionicons name="sparkles" size={20} color="#10b981" />
          </View>

          {/* Active Status Badge Dot */}
          {hasUnread && (
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#34d399',
                borderWidth: 2,
                borderColor: '#09090b',
              }}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}
