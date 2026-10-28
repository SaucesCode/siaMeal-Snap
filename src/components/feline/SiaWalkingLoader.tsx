import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { SiaVectorCat } from './SiaVectorCat';

export interface SiaWalkingLoaderProps {
  /** Primary status message displayed below Sia */
  label?: string;
  /** Optional secondary subtext */
  sublabel?: string;
  /** Diameter of the walking mascot in pixels. Default: 84 */
  size?: number;
  /** Compact inline mode for chat bubbles or small cards */
  compact?: boolean;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

function PawPrintIcon({ size = 14, color = '#10b981' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={color}>
        {/* Main Pad */}
        <Circle cx="12" cy="15" r="4.5" />
        {/* Toe Pads */}
        <Circle cx="6.5" cy="9.5" r="2.2" />
        <Circle cx="10.2" cy="7" r="2.2" />
        <Circle cx="14.5" cy="7" r="2.2" />
        <Circle cx="17.8" cy="9.5" r="2.2" />
      </G>
    </Svg>
  );
}

/**
 * SiaWalkingLoader - Animated trotting Siamese cat loader with fading emerald paw prints.
 * Replaces generic ActivityIndicators with native brand personality.
 */
export function SiaWalkingLoader({
  label = 'Sia is on the prowl...',
  sublabel,
  size = 84,
  compact = false,
  style,
}: SiaWalkingLoaderProps) {
  const reducedMotion = useReducedMotion();

  const paw1Opacity = useSharedValue(0.2);
  const paw2Opacity = useSharedValue(0.2);
  const paw3Opacity = useSharedValue(0.2);
  const horizontalProwl = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    // Subtle horizontal patrol drift
    horizontalProwl.set(
      withRepeat(
        withSequence(
          withTiming(6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    // Sequential paw print trail pulse
    paw1Opacity.set(
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: 300 }),
          withTiming(0.15, { duration: 600 })
        ),
        -1,
        false
      )
    );

    paw2Opacity.set(
      withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(0.95, { duration: 300 }),
            withTiming(0.15, { duration: 600 })
          ),
          -1,
          false
        )
      )
    );

    paw3Opacity.set(
      withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(0.95, { duration: 300 }),
            withTiming(0.15, { duration: 600 })
          ),
          -1,
          false
        )
      )
    );

    return () => {
      cancelAnimation(horizontalProwl);
      cancelAnimation(paw1Opacity);
      cancelAnimation(paw2Opacity);
      cancelAnimation(paw3Opacity);
    };
  }, [reducedMotion]);

  const catDriftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: horizontalProwl.get() }],
  }));

  const paw1Style = useAnimatedStyle(() => ({ opacity: paw1Opacity.get() }));
  const paw2Style = useAnimatedStyle(() => ({ opacity: paw2Opacity.get() }));
  const paw3Style = useAnimatedStyle(() => ({ opacity: paw3Opacity.get() }));

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <Animated.View style={catDriftStyle}>
          <SiaVectorCat size={size} mood="walking" animation="walk" withGlow={true} />
        </Animated.View>
        <View style={styles.compactTextWrap}>
          {!!label && <Text style={styles.compactLabel}>{label}</Text>}
          <View style={styles.pawRow}>
            <Animated.View style={paw1Style}>
              <PawPrintIcon size={11} />
            </Animated.View>
            <Animated.View style={paw2Style}>
              <PawPrintIcon size={11} />
            </Animated.View>
            <Animated.View style={paw3Style}>
              <PawPrintIcon size={11} />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.stage}>
        {/* Trailing Paw Prints Behind Sia */}
        <View style={styles.trailTrack}>
          <Animated.View style={[styles.trailPaw, paw1Style, { transform: [{ rotate: '75deg' }, { translateY: 3 }] }]}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={[styles.trailPaw, paw2Style, { transform: [{ rotate: '75deg' }, { translateY: -3 }] }]}>
            <PawPrintIcon size={14} />
          </Animated.View>
          <Animated.View style={[styles.trailPaw, paw3Style, { transform: [{ rotate: '75deg' }, { translateY: 2 }] }]}>
            <PawPrintIcon size={14} />
          </Animated.View>
        </View>

        {/* Trotting Vector Mascot */}
        <Animated.View style={catDriftStyle}>
          <SiaVectorCat size={size} mood="walking" animation="walk" withGlow={true} />
        </Animated.View>
      </View>

      {!!label && <Text style={styles.label}>{label}</Text>}
      {!!sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

export default SiaWalkingLoader;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trailTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
    marginTop: 22,
  },
  trailPaw: {
    padding: 2,
  },
  label: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Outfit_700Bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sublabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    marginTop: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  compactTextWrap: {
    flexDirection: 'column',
    gap: 4,
  },
  compactLabel: {
    color: '#e4e4e7',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  pawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
