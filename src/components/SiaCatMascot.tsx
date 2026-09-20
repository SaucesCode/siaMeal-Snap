import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleProp, ViewStyle, StyleSheet, Easing } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export type SiaMood = 'idle' | 'celebrating' | 'scanning' | 'happy' | 'thinking' | string;

export interface SiaCatMascotProps {
  /** Diameter of the mascot avatar in pixels. Default: 64 */
  size?: number;
  /** Emotional state or mode of the mascot. Default: 'idle' */
  mood?: SiaMood;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to show outer emerald halo glow */
  withGlow?: boolean;
}

/**
 * SiaCatMascot - The official 2D cartoon mascot for SiaMeal Snap.
 * Fuses feline personality with AI vision scanning & emerald macro intelligence.
 */
export default function SiaCatMascot({
  size = 64,
  mood = 'idle',
  style,
  withGlow = true,
}: SiaCatMascotProps) {
  // Animation refs
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'celebrating') {
      // Bouncy celebratory animation loop
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -8,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 380,
            easing: Easing.bounce,
            useNativeDriver: true,
          }),
          Animated.delay(800),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else if (mood === 'scanning') {
      // Continuous smooth rotation for scanning aperture
      const anim = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    } else {
      // Gentle idle breathing
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [mood, bounceAnim, pulseAnim, rotateAnim]);

  const badgeSize = Math.max(18, Math.round(size * 0.34));
  const spinInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [
            { translateY: bounceAnim },
            { scale: pulseAnim },
          ],
        },
        style,
      ]}
    >
      {/* Outer Glow Disc */}
      <View
        style={[
          styles.mascotDisc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: mood === 'celebrating' ? '#34d399' : '#10b981',
            shadowOpacity: withGlow ? 0.45 : 0,
            shadowRadius: size * 0.25,
            elevation: withGlow ? 12 : 0,
            borderColor: mood === 'celebrating' ? '#34d399' : '#10b981',
          },
        ]}
      >
        {/* Mascot Face / Avatar Image */}
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          }}
          resizeMode="cover"
        />

        {/* Scanning Reticle Overlay */}
        {mood === 'scanning' && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: spinInterpolate }],
              },
            ]}
          >
            <Svg width={size} height={size} viewBox="0 0 100 100">
              <Circle
                cx="50"
                cy="50"
                r="46"
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="18 12"
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}
      </View>

      {/* Mood Accessory Badges */}
      {mood === 'celebrating' && (
        <View
          style={[
            styles.moodBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: '#10b981',
              borderColor: '#09090b',
            },
          ]}
        >
          <Ionicons name="sparkles" size={Math.round(badgeSize * 0.6)} color="#ffffff" />
        </View>
      )}

      {mood === 'happy' && (
        <View
          style={[
            styles.moodBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: '#059669',
              borderColor: '#09090b',
            },
          ]}
        >
          <Ionicons name="heart" size={Math.round(badgeSize * 0.58)} color="#ffffff" />
        </View>
      )}

      {mood === 'thinking' && (
        <View
          style={[
            styles.moodBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: '#0284c7',
              borderColor: '#09090b',
            },
          ]}
        >
          <Ionicons name="bulb" size={Math.round(badgeSize * 0.58)} color="#ffffff" />
        </View>
      )}

      {mood === 'idle' && (
        <View
          style={[
            styles.moodBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: '#09090b',
              borderColor: '#10b981',
            },
          ]}
        >
          {/* Organic Nutrition Sprout Leaf */}
          <Ionicons name="leaf" size={Math.round(badgeSize * 0.55)} color="#10b981" />
        </View>
      )}
    </Animated.View>
  );
}

export { SiaCatMascot };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mascotDisc: {
    backgroundColor: '#09090b',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
  },
  moodBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
});
