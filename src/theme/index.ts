import paletteValues from './palette';

export type PaletteKey =
  | 'bg' | 'surface' | 'line' | 'text' | 'textMuted'
  | 'point' | 'pointText' | 'pointMuted' | 'pointTrack' | 'pointDeep'
  | 'leaf' | 'leafOnLight' | 'leafText'
  | 'shutter' | 'shutterGlyph'
  | 'protein' | 'carbs' | 'fat' | 'proteinOnLight' | 'carbsOnLight' | 'fatOnLight'
  | 'water' | 'eye' | 'over';

export const palette = paletteValues as Readonly<Record<PaletteKey, string>>;

/** 4-pt spacing scale (pt). */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

export const radius = { control: 12, card: 16, hero: 22, full: 999 } as const;

/** Durations in ms; easeOut as cubic-bezier control points. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  easeOut: [0.2, 0.8, 0.2, 1] as const,
} as const;

export const type = {
  display: 'Outfit_800ExtraBold',
  displayBold: 'Outfit_700Bold',
  body: 'PlusJakartaSans_500Medium',
  bodySemibold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  size: { hero: 40, title: 22, section: 17, body: 15, secondary: 13, caption: 12 },
} as const;

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two #RRGGBB colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
