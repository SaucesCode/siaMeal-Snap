/**
 * Sia's vector art, from assets/images/logo.svg (viewBox 0 0 240 240) and the approved
 * expression mockups. Both eyes share one footprint and mirror across x = 120:
 * natural (Siamese blue) eye at (89,134), camera-shutter eye at (151,134), r 17.5 + 3 stroke.
 * Every mouth starts at the nose (120,158) with the same 5.5 stroke.
 */

export const SIA_VIEWBOX = '30 20 180 192';
export const SIA_MINI_VIEWBOX = '30 24 180 186';
/** Below this size Sia renders the simplified, static head. */
export const SIA_DETAIL_THRESHOLD = 48;

export const SIA_COLORS = {
  cream: '#F5E8D0',
  chin: '#E6D2B5',
  mask: '#4B3329',
  innerEar: '#5E4136',
  outline: '#2A1810',
  ink: '#1A0F0A',
  nose: '#F77E8B',
  leafFrom: '#68D458',
  leafTo: '#43AA38',
  leafStroke: '#1E6F35',
  stem: '#25853E',
  blue: '#5FB4E8',
  shutter: '#22E592',
  shutterHighlight: '#38F8A6',
  blade: '#141F1A',
  mouthInside: '#7A2E2E',
  star: '#F2C063',
  extraText: '#7A6457',
  white: '#FFFFFF',
} as const;

export const EAR_PIVOT = { left: { x: 78, y: 112 }, right: { x: 162, y: 112 } } as const;
export const SPROUT_PIVOT = { x: 120, y: 72 } as const;
export const HEAD_PIVOT = { x: 120, y: 140 } as const;

export const PATHS = {
  earLeft: 'M 48 116 C 43 76 50 44 61 37 C 71 31 95 54 109 73 Z',
  earLeftInner: 'M 55 108 C 52 78 57 53 64 48 C 72 44 90 62 101 76 Z',
  earRight: 'M 192 116 C 197 76 190 44 179 37 C 169 31 145 54 131 73 Z',
  earRightInner: 'M 185 108 C 188 78 183 53 176 48 C 168 44 150 62 139 76 Z',

  sproutStem: 'M 120 72 L 120 55',
  leafLeft: 'M 120 60 C 106 60 99 50 100 41 C 110 40 119 47 120 60 Z',
  leafRight: 'M 120 58 C 121 41 132 33 145 34 C 145 48 135 58 120 58 Z',

  head:
    'M 48 112 C 42 128 38 147 36 154 L 44 157 L 39 164 C 54 192 84 206 120 206 C 156 206 186 192 201 164 ' +
    'L 196 157 L 204 154 C 202 147 198 128 192 112 C 176 78 150 68 120 68 C 90 68 64 78 48 112 Z',
  chin: 'M 46 166 C 62 190 88 202 120 202 C 152 202 178 190 194 166 C 176 184 150 193 120 193 C 90 193 64 184 46 166 Z',
  mask:
    'M 56 136 C 56 106 82 90 120 90 C 158 90 184 106 184 136 C 184 158 164 172 146 181 C 134 187 127 189 120 189 ' +
    'C 113 189 106 187 94 181 C 76 172 56 158 56 136 Z',

  nose: 'M 111 148 C 111 144 129 144 129 148 C 129 153 123 158 120 158 C 117 158 111 153 111 148 Z',

  wink: 'M 71 141 C 78 120 100 120 107 141',
  closedNatural: 'M 71 134 C 78 145 100 145 107 134',
  closedShutter: 'M 133 134 C 140 145 162 145 169 134',

  lidLeft: 'M 66 110 L 112 110 L 112 121 C 99 122 83 126 66 133 Z',
  lidLeftLine: 'M 68 132 C 82 126 97 122.5 110 121.5',
  lidRight: 'M 128 110 L 174 110 L 174 133 C 157 126 141 122 128 121 Z',
  lidRightLine: 'M 130 121.5 C 143 122.5 158 126 172 132',

  bladeHex: '151,126 158,130 158,138 151,142 144,138 144,130',
  bladeLines: [
    [151, 126, 159, 119],
    [158, 130, 167, 133],
    [158, 138, 160, 148],
    [151, 142, 143, 149],
    [144, 138, 135, 135],
    [144, 130, 142, 120],
  ] as const,

  whiskers: [
    'M 100 162 C 88 159 76 158 63 159',
    'M 100 168 C 89 169 77 172 66 177',
    'M 140 162 C 152 159 164 158 177 159',
    'M 140 168 C 151 169 163 172 174 177',
  ],

  mouthW: 'M 101 163 C 106 173 118 171 120 158 C 122 171 134 173 139 163',
  mouthWOpen: 'M 101 163 C 106 173 118 171 120 158 C 122 171 134 173 139 163 C 136 183 104 183 101 163 Z',
  mouthWSmall: 'M 106 164 C 110 168 118 167 120 159 C 122 167 130 168 134 164',
  mouthWDown: 'M 103 168 C 107 163 116 164 120 158 C 124 164 133 163 137 168',
  mouthOStem: 'M 120 158 L 120 163',

  heart: 'M 192 70 C 192 64 199 62 202 67 C 205 62 212 64 212 70 C 212 77 202 82 202 82 C 202 82 192 77 192 70 Z',
  /** Four-point star centred on (0,0), radius 9. */
  star: 'M0 -9 C1.5 -2 2 -1.5 9 0 C2 1.5 1.5 2 0 9 C-1.5 2 -2 1.5 -9 0 C-2 -1.5 -1.5 -2 0 -9Z',
} as const;

export const EYE = {
  natural: { cx: 89, cy: 134, r: 17.5 },
  shutter: { cx: 151, cy: 134, r: 17.5 },
  shutterHighlight: { cx: 147, cy: 130, r: 10 },
  /** The aperture blades are clipped to this circle so a wide aperture never spills out. */
  apertureClipR: 16,
  /** Pupil shine relative to the pupil centre. */
  shineOffset: { dx: 5, dy: -6.5 },
  lowerShine: { cx: 84.5, cy: 140, r: 1.8 },
} as const;

export const EXTRAS = {
  blush: [
    { cx: 76, cy: 160 },
    { cx: 164, cy: 160 },
  ],
  stars: [
    { x: 189, y: 71, size: 26 },
    { x: 46, y: 80, size: 20 },
  ],
  question: { x: 190, y: 80, fontSize: 34 },
  zz: [
    { x: 182, y: 78, fontSize: 22 },
    { x: 194, y: 62, fontSize: 16 },
  ],
} as const;

/** Simplified head for < 48 px: no whiskers, no inner ears or shine, chunkier strokes. */
export const MINI = {
  earLeft: PATHS.earLeft,
  earRight: PATHS.earRight,
  stem: 'M 120 72 L 120 52',
  leaves:
    'M 120 60 C 104 60 97 48 98 38 C 110 37 119 46 120 60 Z M 120 58 C 121 39 133 31 147 32 C 147 48 136 58 120 58 Z',
  head: PATHS.head,
  mask: PATHS.mask,
  wink: 'M 70 141 C 77 118 101 118 108 141',
  shutterHex: '151,125 159,129.5 159,138.5 151,143 143,138.5 143,129.5',
  nose: 'M 110 148 C 110 143 130 143 130 148 C 130 154 123 159 120 159 C 117 159 110 154 110 148 Z',
  leafFill: '#4FBF45',
} as const;
