/**
 * Renders the app icon, Android adaptive icon layers, launch splash and web favicon from Sia's
 * vector art (src/components/sia/siaArt.ts), so every platform asset matches the in-app Sia.
 *
 *   npm run assets:sia
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  EYE,
  MINI,
  PATHS,
  SIA_COLORS as C,
  SIA_MINI_VIEWBOX,
  SIA_VIEWBOX,
  SPLASH,
} from '../src/components/sia/siaArt';
import { PUPILS } from '../src/components/sia/siaPose';
import palette from '../src/theme/palette';

const OUT = join(__dirname, '..', 'assets', 'images');

/** Sia's resting face (open blue eye, medium pupil, shutter, whiskers) in viewBox units. */
function restingFace(): string {
  const pupil = PUPILS.medium;
  const blades = PATHS.bladeLines
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.blade}" stroke-width="3" stroke-linecap="round"/>`)
    .join('');
  const whiskers = PATHS.whiskers.map((d) => `<path d="${d}"/>`).join('');
  return `
    <defs>
      <linearGradient id="leaf" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${C.leafFrom}"/><stop offset="100%" stop-color="${C.leafTo}"/>
      </linearGradient>
      <clipPath id="aperture"><circle cx="${EYE.shutter.cx}" cy="${EYE.shutter.cy}" r="${EYE.apertureClipR}"/></clipPath>
    </defs>
    <path d="${PATHS.earLeft}" fill="${C.mask}" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"/>
    <path d="${PATHS.earLeftInner}" fill="${C.innerEar}"/>
    <path d="${PATHS.earRight}" fill="${C.mask}" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"/>
    <path d="${PATHS.earRightInner}" fill="${C.innerEar}"/>
    <path d="${PATHS.sproutStem}" stroke="${C.stem}" stroke-width="5" stroke-linecap="round"/>
    <path d="${PATHS.leafLeft}" fill="url(#leaf)" stroke="${C.leafStroke}" stroke-width="2"/>
    <path d="${PATHS.leafRight}" fill="url(#leaf)" stroke="${C.leafStroke}" stroke-width="2"/>
    <path d="${PATHS.head}" fill="${C.cream}" stroke="${C.outline}" stroke-width="6" stroke-linejoin="round"/>
    <path d="${PATHS.chin}" fill="${C.chin}"/>
    <path d="${PATHS.mask}" fill="${C.mask}"/>
    <circle cx="${EYE.natural.cx}" cy="${EYE.natural.cy}" r="${EYE.natural.r}" fill="${C.blue}" stroke="${C.outline}" stroke-width="3"/>
    <ellipse cx="${EYE.natural.cx}" cy="${EYE.natural.cy}" rx="${pupil.rx}" ry="${pupil.ry}" fill="${C.ink}"/>
    <circle cx="${EYE.natural.cx + EYE.shineOffset.dx}" cy="${EYE.natural.cy + EYE.shineOffset.dy}" r="4" fill="${C.white}"/>
    <circle cx="${EYE.lowerShine.cx}" cy="${EYE.lowerShine.cy}" r="${EYE.lowerShine.r}" fill="${C.white}" opacity="0.8"/>
    <circle cx="${EYE.shutter.cx}" cy="${EYE.shutter.cy}" r="${EYE.shutter.r}" fill="${C.shutter}" stroke="${C.outline}" stroke-width="3"/>
    <circle cx="${EYE.shutterHighlight.cx}" cy="${EYE.shutterHighlight.cy}" r="${EYE.shutterHighlight.r}" fill="${C.shutterHighlight}" opacity="0.45"/>
    <g clip-path="url(#aperture)"><polygon points="${PATHS.bladeHex}" fill="${C.blade}"/>${blades}</g>
    <g stroke="${C.cream}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="0.95">${whiskers}</g>
    <path d="${PATHS.nose}" fill="${C.nose}" stroke="${C.outline}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="${PATHS.mouthW}" fill="none" stroke="${C.outline}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Single-colour silhouette for Android's themed (monochrome) icon, with eyes and nose cut out. */
function silhouette(): string {
  return `<defs><mask id="face">
    <rect x="0" y="0" width="240" height="240" fill="#FFFFFF"/>
    <circle cx="${EYE.natural.cx}" cy="${EYE.natural.cy}" r="${EYE.natural.r}" fill="#000000"/>
    <circle cx="${EYE.shutter.cx}" cy="${EYE.shutter.cy}" r="${EYE.shutter.r}" fill="#000000"/>
    <path d="${PATHS.nose}" fill="#000000"/>
  </mask></defs>
  <g fill="#000000" mask="url(#face)">
    <path d="${PATHS.earLeft}"/><path d="${PATHS.earRight}"/>
    <path d="${PATHS.leafLeft}"/><path d="${PATHS.leafRight}"/>
    <path d="${PATHS.sproutStem}" stroke="#000000" stroke-width="6" stroke-linecap="round"/>
    <path d="${PATHS.head}"/>
  </g>`;
}

function miniFace(): string {
  return `
    <path d="${MINI.earLeft}" fill="${C.mask}" stroke="${C.outline}" stroke-width="10" stroke-linejoin="round"/>
    <path d="${MINI.earRight}" fill="${C.mask}" stroke="${C.outline}" stroke-width="10" stroke-linejoin="round"/>
    <path d="${MINI.stem}" stroke="${C.stem}" stroke-width="9" stroke-linecap="round"/>
    <path d="${MINI.leaves}" fill="${MINI.leafFill}" stroke="${C.leafStroke}" stroke-width="4"/>
    <path d="${MINI.head}" fill="${C.cream}" stroke="${C.outline}" stroke-width="10" stroke-linejoin="round"/>
    <path d="${MINI.mask}" fill="${C.mask}"/>
    <path d="${MINI.wink}" stroke="${C.ink}" stroke-width="13" stroke-linecap="round" fill="none"/>
    <circle cx="${EYE.shutter.cx}" cy="${EYE.shutter.cy}" r="19" fill="${C.shutter}" stroke="${C.blade}" stroke-width="5"/>
    <polygon points="${MINI.shutterHex}" fill="${C.blade}"/>
    <path d="${MINI.nose}" fill="${C.nose}"/>`;
}

function place(inner: string, viewBox: string, x: number, y: number, size: number): string {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${viewBox}">${inner}</svg>`;
}

function render(file: string, size: number, body: string, background?: string) {
  const bg = background ? `<rect width="100%" height="100%" fill="${background}"/>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}${body}</svg>`;
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  writeFileSync(join(OUT, file), png);
  console.log(`wrote assets/images/${file} (${png.length} bytes)`);
}

const face = restingFace();
const { siaBox, canvas } = SPLASH;

// iOS / default icon: full bleed cream, no transparency.
render('icon.png', 1024, place(face, SIA_VIEWBOX, 132, 132, 760), palette.bg);
// Android adaptive icon: Sia inside the 66% safe zone over a cream background layer.
render('android-icon-foreground.png', 1024, place(face, SIA_VIEWBOX, 232, 232, 560));
render('android-icon-background.png', 1024, '', palette.bg);
render('android-icon-monochrome.png', 1024, place(silhouette(), SIA_VIEWBOX, 232, 232, 560));
// Launch splash: Sia centred inside the Android 12+ splash circle, on transparent (app.json
// supplies the cream background).
render('splash-icon.png', canvas, place(face, SIA_VIEWBOX, siaBox.x, siaBox.y, siaBox.size));
// Web favicon: the simplified head.
render('favicon.png', 48, place(miniFace(), SIA_MINI_VIEWBOX, 0, 0, 48));
