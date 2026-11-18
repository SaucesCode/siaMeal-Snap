import { PUPILS, siaPose, type SiaExpression } from '../siaPose';

describe('siaPose', () => {
  it('resting: calm open eye, medium pupil, blinks', () => {
    expect(siaPose('resting')).toMatchObject({ eye: 'open', pupil: 'medium', mouth: 'w', motion: 'blink' });
  });

  it('happy: her classic wink with a hop', () => {
    expect(siaPose('happy')).toMatchObject({ eye: 'wink', mouth: 'w', motion: 'hop' });
  });

  it('loves: wide pupils, blush and a beating heart', () => {
    expect(siaPose('loves')).toMatchObject({
      eye: 'open', pupil: 'wide', mouth: 'w', extras: ['blush', 'heart'], motion: 'heartbeat',
    });
  });

  it('celebrating: wide pupils, open mouth, ears out, sprout up, stars', () => {
    expect(siaPose('celebrating')).toMatchObject({
      pupil: 'wide', mouth: 'wOpen', earTilt: 6, sproutLift: 4, extras: ['stars'], motion: 'twinkle',
    });
  });

  it('thinking: slit pupil glancing up-left, shutter focuses', () => {
    expect(siaPose('thinking')).toMatchObject({
      pupil: 'slit', gaze: { dx: -3, dy: -4 }, mouth: 'wSmall', motion: 'focus',
    });
  });

  it('concerned: slit pupils under worried lids, ears back, sprout droops', () => {
    expect(siaPose('concerned')).toMatchObject({
      pupil: 'slit', lids: 'worried', mouth: 'wDown', earTilt: 14, sproutTilt: 30, motion: 'sway',
    });
  });

  it('puzzled: slit pupil, small "o", head tilted, question mark', () => {
    expect(siaPose('puzzled')).toMatchObject({
      pupil: 'slit', mouth: 'o', headTilt: -9, sproutTilt: -24, extras: ['question'], motion: 'none',
    });
  });

  it('sleepy: both eyes closed, no pupil, drifting z', () => {
    expect(siaPose('sleepy')).toMatchObject({
      eye: 'closed', pupil: null, mouth: 'wSmall', earTilt: 8, sproutTilt: 14, extras: ['zz'], motion: 'drift',
    });
  });

  it('every expression has a complete pose', () => {
    const all: SiaExpression[] = ['resting', 'happy', 'loves', 'celebrating', 'thinking', 'concerned', 'puzzled', 'sleepy'];
    for (const expression of all) {
      const pose = siaPose(expression);
      expect(pose.lids).toMatch(/^(none|worried)$/);
      expect(typeof pose.headTilt).toBe('number');
      expect(Array.isArray(pose.extras)).toBe(true);
    }
  });
});

describe('PUPILS', () => {
  it('drives both the blue pupil and the shutter aperture', () => {
    expect(PUPILS.wide).toEqual({ kind: 'circle', rx: 11.5, ry: 11.5, apertureScale: 1.4 });
    expect(PUPILS.medium).toEqual({ kind: 'ellipse', rx: 6.5, ry: 10.5, apertureScale: 1 });
    expect(PUPILS.slit).toEqual({ kind: 'ellipse', rx: 2.6, ry: 11, apertureScale: 0.7 });
  });
});
