import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { motion } from '../../theme';
import { PUPILS, type SiaMotion, type SiaPose } from './siaPose';

const EASE_OUT = Easing.bezier(...motion.easeOut);

/** Length of one cycle for the looping motions, in ms. */
export const LOOP_MS: Partial<Record<SiaMotion, number>> = {
  focus: 1400,
  heartbeat: 1100,
  twinkle: 1200,
  sway: 2400,
  drift: 2600,
};

const BLINK_MIN_MS = 4000;
const BLINK_MAX_MS = 7000;

export interface SiaMotionValues {
  /** True when the expression's motion is actually running. */
  isAnimating: boolean;
  /** Natural-eye pupil radii (animate on pupil changes: the "dilation"). */
  pupilRx: SharedValue<number>;
  pupilRy: SharedValue<number>;
  /** Shutter aperture scale, mirrors the pupil. */
  aperture: SharedValue<number>;
  /** 1 = eye open, ~0 = mid-blink. */
  blink: SharedValue<number>;
  /** 0→1 progress of the current loop (focus, heartbeat, twinkle, sway, drift). */
  loop: SharedValue<number>;
  /** Vertical offset in px for the happy hop. */
  hopY: SharedValue<number>;
}

/**
 * Small, purposeful motion for an expression, on the UI thread. Pupil/aperture changes
 * always ease when motion is allowed; everything is static under reduced motion.
 */
export function useSiaMotion(pose: SiaPose, enabled: boolean): SiaMotionValues {
  const reducedMotion = useReducedMotion();
  const motionAllowed = enabled && !reducedMotion;
  const isAnimating = motionAllowed && pose.motion !== 'none';

  const pupil = pose.pupil ? PUPILS[pose.pupil] : PUPILS.medium;
  const pupilRx = useSharedValue(pupil.rx);
  const pupilRy = useSharedValue(pupil.ry);
  const aperture = useSharedValue(pupil.apertureScale);
  const blink = useSharedValue(1);
  const loop = useSharedValue(0);
  const hopY = useSharedValue(0);

  useEffect(() => {
    const to = (value: number) =>
      motionAllowed ? withTiming(value, { duration: motion.base, easing: EASE_OUT }) : value;
    pupilRx.set(to(pupil.rx));
    pupilRy.set(to(pupil.ry));
    aperture.set(to(pupil.apertureScale));
  }, [aperture, motionAllowed, pupil.apertureScale, pupil.rx, pupil.ry, pupilRx, pupilRy]);

  useEffect(() => {
    cancelAnimation(loop);
    cancelAnimation(blink);
    cancelAnimation(hopY);
    loop.set(0);
    blink.set(1);
    hopY.set(0);
    if (!isAnimating) return;

    if (pose.motion === 'blink') {
      let timer: ReturnType<typeof setTimeout>;
      const scheduleBlink = () => {
        timer = setTimeout(() => {
          blink.set(withSequence(withTiming(0.08, { duration: 80 }), withTiming(1, { duration: 120 })));
          scheduleBlink();
        }, BLINK_MIN_MS + Math.random() * (BLINK_MAX_MS - BLINK_MIN_MS));
      };
      scheduleBlink();
      return () => clearTimeout(timer);
    }

    if (pose.motion === 'hop') {
      hopY.set(
        withSequence(
          withTiming(-6, { duration: 180, easing: EASE_OUT }),
          withTiming(0, { duration: 270, easing: Easing.inOut(Easing.quad) })
        )
      );
      return;
    }

    const loopMs = LOOP_MS[pose.motion];
    if (loopMs) {
      loop.set(withRepeat(withTiming(1, { duration: loopMs, easing: Easing.linear }), -1, false));
    }
    return () => cancelAnimation(loop);
  }, [blink, hopY, isAnimating, loop, pose.motion]);

  return { isAnimating, pupilRx, pupilRy, aperture, blink, loop, hopY };
}
