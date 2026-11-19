export type ViewfinderMode = 'photo' | 'barcode';

export interface ViewfinderWindow {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

/** Where the clear window sits on a `w` × `h` screen: Sia's round eye for photos, a wide slot for barcodes. */
export function windowFor(mode: ViewfinderMode, w: number, h: number): ViewfinderWindow {
  const centerY = h * 0.42;
  if (mode === 'barcode') {
    const width = Math.round(w * 0.84);
    const height = 150;
    return { x: Math.round((w - width) / 2), y: Math.round(centerY - height / 2), width, height, radius: 20 };
  }
  const size = Math.round(Math.min(w * 0.78, 300));
  return { x: Math.round((w - size) / 2), y: Math.round(centerY - size / 2), width: size, height: size, radius: size / 2 };
}
