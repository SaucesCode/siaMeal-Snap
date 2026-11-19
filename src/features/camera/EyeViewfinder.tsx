import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { motion, palette, space, type } from '../../theme';
import { windowFor, type ViewfinderMode, type ViewfinderWindow } from './viewfinderGeometry';

const RING = 5;
const TICK_COUNT = 6;
/** One full turn of the blades while Sia looks at the photo. */
const FOCUS_TURN_MS = 2400;
const ease = Easing.bezier(...motion.easeOut);

interface EyeViewfinderProps {
  mode: ViewfinderMode;
  /** True while Sia is looking at the photo: the blades turn, like her eye focusing. */
  focusing: boolean;
  /** The snapped photo, frozen in the window while Sia looks at it. */
  frozenUri?: string | null;
  hint: string;
  status?: { title: string; subtitle: string } | null;
}

/** Window path with an even-odd hole: the whole screen, minus Sia's eye (or the barcode slot). */
function maskPath(w: number, h: number, win: ViewfinderWindow): string {
  const { x, y, width, height, radius: r } = win;
  const outer = `M0 0H${w}V${h}H0Z`;
  const hole =
    `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}` +
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return outer + hole;
}

/**
 * The camera seen through Sia's eye: dark everywhere except a round window ringed by her green
 * shutter with six blade ticks (a wide slot in barcode mode). While she looks at a photo the blades
 * turn; static under reduced motion.
 */
export function EyeViewfinder({ mode, focusing, frozenUri, hint, status }: EyeViewfinderProps) {
  const reduceMotion = useReducedMotion();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const turn = useSharedValue(0);

  useEffect(() => {
    if (focusing && !reduceMotion) {
      turn.set(0);
      turn.set(withRepeat(withTiming(360, { duration: FOCUS_TURN_MS, easing: Easing.linear }), -1));
    } else {
      cancelAnimation(turn);
      turn.set(withTiming(0, { duration: reduceMotion ? 0 : motion.base, easing: ease }));
    }
  }, [focusing, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  const win = size.w > 0 ? windowFor(mode, size.w, size.h) : null;
  const ringSize = win ? win.width + RING * 2 + 8 : 0;
  const c = ringSize / 2;
  const r = win ? win.width / 2 + RING / 2 + 2 : 0;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {win && (
        <>
          {frozenUri && (
            <Image
              source={{ uri: frozenUri }}
              style={[styles.frozen, { left: win.x, top: win.y, width: win.width, height: win.height, borderRadius: win.radius }]}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          )}
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Path d={maskPath(size.w, size.h, win)} fill={palette.pointDeep} fillOpacity={0.86} fillRule="evenodd" />
            {mode === 'barcode' && (
              <Rect x={win.x} y={win.y} width={win.width} height={win.height} rx={win.radius} fill="none" stroke={palette.eye} strokeWidth={3} />
            )}
          </Svg>
          {mode === 'photo' && (
            <Animated.View
              style={[styles.ring, { left: win.x + win.width / 2 - c, top: win.y + win.height / 2 - c, width: ringSize, height: ringSize }, ringStyle]}
            >
              <Svg width={ringSize} height={ringSize}>
                <Circle cx={c} cy={c} r={r} fill="none" stroke={palette.eye} strokeWidth={RING} />
                {Array.from({ length: TICK_COUNT }, (_, i) => {
                  const a = ((i * 360) / TICK_COUNT - 90) * (Math.PI / 180);
                  const [inner, outer] = [r - RING - 3, r + RING];
                  return (
                    <Line
                      key={i}
                      x1={c + inner * Math.cos(a)}
                      y1={c + inner * Math.sin(a)}
                      x2={c + outer * Math.cos(a)}
                      y2={c + outer * Math.sin(a)}
                      stroke={palette.pointDeep}
                      strokeWidth={2.5}
                    />
                  );
                })}
              </Svg>
            </Animated.View>
          )}
          <View style={[styles.below, { top: win.y + win.height + space[6] }]} accessibilityLiveRegion="polite">
            {status ? (
              <>
                <Text style={styles.statusTitle}>{status.title}</Text>
                <Text style={styles.statusSub}>{status.subtitle}</Text>
              </>
            ) : (
              hint !== '' && <Text style={styles.hint}>{hint}</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frozen: { position: 'absolute' },
  ring: { position: 'absolute' },
  below: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center' },
  hint: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.pointText, textAlign: 'center' },
  statusTitle: { fontFamily: type.display, fontSize: type.size.section, color: palette.pointText, textAlign: 'center' },
  statusSub: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.pointMuted, textAlign: 'center', marginTop: 2 },
});
