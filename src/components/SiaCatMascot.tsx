import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleProp, ViewStyle, StyleSheet, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export type SiaMood = 'idle' | 'celebrating' | 'scanning' | 'happy' | 'thinking' | 'chef' | 'water' | string;

export interface SiaCatMascotProps {
  /** Diameter of the mascot avatar in pixels. Default: 64 */
  size?: number;
  /** Emotional state or mode of the mascot. Default: 'idle' */
  mood?: SiaMood;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to show outer emerald halo glow */
  withGlow?: boolean;
  /** Whether to render as an uncropped, standalone character integrated directly into the surface */
  standalone?: boolean;
}

/**
 * Resolves the appropriate transparent mascot illustration based on context/mood
 */
function getMascotImageSource(mood: SiaMood) {
  switch (mood) {
    case 'scanning':
    case 'scanner':
      return require('../../assets/images/mascot-scanner.png');
    case 'chef':
    case 'thinking':
      return require('../../assets/images/mascot-chef.png');
    case 'water':
    case 'hydrated':
      return require('../../assets/images/mascot-water.png');
    case 'celebrating':
    case 'happy':
    case 'idle':
    default:
      return require('../../assets/images/logo.png');
  }
}

/**
 * SiaCatMascot - The official 2D cartoon mascot for SiaMeal Snap.
 * Pure transparent PNG illustrations seamlessly integrated into dark surfaces.
 */
export default function SiaCatMascot({
  size = 64,
  mood = 'idle',
  style,
  withGlow = true,
  standalone = false,
}: SiaCatMascotProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (mood === 'scanning' && !standalone) {
      const anim = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
      return () => anim.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [mood, standalone, rotateAnim]);

  const badgeSize = Math.max(16, Math.round(size * 0.32));
  const spinInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const imageSource = getMascotImageSource(mood);

  if (standalone) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
          },
          style,
        ]}
      >
        {withGlow && (
          <View
            style={{
              position: 'absolute',
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: (size * 0.8) / 2,
              backgroundColor: mood === 'celebrating' ? '#34d399' : '#10b981',
              opacity: 0.15,
            }}
          />
        )}
        <Image
          source={imageSource}
          style={{
            width: size,
            height: size,
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
        style,
      ]}
    >
      {/* Outer Halo Disc */}
      <View
        style={[
          styles.mascotDisc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: mood === 'celebrating' ? '#34d399' : '#10b981',
            shadowOpacity: withGlow ? 0.35 : 0,
            shadowRadius: size * 0.2,
            elevation: withGlow ? 8 : 0,
            borderColor: mood === 'celebrating' ? '#34d399' : '#10b981',
          },
        ]}
      >
        {/* Mascot Face / Contextual Avatar Image */}
        <Image
          source={imageSource}
          style={{
            width: size - 6,
            height: size - 6,
          }}
          resizeMode="contain"
        />

        {/* Subtle Scanning Reticle Overlay (Only when actively scanning) */}
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
                strokeWidth="2.5"
                strokeDasharray="16 12"
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
          <Ionicons name="leaf" size={Math.round(badgeSize * 0.55)} color="#10b981" />
        </View>
      )}
    </View>
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
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
