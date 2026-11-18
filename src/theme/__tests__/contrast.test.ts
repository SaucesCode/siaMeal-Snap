import { contrastRatio, palette, type PaletteKey } from '..';

// Pairs from the design spec §7.1: text needs 4.5:1, non-text UI 3:1.
const PAIRS: Array<[PaletteKey, PaletteKey, number]> = [
  ['text', 'bg', 4.5],
  ['textMuted', 'bg', 4.5],
  ['textMuted', 'surface', 4.5],
  ['pointText', 'point', 4.5],
  ['pointMuted', 'point', 4.5],
  ['leafText', 'bg', 4.5],
  ['over', 'bg', 4.5],
  ['shutterGlyph', 'shutter', 4.5],
  ['leaf', 'pointTrack', 3],
];

describe('Colorpoint palette contrast', () => {
  it.each(PAIRS)('%s on %s is at least %d:1', (fg, bg, min) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white and symmetric', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for identical colours', () => {
    expect(contrastRatio('#7A6457', '#7A6457')).toBeCloseTo(1, 5);
  });
});
