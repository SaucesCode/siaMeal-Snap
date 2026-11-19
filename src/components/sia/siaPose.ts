export type SiaExpression =
  | 'resting'
  | 'happy'
  | 'loves'
  | 'celebrating'
  | 'thinking'
  | 'concerned'
  | 'puzzled'
  | 'sleepy';

/** Cat pupils: wide when she loves something, medium when calm, slit when focused or wary. */
export type Pupil = 'wide' | 'medium' | 'slit';

export type SiaExtra = 'blush' | 'heart' | 'stars' | 'question' | 'zz';

export type SiaMotion = 'blink' | 'hop' | 'heartbeat' | 'twinkle' | 'focus' | 'sway' | 'none' | 'drift';

export interface SiaPose {
  eye: 'open' | 'wink' | 'closed';
  pupil: Pupil | null;
  /** Pupil offset from the eye centre, in viewBox units. */
  gaze: { dx: number; dy: number };
  lids: 'none' | 'worried';
  mouth: 'w' | 'wOpen' | 'wSmall' | 'wDown' | 'o';
  /** Degrees each ear rotates outward/back. */
  earTilt: number;
  /** Degrees the sprout leans (positive droops right, negative leans left). */
  sproutTilt: number;
  /** Viewbox units the sprout lifts. */
  sproutLift: number;
  /** Degrees the whole head tilts. */
  headTilt: number;
  extras: SiaExtra[];
  motion: SiaMotion;
}

/** One pupil value drives both eyes: the blue eye's pupil and the shutter's aperture scale. */
export const PUPILS: Record<Pupil, { kind: 'circle' | 'ellipse'; rx: number; ry: number; apertureScale: number }> = {
  wide: { kind: 'circle', rx: 11.5, ry: 11.5, apertureScale: 1.4 },
  medium: { kind: 'ellipse', rx: 6.5, ry: 10.5, apertureScale: 1 },
  slit: { kind: 'ellipse', rx: 2.6, ry: 11, apertureScale: 0.7 },
};

const NEUTRAL: SiaPose = {
  eye: 'open',
  pupil: 'medium',
  gaze: { dx: 0, dy: 0 },
  lids: 'none',
  mouth: 'w',
  earTilt: 0,
  sproutTilt: 0,
  sproutLift: 0,
  headTilt: 0,
  extras: [],
  motion: 'none',
};

const POSES: Record<SiaExpression, SiaPose> = {
  resting: { ...NEUTRAL, motion: 'blink' },
  happy: { ...NEUTRAL, eye: 'wink', pupil: null, motion: 'hop' },
  loves: { ...NEUTRAL, pupil: 'wide', extras: ['blush', 'heart'], motion: 'heartbeat' },
  celebrating: {
    ...NEUTRAL, pupil: 'wide', mouth: 'wOpen', earTilt: 6, sproutLift: 4, extras: ['stars'], motion: 'twinkle',
  },
  thinking: { ...NEUTRAL, pupil: 'slit', gaze: { dx: -3, dy: -4 }, mouth: 'wSmall', motion: 'focus' },
  concerned: {
    ...NEUTRAL, pupil: 'slit', gaze: { dx: 0, dy: 3 }, lids: 'worried', mouth: 'wDown', earTilt: 14, sproutTilt: 30, motion: 'sway',
  },
  puzzled: { ...NEUTRAL, pupil: 'slit', mouth: 'o', headTilt: -9, sproutTilt: -24, extras: ['question'] },
  sleepy: {
    ...NEUTRAL, eye: 'closed', pupil: null, mouth: 'wSmall', earTilt: 8, sproutTilt: 14, extras: ['zz'], motion: 'drift',
  },
};

export function siaPose(expression: SiaExpression): SiaPose {
  return POSES[expression];
}
