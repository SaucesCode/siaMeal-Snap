import type { SiaSpot } from './siaReactions';

/** Sia's size when she peeks over Today's card. */
export const PEEK_SIZE = 84;
/** Height of the clipped strip above the card she rises out of. */
export const PEEK_STRIP = 90;
/** Gap between Sia and the card's side edges at the left and right spots. */
const EDGE = 8;

/** translateY values inside the strip: resting with her chin tucked behind the card, and fully ducked. */
export const PEEK_SHOWN_Y = 14;
export const PEEK_HIDDEN_Y = 96;

/** She leans toward the middle of the card as she rises (degrees). */
export const PEEK_LEAN: Record<SiaSpot, number> = { left: 4, center: 0, right: -4 };

/** Timings from the approved preview (ms). */
export const PEEK_MS = {
  duck: 280,
  pawsLetGoDelay: 60,
  pawsLetGo: 200,
  hiddenPause: 90,
  rise: 460,
  riseSlow: 900,
  pawsGrabDelay: 170,
  pawsGrabDelaySlow: 420,
  pawsGrab: 240,
  hops: 760,
  nod: 360,
  fade: 200,
  breath: 1800,
} as const;

/** Left edge of Sia at a spot on a card `width` wide; 0 until the card has been measured. */
export function peekX(spot: SiaSpot, width: number): number {
  const x = spot === 'left' ? EDGE : spot === 'right' ? width - PEEK_SIZE - EDGE : (width - PEEK_SIZE) / 2;
  return width < PEEK_SIZE + 2 * EDGE ? 0 : Math.round(x);
}
