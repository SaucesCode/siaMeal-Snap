/**
 * Sia Mascot SVG-to-Lottie Compiler & Rigging Engine (Bodymovin v5.7.4 Spec)
 *
 * Generates 5 native 60fps Lottie animations in assets/lottie/:
 *   1. sia-chef.json     (300 frames / 5.0s multi-act companion & culinary loop)
 *   2. sia-scanner.json  (300 frames / 5.0s AI vision laser scan & target lock loop)
 *   3. sia-water.json    (270 frames / 4.5s alternating paw splash & ripple loop)
 *   4. sia-walking.json  (60 frames  / 1.0s 4-beat lateral quadruped cat walk cycle)
 *   5. sia-logo.json     (240 frames / 4.0s expressive head avatar loop)
 *
 * Built around Disney's 12 Principles of Animation:
 * - True Parent-Child Bone Hierarchy (Torso -> Head -> Ears/Sprout/Eyes, Torso -> Tail)
 * - Bezier Path Morphing (S-curved tail wave, laser cone sweep, splash waves)
 * - Overlapping Action & Follow-Through (staggered 4-12 frame delays across joints)
 * - Anticipation, Squash & Stretch, and Natural Eye Blinks (zero spinning wheel eyes!)
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'lottie');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// ─── COLOR & EASING HELPERS ──────────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [
    Math.round(r * 1000) / 1000,
    Math.round(g * 1000) / 1000,
    Math.round(b * 1000) / 1000,
    1,
  ];
}

const EASE_IN_OUT = {
  i: { x: [0.45], y: [1] },
  o: { x: [0.55], y: [0] },
};

const EASE_OUT_SNAP = {
  i: { x: [0.22], y: [1] },
  o: { x: [0.36], y: [0] },
};

const EASE_IN_ANTICIPATE = {
  i: { x: [0.6], y: [1] },
  o: { x: [0.4], y: [0] },
};

const EASE_LINEAR = {
  i: { x: [0.5], y: [0.5] },
  o: { x: [0.5], y: [0.5] },
};

/**
 * Builds a spec-compliant Lottie keyframe array for 1D scalar properties (rotation, opacity).
 * Includes both `s` and `e` on each segment for universal iOS/Android/Web compatibility.
 */
function kf1D(stops) {
  const list = [];
  for (let idx = 0; idx < stops.length; idx++) {
    const cur = stops[idx];
    const next = stops[idx + 1];
    const ease = cur.ease || EASE_IN_OUT;
    if (next) {
      list.push({
        t: cur.t,
        s: [cur.v],
        e: [next.v],
        i: { x: ease.i.x, y: ease.i.y },
        o: { x: ease.o.x, y: ease.o.y },
      });
    } else {
      list.push({
        t: cur.t,
        s: [cur.v],
      });
    }
  }
  return { a: 1, k: list };
}

/**
 * Builds a spec-compliant Lottie keyframe array for 2D/3D vector properties (position, scale).
 */
function kfVec(stops, isScale = false) {
  const list = [];
  for (let idx = 0; idx < stops.length; idx++) {
    const cur = stops[idx];
    const next = stops[idx + 1];
    const ease = cur.ease || EASE_IN_OUT;
    const zVal = isScale ? 100 : 0;
    const sVec = [cur.v[0], cur.v[1], zVal];
    if (next) {
      const eVec = [next.v[0], next.v[1], zVal];
      const ix = ease.i.x[0];
      const iy = ease.i.y[0];
      const ox = ease.o.x[0];
      const oy = ease.o.y[0];
      const entry = {
        t: cur.t,
        s: sVec,
        e: eVec,
        i: isScale ? { x: [ix, ix, ix], y: [iy, iy, iy] } : { x: ix, y: iy },
        o: isScale ? { x: [ox, ox, ox], y: [oy, oy, oy] } : { x: ox, y: oy },
      };
      if (!isScale) {
        entry.ti = [0, 0, 0];
        entry.to = [0, 0, 0];
      }
      list.push(entry);
    } else {
      list.push({
        t: cur.t,
        s: sVec,
      });
    }
  }
  return { a: 1, k: list };
}

/**
 * Builds a spec-compliant Lottie keyframe array for morphing Bezier shape paths (`ty: "sh"`).
 */
function kfShape(stops) {
  const list = [];
  for (let idx = 0; idx < stops.length; idx++) {
    const cur = stops[idx];
    const next = stops[idx + 1];
    const ease = cur.ease || EASE_IN_OUT;
    const curShape = typeof cur.d === 'string' ? svgPathToLottieShape(cur.d, cur.closed) : cur.d;
    if (next) {
      const nextShape =
        typeof next.d === 'string' ? svgPathToLottieShape(next.d, next.closed) : next.d;
      list.push({
        t: cur.t,
        s: [curShape],
        e: [nextShape],
        i: { x: ease.i.x[0], y: ease.i.y[0] },
        o: { x: ease.o.x[0], y: ease.o.y[0] },
      });
    } else {
      list.push({
        t: cur.t,
        s: [curShape],
      });
    }
  }
  return { a: 1, k: list };
}

// ─── SVG PATH (`M`, `L`, `C`, `Q`, `Z`) TO LOTTIE BEZIER SHAPE PARSER ────────

function round2(n) {
  return Math.round(n * 100) / 100;
}

function svgPathToLottieShape(d, forceClosed) {
  const tokens = d
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/);

  const v = [];
  const i = [];
  const o = [];
  let closed = false;

  let idx = 0;
  let cmd = '';
  let curX = 0;
  let curY = 0;

  while (idx < tokens.length) {
    const tok = tokens[idx];
    if (/^[MLCQZmlcqz]$/.test(tok)) {
      cmd = tok;
      idx++;
      if (cmd === 'Z' || cmd === 'z') {
        closed = true;
        continue;
      }
    }

    if (cmd === 'M') {
      const x = parseFloat(tokens[idx++]);
      const y = parseFloat(tokens[idx++]);
      curX = x;
      curY = y;
      v.push([round2(x), round2(y)]);
      i.push([0, 0]);
      o.push([0, 0]);
      cmd = 'L';
    } else if (cmd === 'L') {
      const x = parseFloat(tokens[idx++]);
      const y = parseFloat(tokens[idx++]);
      curX = x;
      curY = y;
      v.push([round2(x), round2(y)]);
      i.push([0, 0]);
      o.push([0, 0]);
    } else if (cmd === 'C') {
      const x1 = parseFloat(tokens[idx++]);
      const y1 = parseFloat(tokens[idx++]);
      const x2 = parseFloat(tokens[idx++]);
      const y2 = parseFloat(tokens[idx++]);
      const x = parseFloat(tokens[idx++]);
      const y = parseFloat(tokens[idx++]);

      // Out-tangent on previous vertex (relative to previous vertex)
      if (o.length > 0) {
        const prevV = v[v.length - 1];
        o[o.length - 1] = [round2(x1 - prevV[0]), round2(y1 - prevV[1])];
      }

      // New vertex with in-tangent (relative to new vertex)
      v.push([round2(x), round2(y)]);
      i.push([round2(x2 - x), round2(y2 - y)]);
      o.push([0, 0]);
      curX = x;
      curY = y;
    } else if (cmd === 'Q') {
      const qx = parseFloat(tokens[idx++]);
      const qy = parseFloat(tokens[idx++]);
      const x = parseFloat(tokens[idx++]);
      const y = parseFloat(tokens[idx++]);

      // Degree elevation from Quadratic (cur, Q, end) to Cubic (cur, C1, C2, end)
      const c1x = curX + (2 / 3) * (qx - curX);
      const c1y = curY + (2 / 3) * (qy - curY);
      const c2x = x + (2 / 3) * (qx - x);
      const c2y = y + (2 / 3) * (qy - y);

      if (o.length > 0) {
        const prevV = v[v.length - 1];
        o[o.length - 1] = [round2(c1x - prevV[0]), round2(c1y - prevV[1])];
      }
      v.push([round2(x), round2(y)]);
      i.push([round2(c2x - x), round2(c2y - y)]);
      o.push([0, 0]);
      curX = x;
      curY = y;
    } else {
      throw new Error(`Unsupported SVG path command "${cmd}" in: ${d}`);
    }
  }

  // If path is closed and last vertex coincides with first vertex, merge tangent onto first vertex
  if ((closed || forceClosed) && v.length > 2) {
    const first = v[0];
    const last = v[v.length - 1];
    const dist = Math.hypot(first[0] - last[0], first[1] - last[1]);
    if (dist < 0.5) {
      i[0] = i[i.length - 1];
      v.pop();
      i.pop();
      o.pop();
    }
  }

  return {
    i,
    o,
    v,
    c: forceClosed !== undefined ? forceClosed : closed,
  };
}

function ellipseToLottieShape(cx, cy, rx, ry) {
  const k = 0.55228475;
  const ox = round2(rx * k);
  const oy = round2(ry * k);
  return {
    v: [
      [round2(cx), round2(cy - ry)],
      [round2(cx + rx), round2(cy)],
      [round2(cx), round2(cy + ry)],
      [round2(cx - rx), round2(cy)],
    ],
    i: [
      [-ox, 0],
      [0, -oy],
      [ox, 0],
      [0, oy],
    ],
    o: [
      [ox, 0],
      [0, oy],
      [-ox, 0],
      [0, -oy],
    ],
    c: true,
  };
}

function polygonToLottieShape(pointsStr, closed = true) {
  const pairs = pointsStr.trim().split(/\s+/);
  const v = [];
  const i = [];
  const o = [];
  for (const pair of pairs) {
    const [x, y] = pair.split(',').map(Number);
    v.push([round2(x), round2(y)]);
    i.push([0, 0]);
    o.push([0, 0]);
  }
  return { i, o, v, c: closed };
}

function lineToLottieShape(x1, y1, x2, y2) {
  return {
    v: [
      [round2(x1), round2(y1)],
      [round2(x2), round2(y2)],
    ],
    i: [
      [0, 0],
      [0, 0],
    ],
    o: [
      [0, 0],
      [0, 0],
    ],
    c: false,
  };
}

// ─── LOTTIE SHAPE GROUP BUILDERS ─────────────────────────────────────────────

const LINE_CAP_MAP = { butt: 1, round: 2, square: 3 };
const LINE_JOIN_MAP = { miter: 1, round: 2, bevel: 3 };

/**
 * Creates a Lottie Shape Group (`ty: "gr"`) from a geometry shape (`sh`) + optional fill & stroke.
 * Paint order: Stroke is placed BEFORE Fill in `it` so Lottie's bottom-to-top painter renders
 * Fill first and Stroke on top (matching SVG `paint-order: fill stroke`).
 */
function makeShapeGroup(name, shapeKs, opts = {}) {
  const {
    fill,
    fillOpacity = 100,
    stroke,
    strokeWidth = 4,
    strokeOpacity = 100,
    lineCap = 'round',
    lineJoin = 'round',
    tx = 0,
    ty = 0,
    rot = 0,
  } = opts;

  const it = [
    {
      ind: 0,
      ty: 'sh',
      nm: `${name} Path`,
      ks: shapeKs.a !== undefined ? shapeKs : { a: 0, k: shapeKs },
    },
  ];

  // Put stroke BEFORE fill so bottom-to-top painter draws fill first, stroke on top
  if (stroke && stroke !== 'none') {
    it.push({
      ty: 'st',
      nm: `${name} Stroke`,
      c: { a: 0, k: hexToRgb(stroke) },
      o: typeof strokeOpacity === 'object' ? strokeOpacity : { a: 0, k: strokeOpacity },
      w: { a: 0, k: strokeWidth },
      lc: LINE_CAP_MAP[lineCap] || 2,
      lj: LINE_JOIN_MAP[lineJoin] || 2,
      ml: 4,
    });
  }

  if (fill && fill !== 'none') {
    it.push({
      ty: 'fl',
      nm: `${name} Fill`,
      c: { a: 0, k: hexToRgb(fill) },
      o: typeof fillOpacity === 'object' ? fillOpacity : { a: 0, k: fillOpacity },
      r: 1,
    });
  }

  it.push({
    ty: 'tr',
    p: { a: 0, k: [tx, ty] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: rot },
    o: { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
  });

  return {
    ty: 'gr',
    nm: name,
    it,
  };
}

function svgPathGroup(name, d, opts = {}) {
  const closed = opts.closed !== undefined ? opts.closed : /Z\s*$/i.test(d.trim());
  return makeShapeGroup(name, svgPathToLottieShape(d, closed), opts);
}

function morphPathGroup(name, stops, opts = {}) {
  return makeShapeGroup(name, kfShape(stops), opts);
}

function ellipseGroup(name, cx, cy, rx, ry, opts = {}) {
  return makeShapeGroup(name, ellipseToLottieShape(cx, cy, rx, ry), opts);
}

function circleGroup(name, cx, cy, r, opts = {}) {
  return makeShapeGroup(name, ellipseToLottieShape(cx, cy, r, r), opts);
}

function polygonGroup(name, points, opts = {}) {
  return makeShapeGroup(name, polygonToLottieShape(points, true), opts);
}

function lineGroup(name, x1, y1, x2, y2, opts = {}) {
  return makeShapeGroup(name, lineToLottieShape(x1, y1, x2, y2), {
    ...opts,
    fill: 'none',
  });
}

/**
 * Creates a Lottie Shape Layer (`ty: 4`).
 * Note: `shapesInPainterOrder` is given in standard SVG bottom-to-top order (first item drawn first/behind,
 * last item drawn last/on top). We reverse it for Lottie's `shapes` array where index 0 is on top.
 */
function makeShapeLayer({
  ind,
  nm,
  parent,
  pivot = [120, 120],
  pos,
  scale,
  rot,
  opacity = 100,
  shapesInPainterOrder,
  op = 300,
}) {
  const pProp = pos ? pos : { a: 0, k: [pivot[0], pivot[1], 0] };
  const aProp = { a: 0, k: [pivot[0], pivot[1], 0] };
  const sProp = scale ? scale : { a: 0, k: [100, 100, 100] };
  const rProp = rot ? rot : { a: 0, k: 0 };
  const oProp = typeof opacity === 'object' ? opacity : { a: 0, k: opacity };

  const layer = {
    ddd: 0,
    ind,
    ty: 4,
    nm,
    sr: 1,
    ks: {
      o: oProp,
      r: rProp,
      p: pProp,
      a: aProp,
      s: sProp,
    },
    ao: 0,
    shapes: [...shapesInPainterOrder].reverse(),
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };

  if (parent !== undefined) {
    layer.parent = parent;
  }

  return layer;
}

/**
 * Helper: Builds the Stationary 6-Blade Emerald Camera Aperture Eye shapes (in SVG painter order).
 * Never spins like a pinwheel!
 */
function cameraEyeShapes(cx, cy, r = 12.5) {
  const hexR = round2(r * 0.46);
  const hX = round2(hexR * 0.866);
  const hY = round2(hexR * 0.5);
  const hexPoints = `${cx},${cy - hexR} ${cx + hX},${cy - hY} ${cx + hX},${cy + hY} ${cx},${cy + hexR} ${cx - hX},${cy + hY} ${cx - hX},${cy - hY}`;

  return [
    circleGroup('Cam Outer Ring', cx, cy, r + 1.5, { fill: '#141F1A' }),
    circleGroup('Cam Emerald Iris', cx, cy, r, { fill: '#22E592' }),
    circleGroup('Cam Mint Inner Glow', round2(cx - r * 0.18), round2(cy - r * 0.18), round2(r * 0.68), {
      fill: '#38F8A6',
      fillOpacity: 48,
    }),
    polygonGroup('Cam Hex Aperture', hexPoints, { fill: '#141F1A' }),
    lineGroup('Blade 1', cx, cy - hexR, round2(cx + r * 0.55), round2(cy - r * 0.82), {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    lineGroup('Blade 2', cx + hX, cy - hY, round2(cx + r * 0.95), cy, {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    lineGroup('Blade 3', cx + hX, cy + hY, round2(cx + r * 0.55), round2(cy + r * 0.82), {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    lineGroup('Blade 4', cx, cy + hexR, round2(cx - r * 0.55), round2(cy + r * 0.82), {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    lineGroup('Blade 5', cx - hX, cy + hY, round2(cx - r * 0.95), cy, {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    lineGroup('Blade 6', cx - hX, cy - hY, round2(cx - r * 0.55), round2(cy - r * 0.82), {
      stroke: '#141F1A',
      strokeWidth: 2.2,
    }),
    circleGroup('Cam Lens Glint', round2(cx - r * 0.35), round2(cy - r * 0.35), round2(r * 0.18), {
      fill: '#FFFFFF',
      fillOpacity: 92,
    }),
  ];
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GENERATE `sia-chef.json` (300 frames @ 60fps = 5.0s Multi-Act Loop)
// ═════════════════════════════════════════════════════════════════════════════
function buildSiaChef() {
  const OP = 300;

  // Back-to-Front layers (we will reverse at the end so frontmost is layers[0])
  const layersBackToFront = [
    // 1. S-Curved Tail & 3-Prong Silver Fork (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 30,
      nm: 'Chef Tail & Silver Fork',
      parent: 10,
      pivot: [150, 195],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 45, v: 3.2 },
        { t: 92, v: -2.5, ease: EASE_IN_ANTICIPATE },
        { t: 112, v: -5.5, ease: EASE_OUT_SNAP }, // Anticipation dip
        { t: 138, v: 9.5 }, // Joyful fork flourish upward!
        { t: 166, v: -3.0 }, // Follow-through wave
        { t: 198, v: 4.0 },
        { t: 245, v: -1.8 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        // Morphing S-curve tail base
        morphPathGroup(
          'Tail S-Curve',
          [
            {
              t: 0,
              d: 'M 146 194 C 184 192 174 156 178 134 C 180 120 198 118 198 131 C 198 142 186 146 188 162 C 190 182 180 198 152 201 Z',
            },
            {
              t: 75,
              d: 'M 146 194 C 181 190 171 154 176 132 C 178 118 196 116 196 129 C 196 140 184 145 186 161 C 188 181 178 197 152 201 Z',
            },
            {
              t: 138,
              d: 'M 146 194 C 187 193 177 158 181 135 C 183 121 201 120 200 133 C 200 144 188 148 190 163 C 192 183 182 199 152 201 Z',
            },
            {
              t: 220,
              d: 'M 146 194 C 182 191 172 155 177 133 C 179 119 197 117 197 130 C 197 141 185 146 187 161 C 189 181 179 198 152 201 Z',
            },
            {
              t: 300,
              d: 'M 146 194 C 184 192 174 156 178 134 C 180 120 198 118 198 131 C 198 142 186 146 188 162 C 190 182 180 198 152 201 Z',
            },
          ],
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Tail Tip',
          'M 179 132 C 182 124 198 122 200 132 C 201 140 185 142 179 132 Z',
          { fill: '#3D2820', stroke: '#2A1810', strokeWidth: 4 }
        ),
      ],
      op: OP,
    }),

    // 2. Root Torso, White Chef Apron & Hind Toe-Bean Feet (ind: 10)
    makeShapeLayer({
      ind: 10,
      nm: 'Chef Torso & Apron',
      pivot: [115, 203],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 45, v: [101.6, 98.6] }, // Soft inhale squash/stretch
          { t: 90, v: [100, 100] },
          { t: 108, v: [102.5, 97.4], ease: EASE_IN_ANTICIPATE }, // Anticipation crouch before fork wave
          { t: 132, v: [98.6, 101.8], ease: EASE_OUT_SNAP }, // Upward extension with flourish
          { t: 165, v: [100.8, 99.2] },
          { t: 210, v: [100, 100] },
          { t: 255, v: [101.4, 98.8] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        svgPathGroup(
          'Sitting Torso',
          'M 74 140 C 66 164 68 198 84 203 L 154 203 C 168 198 164 164 148 138 Z',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Chest Shadow',
          'M 88 136 C 102 146 124 146 140 136 L 136 154 L 92 154 Z',
          { fill: '#E5CDB4' }
        ),
        svgPathGroup(
          'Belly Patch',
          'M 94 154 C 112 162 126 162 134 154 L 130 196 C 114 200 102 200 96 196 Z',
          { fill: '#FFFDF9' }
        ),
        // Left Hind Foot with Pink Toe Beans
        ellipseGroup('Hind Foot L', 73, 194, 13, 12, {
          fill: '#4B3329',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
        ellipseGroup('Hind Pad L', 73, 198, 5.2, 4.2, { fill: '#A56E63' }),
        circleGroup('Bean L1', 67.5, 190.5, 2.3, { fill: '#A56E63' }),
        circleGroup('Bean L2', 73, 189, 2.3, { fill: '#A56E63' }),
        circleGroup('Bean L3', 78.5, 190.5, 2.3, { fill: '#A56E63' }),
        // Right Hind Foot with Pink Toe Beans
        ellipseGroup('Hind Foot R', 155, 194, 13, 12, {
          fill: '#4B3329',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
        ellipseGroup('Hind Pad R', 155, 198, 5.2, 4.2, { fill: '#A56E63' }),
        circleGroup('Bean R1', 149.5, 190.5, 2.3, { fill: '#A56E63' }),
        circleGroup('Bean R2', 155, 189, 2.3, { fill: '#A56E63' }),
        circleGroup('Bean R3', 160.5, 190.5, 2.3, { fill: '#A56E63' }),
      ],
      op: OP,
    }),

    // 3. Left & Right Front Paws (parented to Torso ind: 10, happy kneading during flourish)
    makeShapeLayer({
      ind: 11,
      nm: 'Left Front Paw',
      parent: 10,
      pivot: [98, 198],
      pos: kfVec([
        { t: 0, v: [98, 198] },
        { t: 115, v: [98, 198] },
        { t: 128, v: [98, 195] },
        { t: 142, v: [98, 198] },
        { t: 300, v: [98, 198] },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Paw',
          'M 90 193 C 90 186 106 186 106 193 L 106 202 C 106 207 90 207 90 202 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4 }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 12,
      nm: 'Right Front Paw',
      parent: 10,
      pivot: [126, 198],
      pos: kfVec([
        { t: 0, v: [126, 198] },
        { t: 128, v: [126, 198] },
        { t: 142, v: [126, 195] },
        { t: 156, v: [126, 198] },
        { t: 300, v: [126, 198] },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Paw',
          'M 118 193 C 118 186 134 186 134 193 L 134 202 C 134 207 118 207 118 202 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4 }
        ),
      ],
      op: OP,
    }),

    // 4. Left Ear (parented to Head ind: 20 — independent feline double-flick!)
    makeShapeLayer({
      ind: 21,
      nm: 'Left Ear',
      parent: 20,
      pivot: [84, 72],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 26, v: 0 },
        { t: 33, v: -8.5, ease: EASE_OUT_SNAP }, // Quick ear twitch 1
        { t: 40, v: -1.5 },
        { t: 47, v: -10.5, ease: EASE_OUT_SNAP }, // Quick ear twitch 2
        { t: 60, v: 0 },
        { t: 112, v: 2.5 },
        { t: 138, v: -5.0 },
        { t: 175, v: 0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Ear Outer',
          'M 59 92 C 55 62 60 39 69 36 C 78 34 94 50 102 64 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Left Ear Inner',
          'M 65 86 C 63 64 66 46 72 44 C 78 43 89 55 95 66 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),

    // 5. Right Ear (parented to Head ind: 20 — asymmetric perk on fork flourish)
    makeShapeLayer({
      ind: 22,
      nm: 'Right Ear',
      parent: 20,
      pivot: [136, 72],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 45, v: 1.5 },
        { t: 105, v: 0 },
        { t: 120, v: 8.0, ease: EASE_OUT_SNAP }, // Perks toward the silver fork!
        { t: 145, v: 3.0 },
        { t: 162, v: 9.0, ease: EASE_OUT_SNAP },
        { t: 190, v: 0 },
        { t: 245, v: -2.0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Ear Outer',
          'M 161 92 C 165 62 160 39 151 36 C 142 34 126 50 118 64 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Right Ear Inner',
          'M 155 86 C 157 64 154 46 148 44 C 142 43 131 55 125 66 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),

    // 6. Top Nutrition Sprout (parented to Head ind: 20 — delayed follow-through sway)
    makeShapeLayer({
      ind: 23,
      nm: 'Top Sprout',
      parent: 20,
      pivot: [110, 62],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 55, v: -3.5 },
        { t: 105, v: 3.0 },
        { t: 126, v: -7.5 }, // Delayed drag behind head tilt
        { t: 156, v: 8.5 }, // Overshoot sway
        { t: 192, v: -3.0 },
        { t: 235, v: 2.0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        lineGroup('Sprout Stem', 110, 64, 110, 46, {
          stroke: '#2A1810',
          strokeWidth: 4,
        }),
        svgPathGroup(
          'Sprout Leaf L',
          'M 110 49 C 98 50 93 42 94 35 C 102 34 109 39 110 49 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        svgPathGroup(
          'Sprout Leaf R',
          'M 110 49 C 111 38 119 32 128 33 C 128 43 121 50 110 49 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),

    // 7. Head Base, Siamese Mask, Nose, Mouth & Whiskers (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 20,
      nm: 'Chef Head & Mask',
      parent: 10,
      pivot: [110, 134],
      pos: kfVec([
        { t: 0, v: [110, 134] },
        { t: 50, v: [110, 132.5] }, // 5-frame delayed breathing nod
        { t: 95, v: [110, 134] },
        { t: 112, v: [110, 136] }, // Anticipation dip
        { t: 138, v: [110, 131.5] }, // Joyful lift
        { t: 195, v: [110, 134] },
        { t: 255, v: [110, 132.8] },
        { t: 300, v: [110, 134] },
      ]),
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 50, v: -1.6 },
        { t: 96, v: 0.8 },
        { t: 112, v: -2.4, ease: EASE_IN_ANTICIPATE }, // Anticipation tilt
        { t: 142, v: 4.5, ease: EASE_OUT_SNAP }, // Curious happy tilt toward fork
        { t: 182, v: 3.2 },
        { t: 225, v: -1.5 },
        { t: 268, v: 1.0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Head Oval', 110, 101, 54, 43, {
          fill: '#F7EBD6',
          stroke: '#2A1810',
          strokeWidth: 5,
        }),
        svgPathGroup(
          'Siamese Mask',
          'M 66 108 C 66 92 80 86 94 80 C 103 74 106 68 110 68 C 114 68 117 74 126 80 C 140 86 154 92 154 108 C 154 124 134 129 124 134 C 117 138 114 140 110 140 C 106 140 103 138 96 134 C 86 129 66 124 66 108 Z',
          { fill: '#4B3329' }
        ),
        svgPathGroup(
          'Nose',
          'M 105 113 C 105 110 115 110 115 113 C 115 117 110 119 110 119 Z',
          { fill: '#2A1810' }
        ),
        svgPathGroup(
          'Happy Mouth Open',
          'M 101 119 C 103 132 117 132 119 119 Z',
          { fill: '#331812', stroke: '#2A1810', strokeWidth: 3 }
        ),
        ellipseGroup('Pink Tongue', 110, 126, 5.5, 3.2, { fill: '#F77E8B' }),
        svgPathGroup(
          'Upper Lip W',
          'M 98 117 C 102 122 108 122 110 117 C 112 122 118 122 122 117',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 3.8, closed: false }
        ),
        lineGroup('Whisker L1', 47, 112, 64, 111, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker L2', 50, 121, 65, 117, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R1', 173, 112, 156, 111, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R2', 170, 121, 155, 117, { stroke: '#2A1810', strokeWidth: 4 }),
      ],
      op: OP,
    }),

    // 8. Left Glossy Teal Eye Base (parented to Head ind: 20 — natural single & double blinks!)
    makeShapeLayer({
      ind: 24,
      nm: 'Sitting Left Teal Eye Blink',
      parent: 20,
      pivot: [86, 103],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 60, v: [100, 100] },
          { t: 64, v: [103, 8], ease: EASE_OUT_SNAP }, // Blink 1 close
          { t: 69, v: [99, 104], ease: EASE_OUT_SNAP }, // Blink 1 open
          { t: 74, v: [100, 100] },
          { t: 170, v: [100, 100] },
          { t: 174, v: [103, 8], ease: EASE_OUT_SNAP }, // Double-blink 1 close
          { t: 178, v: [100, 100], ease: EASE_OUT_SNAP },
          { t: 182, v: [100, 100] },
          { t: 186, v: [103, 8], ease: EASE_OUT_SNAP }, // Double-blink 2 close
          { t: 191, v: [99, 103], ease: EASE_OUT_SNAP },
          { t: 196, v: [100, 100] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        ellipseGroup('Left Teal Iris', 86, 103, 12.5, 11.5, {
          fill: '#1FD4AE',
          stroke: '#2A1810',
          strokeWidth: 3.2,
        }),
        ellipseGroup('Left Pupil', 88, 104, 7.5, 8, { fill: '#084C41' }),
        circleGroup('Left Glint Big', 84, 99, 3.4, { fill: '#FFFFFF' }),
        circleGroup('Left Glint Small', 92, 108, 1.5, { fill: '#FFFFFF' }),
      ],
      op: OP,
    }),

    // 9. Stationary Right Camera Aperture Eye (parented to Head ind: 20 — subtle focus pulse, NEVER spins!)
    makeShapeLayer({
      ind: 25,
      nm: 'Sitting Camera Aperture Eye',
      parent: 20,
      pivot: [134, 103],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 45, v: [106, 106] },
          { t: 90, v: [100, 100] },
          { t: 174, v: [108, 108], ease: EASE_OUT_SNAP },
          { t: 210, v: [100, 100] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: cameraEyeShapes(134, 103, 12),
      op: OP,
    }),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: OP,
    w: 240,
    h: 240,
    nm: 'Sia Chef Companion',
    ddd: 0,
    assets: [],
    layers: layersBackToFront.reverse(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. GENERATE `sia-scanner.json` (300 frames @ 60fps = 5.0s AI Vision Scan Loop)
// ═════════════════════════════════════════════════════════════════════════════
function buildSiaScanner() {
  const OP = 300;

  const layersBackToFront = [
    // 1. S-Curved Siamese Tail (parented to Torso ind: 10, morphing S-wave)
    makeShapeLayer({
      ind: 30,
      nm: 'Scanner Tail Wave',
      parent: 10,
      pivot: [173, 140],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 55, v: 5.5 },
        { t: 115, v: -4.0 },
        { t: 165, v: 6.5 },
        { t: 230, v: -3.5 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        morphPathGroup(
          'Tail Path',
          [
            {
              t: 0,
              d: 'M 171 135 C 186 124 176 92 178 74 C 179 60 198 60 197 73 C 196 84 188 94 191 112 C 194 128 186 142 174 146 Z',
            },
            {
              t: 75,
              d: 'M 171 135 C 189 124 180 92 183 74 C 185 60 203 61 201 74 C 199 85 191 95 193 113 C 195 129 187 142 174 146 Z',
            },
            {
              t: 150,
              d: 'M 171 135 C 183 124 172 92 174 74 C 175 60 194 59 193 72 C 192 83 185 93 188 111 C 192 127 185 142 174 146 Z',
            },
            {
              t: 225,
              d: 'M 171 135 C 188 124 179 92 182 74 C 184 60 202 61 200 74 C 198 85 190 95 192 113 C 194 129 186 142 174 146 Z',
            },
            {
              t: 300,
              d: 'M 171 135 C 186 124 176 92 178 74 C 179 60 198 60 197 73 C 196 84 188 94 191 112 C 194 128 186 142 174 146 Z',
            },
          ],
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
      ],
      op: OP,
    }),

    // 2. Standing Body & 4 Sock Paws (ind: 10)
    makeShapeLayer({
      ind: 10,
      nm: 'Scanner Standing Body',
      pivot: [134, 190],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 50, v: [101.4, 98.8] }, // Hunter crouch anticipation
          { t: 105, v: [99.4, 100.8] },
          { t: 160, v: [101.8, 98.4] }, // Focus lock-on crouch
          { t: 225, v: [99.6, 100.5] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        svgPathGroup(
          'Far Back Leg',
          'M 142 162 L 142 184 C 142 192 155 192 155 184 L 155 162 Z',
          { fill: '#3D2820', stroke: '#2A1810', strokeWidth: 4.2 }
        ),
        svgPathGroup(
          'Standing Torso',
          'M 88 134 C 82 152 84 178 88 188 L 106 188 L 106 168 C 122 172 138 170 156 162 C 162 174 162 184 164 190 C 166 196 179 194 180 184 C 182 166 184 142 168 128 C 154 118 112 122 88 134 Z',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Front Left Leg',
          'M 122 165 L 122 191 C 122 200 140 200 140 191 L 140 165 Z',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Front Left Sock',
          'M 122 181 C 127 179 135 179 140 181 L 140 192 C 140 200 122 200 122 192 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.2 }
        ),
        svgPathGroup(
          'Back Right Sock',
          'M 164 176 C 169 174 176 174 180 176 L 180 187 C 180 195 164 195 164 187 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.2 }
        ),
      ],
      op: OP,
    }),

    // 3. Healthy Poke / Salad Bowl (Stationary on ground at bottom-left)
    makeShapeLayer({
      ind: 40,
      nm: 'Healthy Poke Bowl',
      pivot: [84, 185],
      shapesInPainterOrder: [
        svgPathGroup(
          'Kale & Lettuce',
          'M 48 175 C 44 164 53 156 61 162 C 63 153 74 152 79 160 C 86 151 98 153 101 162 C 109 156 119 162 117 173 L 120 176 L 46 176 Z',
          { fill: '#76C945', stroke: '#2A1810', strokeWidth: 3.8 }
        ),
        ellipseGroup('Boiled Egg', 88, 169, 10, 7, {
          fill: '#FAF8F0',
          stroke: '#2A1810',
          strokeWidth: 3,
        }),
        svgPathGroup(
          'Salmon Fillet',
          'M 88 177 C 92 165 108 164 116 171 C 118 176 112 182 94 182 Z',
          { fill: '#F97E52', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        svgPathGroup('Salmon Stripe 1', 'M 96 171 Q 102 174 104 179', {
          fill: 'none',
          stroke: '#FFD6C4',
          strokeWidth: 2,
          closed: false,
        }),
        svgPathGroup('Salmon Stripe 2', 'M 103 169 Q 109 172 111 177', {
          fill: 'none',
          stroke: '#FFD6C4',
          strokeWidth: 2,
          closed: false,
        }),
        circleGroup('Tomato 1', 77, 173, 5, {
          fill: '#E04848',
          stroke: '#2A1810',
          strokeWidth: 2.8,
        }),
        circleGroup('Tomato 2', 84, 177, 4.8, {
          fill: '#E04848',
          stroke: '#2A1810',
          strokeWidth: 2.8,
        }),
        circleGroup('Berry 1', 99, 182, 3.8, {
          fill: '#C82838',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
        circleGroup('Berry 2', 106, 181, 3.8, {
          fill: '#C82838',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
        svgPathGroup(
          'Avocado Half',
          'M 59 170 C 64 166 78 174 79 183 C 74 186 61 185 58 177 Z',
          { fill: '#C5E063', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        circleGroup('Avocado Pit', 69, 179, 4, {
          fill: '#5C3824',
          stroke: '#2A1810',
          strokeWidth: 2.2,
        }),
        svgPathGroup(
          'Ceramic Bowl',
          'M 45 174 C 46 196 64 205 84 205 C 104 205 122 196 123 174 C 106 184 62 184 45 174 Z',
          { fill: '#E2F2EA', stroke: '#2A1810', strokeWidth: 4.2 }
        ),
        svgPathGroup(
          'Bowl Shadow',
          'M 94 181 C 106 180 116 178 121 175 C 119 193 104 202 85 203 C 96 198 98 189 94 181 Z',
          { fill: '#94C2B0' }
        ),
      ],
      op: OP,
    }),

    // 4. Radar Left & Right Ears + Sprout (parented to Head ind: 20)
    makeShapeLayer({
      ind: 21,
      nm: 'Scanner Left Ear',
      parent: 20,
      pivot: [84, 68],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 40, v: -6.5, ease: EASE_OUT_SNAP },
        { t: 75, v: -2.0 },
        { t: 155, v: -8.0, ease: EASE_OUT_SNAP }, // Radar lock-on perk!
        { t: 190, v: 0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Ear Outer',
          'M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Left Ear Inner',
          'M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 22,
      nm: 'Scanner Right Ear',
      parent: 20,
      pivot: [136, 68],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 95, v: 5.0 },
        { t: 155, v: 7.5, ease: EASE_OUT_SNAP },
        { t: 210, v: -2.0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Ear Outer',
          'M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Right Ear Inner',
          'M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 23,
      nm: 'Scanner Sprout',
      parent: 20,
      pivot: [110, 60],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 65, v: -5.5 },
        { t: 145, v: 6.0 },
        { t: 225, v: -4.0 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        lineGroup('Stem', 110, 64, 110, 44, { stroke: '#2A1810', strokeWidth: 4 }),
        svgPathGroup(
          'Leaf L',
          'M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        svgPathGroup(
          'Leaf R',
          'M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),

    // 5. Head, Siamese Mask & Winking Eye (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 20,
      nm: 'Scanner Head',
      parent: 10,
      pivot: [110, 126],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 55, v: -3.2 }, // Pans left toward avocado
        { t: 120, v: 2.8 }, // Pans right toward salmon
        { t: 165, v: -0.8 }, // Locks onto center egg/macros
        { t: 215, v: -0.8 }, // Holds lock-on
        { t: 260, v: 1.8 },
        { t: 300, v: 0 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Head Oval', 110, 97, 54, 42, {
          fill: '#F7EBD6',
          stroke: '#2A1810',
          strokeWidth: 5,
        }),
        svgPathGroup(
          'Siamese Mask',
          'M 68 104 C 68 88 82 82 95 76 C 103 70 106 66 110 66 C 114 66 117 70 125 76 C 138 82 152 88 152 104 C 152 120 133 125 123 130 C 116 134 113 136 110 136 C 107 136 104 134 97 130 C 87 125 68 120 68 104 Z',
          { fill: '#4B3329' }
        ),
        svgPathGroup(
          'Winking Right Eye',
          'M 140 93 C 132 95 126 99 124 102 C 129 102 135 103 140 106',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 4.8, closed: false }
        ),
        svgPathGroup(
          'Nose',
          'M 104 109 C 104 106 114 106 114 109 C 114 113 109 115 109 115 Z',
          { fill: '#2A1810' }
        ),
        svgPathGroup(
          'Open Mouth',
          'M 100 115 C 102 128 116 128 118 115 Z',
          { fill: '#331812', stroke: '#2A1810', strokeWidth: 3 }
        ),
        ellipseGroup('Tongue', 109, 122, 5.2, 3, { fill: '#F77E8B' }),
        svgPathGroup(
          'Upper Lip',
          'M 97 113 C 101 118 107 118 109 113 C 111 118 117 118 121 113',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 3.8, closed: false }
        ),
        lineGroup('Whisker L1', 48, 108, 64, 107, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker L2', 51, 117, 65, 113, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R1', 172, 108, 156, 107, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R2', 169, 117, 155, 113, { stroke: '#2A1810', strokeWidth: 4 }),
      ],
      op: OP,
    }),

    // 6. Morphing Translucent Laser Scan Beam Cone (parented to Head ind: 20)
    makeShapeLayer({
      ind: 6,
      nm: 'Laser Scan Beam Cone',
      parent: 20,
      pivot: [85, 108],
      opacity: kf1D([
        { t: 0, v: 28 },
        { t: 60, v: 42 },
        { t: 120, v: 30 },
        { t: 165, v: 52 }, // Brightens on target lock!
        { t: 215, v: 48 },
        { t: 300, v: 28 },
      ]),
      shapesInPainterOrder: [
        morphPathGroup(
          'Scan Cone Polygon',
          [
            { t: 0, d: 'M 85 108 L 55 168 L 115 168 Z' },
            { t: 55, d: 'M 85 108 L 44 172 L 102 172 Z' }, // Sweeps left to avocado
            { t: 120, d: 'M 85 108 L 68 172 L 126 172 Z' }, // Sweeps right to salmon
            { t: 165, d: 'M 85 108 L 55 168 L 115 168 Z' }, // Locks onto center
            { t: 215, d: 'M 85 108 L 55 168 L 115 168 Z' },
            { t: 300, d: 'M 85 108 L 55 168 L 115 168 Z' },
          ],
          { fill: '#28F59C' }
        ),
      ],
      op: OP,
    }),

    // 7. Stationary 6-Blade Camera Shutter Eye (parented to Head ind: 20 — pulses focus, NEVER spins!)
    makeShapeLayer({
      ind: 25,
      nm: 'Stationary Camera Aperture Eye',
      parent: 20,
      pivot: [85, 99],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 55, v: [105, 105] },
          { t: 120, v: [97, 97] },
          { t: 160, v: [110, 110], ease: EASE_OUT_SNAP }, // Autofocus lock pulse!
          { t: 185, v: [100, 100] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: cameraEyeShapes(85, 99, 12.5),
      op: OP,
    }),

    // 8. Target Crosshair & Lock-On Reticle (sweeps across the poke bowl)
    makeShapeLayer({
      ind: 5,
      nm: 'Target Crosshair Reticle',
      pivot: [85, 145],
      pos: kfVec([
        { t: 0, v: [85, 145] },
        { t: 55, v: [73, 150] }, // Scans avocado
        { t: 120, v: [98, 150] }, // Scans salmon
        { t: 165, v: [85, 145], ease: EASE_OUT_SNAP }, // Locks onto center
        { t: 215, v: [85, 145] },
        { t: 260, v: [90, 148] },
        { t: 300, v: [85, 145] },
      ]),
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 155, v: [100, 100] },
          { t: 168, v: [118, 118], ease: EASE_OUT_SNAP }, // Target lock-on pulse!
          { t: 182, v: [93, 93], ease: EASE_OUT_SNAP },
          { t: 196, v: [100, 100] },
          { t: 300, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        lineGroup('Cross Top', 85, 122, 85, 139, { stroke: '#28F59C', strokeWidth: 3 }),
        lineGroup('Cross Bottom', 85, 151, 85, 168, { stroke: '#28F59C', strokeWidth: 3 }),
        lineGroup('Cross Left', 58, 145, 77, 145, { stroke: '#28F59C', strokeWidth: 3 }),
        lineGroup('Cross Right', 93, 145, 112, 145, { stroke: '#28F59C', strokeWidth: 3 }),
        circleGroup('Cross Center Dot', 85, 145, 3, { fill: '#28F59C' }),
      ],
      op: OP,
    }),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: OP,
    w: 240,
    h: 240,
    nm: 'Sia AI Vision Scanner',
    ddd: 0,
    assets: [],
    layers: layersBackToFront.reverse(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. GENERATE `sia-water.json` (270 frames @ 60fps = 4.5s Splash & Ripple Loop)
// ═════════════════════════════════════════════════════════════════════════════
function buildSiaWater() {
  const OP = 270;

  const layersBackToFront = [
    // 1. Wagging S-Curved Tail (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 30,
      nm: 'Water Wagging Tail',
      parent: 10,
      pivot: [170, 134],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 35, v: 8.5 },
        { t: 75, v: -6.0 },
        { t: 120, v: 9.0 },
        { t: 165, v: -6.5 },
        { t: 215, v: 7.0 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Wagging Tail',
          'M 168 128 C 186 116 175 84 180 68 C 184 56 202 59 199 72 C 196 84 188 92 190 108 C 192 122 184 134 173 138 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup('Wag Line 1', 'M 171 63 Q 168 72 170 81', {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 3,
          closed: false,
        }),
        svgPathGroup('Wag Line 2', 'M 206 71 Q 204 80 198 86', {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 3,
          closed: false,
        }),
      ],
      op: OP,
    }),

    // 2. Standing Torso & Back Right Paw (ind: 10)
    makeShapeLayer({
      ind: 10,
      nm: 'Water Torso',
      pivot: [136, 166],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 45, v: [102.2, 97.8], ease: EASE_OUT_SNAP }, // Left paw splash dip
          { t: 90, v: [99.2, 101.0] },
          { t: 135, v: [102.2, 97.8], ease: EASE_OUT_SNAP }, // Right paw splash dip
          { t: 185, v: [99.4, 100.8] },
          { t: 230, v: [101.2, 99.0] },
          { t: 270, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        svgPathGroup(
          'Back Right Foot',
          'M 168 156 L 176 184 C 179 194 162 196 159 186 L 154 162 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Cream Torso',
          'M 92 132 C 88 148 96 164 118 166 L 164 166 C 176 156 176 134 160 118 C 144 106 106 114 92 132 Z',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
      ],
      op: OP,
    }),

    // 3. Water Bowl Rim & Glowing Cyan Pool Surface (ind: 40)
    makeShapeLayer({
      ind: 40,
      nm: 'Water Basin & Pool',
      pivot: [112, 175],
      shapesInPainterOrder: [
        ellipseGroup('Outer Bowl Rim', 112, 173, 69, 20, {
          fill: '#F2F8FC',
          stroke: '#2A1810',
          strokeWidth: 4.5,
        }),
        ellipseGroup('Cyan Water Pool', 112, 175, 61, 14, {
          fill: '#2CE5F8',
          stroke: '#1E586B',
          strokeWidth: 2.5,
        }),
      ],
      op: OP,
    }),

    // 4. Expanding Concentric Water Ripples (Left & Right)
    makeShapeLayer({
      ind: 38,
      nm: 'Left Water Ripple',
      pivot: [86, 176],
      scale: kfVec(
        [
          { t: 0, v: [105, 105] },
          { t: 44, v: [65, 65] }, // Left paw hits water at frame 45
          { t: 120, v: [145, 130] }, // Expands outward across pool
          { t: 195, v: [85, 85] },
          { t: 270, v: [105, 105] },
        ],
        true
      ),
      opacity: kf1D([
        { t: 0, v: 55 },
        { t: 44, v: 95 },
        { t: 120, v: 15 },
        { t: 195, v: 75 },
        { t: 270, v: 55 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Ripple L', 86, 176, 18, 5, {
          fill: 'none',
          stroke: '#BFF8FF',
          strokeWidth: 2.2,
        }),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 39,
      nm: 'Right Water Ripple',
      pivot: [128, 177],
      scale: kfVec(
        [
          { t: 0, v: [85, 85] },
          { t: 90, v: [135, 125] },
          { t: 134, v: [65, 65] }, // Right paw hits water at frame 135
          { t: 215, v: [145, 130] }, // Expands outward across pool
          { t: 270, v: [85, 85] },
        ],
        true
      ),
      opacity: kf1D([
        { t: 0, v: 75 },
        { t: 90, v: 20 },
        { t: 134, v: 95 },
        { t: 215, v: 18 },
        { t: 270, v: 75 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Ripple R', 128, 177, 20, 5.5, {
          fill: 'none',
          stroke: '#BFF8FF',
          strokeWidth: 2.2,
        }),
      ],
      op: OP,
    }),

    // 5. Left & Right Splash Crown Waves (burst up on alternating paw taps)
    makeShapeLayer({
      ind: 36,
      nm: 'Left Splash Crown',
      pivot: [66, 173],
      scale: kfVec(
        [
          { t: 0, v: [92, 85] },
          { t: 38, v: [86, 78] },
          { t: 52, v: [112, 118], ease: EASE_OUT_SNAP }, // Left splash peak!
          { t: 95, v: [90, 82] },
          { t: 185, v: [104, 106] },
          { t: 270, v: [92, 85] },
        ],
        true
      ),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Splash Wave',
          'M 60 175 C 52 162 41 158 43 151 C 45 145 55 151 58 156 C 51 144 43 135 49 131 C 55 128 63 142 66 151 C 68 142 74 142 76 151 C 80 156 84 164 84 173 Z',
          { fill: '#6EEEFF', stroke: '#1E4B5C', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 37,
      nm: 'Right Splash Crown',
      pivot: [155, 173],
      scale: kfVec(
        [
          { t: 0, v: [95, 90] },
          { t: 90, v: [106, 108] },
          { t: 128, v: [86, 78] },
          { t: 144, v: [114, 120], ease: EASE_OUT_SNAP }, // Right splash peak!
          { t: 195, v: [90, 84] },
          { t: 270, v: [95, 90] },
        ],
        true
      ),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Splash Wave',
          'M 140 175 C 145 162 152 158 155 162 C 161 151 169 144 174 148 C 178 152 168 162 165 166 C 171 164 176 168 171 173 C 166 177 152 179 140 175 Z',
          { fill: '#6EEEFF', stroke: '#1E4B5C', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),

    // 6. Alternating Front Left & Right Splash Paws (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 11,
      nm: 'Front Left Splash Leg',
      parent: 10,
      pivot: [98, 142],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 28, v: 7.5, ease: EASE_IN_ANTICIPATE }, // Lifts paw up before splash
        { t: 45, v: -6.5, ease: EASE_OUT_SNAP }, // Slaps water surface!
        { t: 75, v: 2.0 },
        { t: 170, v: 5.5 },
        { t: 190, v: -4.0, ease: EASE_OUT_SNAP },
        { t: 230, v: 0 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Front Left Leg',
          'M 91 134 L 78 164 C 75 173 91 177 96 168 L 108 147',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5, closed: false }
        ),
        svgPathGroup(
          'Front Left Paw',
          'M 79 156 C 85 153 94 156 98 162 L 95 171 C 89 176 75 173 77 164 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4 }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 12,
      nm: 'Front Right Splash Leg',
      parent: 10,
      pivot: [138, 144],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 65, v: -2.5 },
        { t: 115, v: -8.0, ease: EASE_IN_ANTICIPATE }, // Lifts right paw up
        { t: 135, v: 6.5, ease: EASE_OUT_SNAP }, // Slaps water surface!
        { t: 170, v: -2.0 },
        { t: 225, v: 4.5 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Front Right Leg',
          'M 129 144 L 120 169 C 118 178 134 181 138 172 L 148 144',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5, closed: false }
        ),
        svgPathGroup(
          'Front Right Paw',
          'M 122 159 C 128 157 137 160 141 165 L 138 174 C 132 180 118 177 120 168 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4 }
        ),
      ],
      op: OP,
    }),

    // 7. Ceramic Bowl Front Body (occludes lower paws inside the basin!)
    makeShapeLayer({
      ind: 4,
      nm: 'Bowl Front Ceramic Lip',
      pivot: [112, 193],
      shapesInPainterOrder: [
        svgPathGroup(
          'Bowl Front Body',
          'M 43 173 C 46 202 74 214 112 214 C 150 214 178 202 181 173 C 162 188 62 188 43 173 Z',
          { fill: '#F2F8FC', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Bowl Front Shadow',
          'M 136 185 C 156 183 171 179 179 174 C 175 198 150 210 116 211 C 130 205 138 196 136 185 Z',
          { fill: '#BBD2E0' }
        ),
      ],
      op: OP,
    }),

    // 8. Ears & Sprout (parented to Head ind: 20)
    makeShapeLayer({
      ind: 21,
      nm: 'Water Left Ear',
      parent: 20,
      pivot: [84, 68],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 50, v: -8.0, ease: EASE_OUT_SNAP },
        { t: 95, v: 2.0 },
        { t: 145, v: 5.5 },
        { t: 200, v: -5.0 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Ear Outer',
          'M 60 88 C 56 58 61 36 70 33 C 79 31 95 48 103 62 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Left Ear Inner',
          'M 66 82 C 64 60 67 43 73 41 C 79 40 90 52 96 63 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 22,
      nm: 'Water Right Ear',
      parent: 20,
      pivot: [136, 68],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 50, v: -4.5 },
        { t: 140, v: 8.5, ease: EASE_OUT_SNAP },
        { t: 195, v: -2.0 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Ear Outer',
          'M 159 88 C 163 58 158 36 149 33 C 140 31 124 48 116 62 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Right Ear Inner',
          'M 153 82 C 155 60 152 43 146 41 C 140 40 129 52 123 63 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 23,
      nm: 'Water Sprout',
      parent: 20,
      pivot: [110, 56],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 55, v: -7.5 },
        { t: 145, v: 8.0 },
        { t: 215, v: -4.5 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        lineGroup('Stem', 110, 56, 110, 44, { stroke: '#2A1810', strokeWidth: 4 }),
        svgPathGroup(
          'Leaf L',
          'M 110 47 C 98 48 93 40 94 33 C 102 32 109 37 110 47 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        svgPathGroup(
          'Leaf R',
          'M 110 47 C 111 36 119 30 128 31 C 128 41 121 48 110 47 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),

    // 9. Head & Joyful Squinting Aqua Eyes (parented to Torso ind: 10)
    makeShapeLayer({
      ind: 20,
      nm: 'Water Head & Joyful Eyes',
      parent: 10,
      pivot: [110, 126],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 48, v: -3.8, ease: EASE_OUT_SNAP }, // Tilts toward left splash!
        { t: 95, v: 1.2 },
        { t: 138, v: 4.0, ease: EASE_OUT_SNAP }, // Tilts toward right splash!
        { t: 195, v: -2.0 },
        { t: 270, v: 0 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Head Oval', 110, 97, 54, 42, {
          fill: '#F7EBD6',
          stroke: '#2A1810',
          strokeWidth: 5,
        }),
        svgPathGroup(
          'Siamese Mask',
          'M 66 104 C 66 88 80 82 94 76 C 103 70 106 66 110 66 C 114 66 117 70 126 76 C 140 82 154 88 154 104 C 154 120 134 125 124 130 C 117 134 114 136 110 136 C 106 136 103 134 96 130 C 86 125 66 120 66 104 Z',
          { fill: '#4B3329' }
        ),
        svgPathGroup(
          'Left Squinting Aqua Eye',
          'M 74 102 C 79 93 90 94 95 103 C 88 100 80 100 74 102 Z',
          { fill: '#1FE0BA', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        circleGroup('Left Eye Glint', 82, 98, 2, { fill: '#FFFFFF' }),
        svgPathGroup(
          'Right Squinting Aqua Eye',
          'M 122 103 C 127 94 138 93 143 102 C 137 100 129 100 122 103 Z',
          { fill: '#1FE0BA', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        circleGroup('Right Eye Glint', 129, 98, 2, { fill: '#FFFFFF' }),
        svgPathGroup(
          'Nose',
          'M 104 109 C 104 106 114 106 114 109 C 114 113 109 115 109 115 Z',
          { fill: '#2A1810' }
        ),
        svgPathGroup(
          'Happy Mouth',
          'M 99 114 C 101 129 117 129 119 114 Z',
          { fill: '#331812', stroke: '#2A1810', strokeWidth: 3 }
        ),
        ellipseGroup('Tongue', 109, 122, 5.5, 3.2, { fill: '#F77E8B' }),
        svgPathGroup(
          'Upper Lip',
          'M 96 112 C 100 117 107 117 109 112 C 111 117 118 117 122 112',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 3.8, closed: false }
        ),
        lineGroup('Whisker L1', 48, 108, 64, 107, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker L2', 51, 117, 65, 113, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R1', 172, 108, 156, 107, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R2', 169, 117, 155, 113, { stroke: '#2A1810', strokeWidth: 4 }),
      ],
      op: OP,
    }),

    // 10. Flying Water Droplets & Cyan Sparkles (arc upward with gravity easing)
    makeShapeLayer({
      ind: 3,
      nm: 'Flying Water Droplets',
      pivot: [120, 130],
      pos: kfVec([
        { t: 0, v: [120, 132] },
        { t: 45, v: [120, 135] },
        { t: 68, v: [120, 121], ease: EASE_OUT_SNAP }, // Left splash droplets arc high!
        { t: 105, v: [120, 134] },
        { t: 135, v: [120, 135] },
        { t: 162, v: [120, 120], ease: EASE_OUT_SNAP }, // Right splash droplets arc high!
        { t: 210, v: [120, 134] },
        { t: 270, v: [120, 132] },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Drop L1',
          'M 35 117 C 40 115 44 122 41 126 C 38 129 31 123 35 117 Z',
          { fill: '#6EEEFF', stroke: '#2A1810', strokeWidth: 2.8 }
        ),
        svgPathGroup(
          'Drop L2',
          'M 28 134 C 34 133 39 140 36 144 C 32 147 24 140 28 134 Z',
          { fill: '#6EEEFF', stroke: '#2A1810', strokeWidth: 2.8 }
        ),
        circleGroup('Drop L3', 33, 159, 3.5, {
          fill: '#6EEEFF',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
        svgPathGroup(
          'Drop R1',
          'M 202 138 C 196 138 192 145 195 149 C 199 151 206 144 202 138 Z',
          { fill: '#6EEEFF', stroke: '#2A1810', strokeWidth: 2.8 }
        ),
        circleGroup('Drop R2', 195, 131, 3.2, {
          fill: '#6EEEFF',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
        circleGroup('Drop R3', 196, 160, 3.2, {
          fill: '#6EEEFF',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
        svgPathGroup(
          'Sparkle L',
          'M 41 96 L 43 101 L 48 103 L 43 105 L 41 110 L 39 105 L 34 103 L 39 101 Z',
          { fill: '#7CE8F8' }
        ),
        svgPathGroup(
          'Sparkle R',
          'M 204 111 L 206 115 L 210 117 L 206 119 L 204 123 L 202 119 L 198 117 L 202 115 Z',
          { fill: '#7CE8F8' }
        ),
      ],
      op: OP,
    }),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: OP,
    w: 240,
    h: 240,
    nm: 'Sia Hydration Splash',
    ddd: 0,
    assets: [],
    layers: layersBackToFront.reverse(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. GENERATE `sia-walking.json` (120 frames @ 60fps = 2.0s 2-Stride Quadruped Gait)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Builds morphing Bezier path keyframes for a quadruped cat leg with:
 * 1. Seamless upper haunch/shoulder attachment (unstroked cream fill + open U-outline for Near legs
 *    so the leg blends into the torso with zero horizontal seam line!)
 * 2. Tapered feline thigh/shoulder -> slender wrist/ankle -> forward-facing rounded mitten paw (+4.6px toe).
 * 3. Smooth 5-pose feline gait (Contact -> Down -> Mid-Stance -> Push-Off -> Passing Bent-Knee Lift).
 */
function buildMorphingCatLeg(hipX, isNear, isHind, phaseFrames, totalFrames = 120, strideFrames = 60) {
  // Wider upper haunch/shoulder tapering to slender ankle
  const topW = isHind ? (isNear ? 9.8 : 8.6) : isNear ? 8.8 : 8.0;
  const ankleW = isNear ? 5.8 : 5.4;
  const pawForwardToe = 4.6; // Forward-facing toe protrusion toward +X (walking right)
  const pawBackHeel = 5.4;

  const fillTopY = isNear ? 148 : 153;
  const strokeTopY = isNear ? 156 : 154;
  const groundY = isNear ? 189.0 : 187.0; // Far legs sit 2px higher in 3/4 perspective

  // 5 anatomical feline gait poses across one 60-frame stride:
  // 0: Contact (forward reach), 12: Down (weight absorb), 23: Mid-stance, 34: Push-off (rear extension), 47: Passing (bent-knee lift)
  const poses = [
    { dt: 0, kneeDx: 3.4, kneeY: 169.5, footDx: 7.2, footY: groundY - 0.5, toeDrop: 0.0 },
    { dt: 12, kneeDx: 2.2, kneeY: 170.5, footDx: 2.6, footY: groundY, toeDrop: 0.0 },
    { dt: 23, kneeDx: -0.8, kneeY: 170.5, footDx: -2.4, footY: groundY, toeDrop: 0.0 },
    { dt: 34, kneeDx: -3.4, kneeY: 169.5, footDx: -7.2, footY: groundY - 0.5, toeDrop: 0.5 },
    { dt: 47, kneeDx: 3.8, kneeY: 166.5, footDx: -0.2, footY: groundY - 9.5, toeDrop: 2.2 },
  ];

  function samplePose(f) {
    const localF = ((f - phaseFrames) % strideFrames + strideFrames) % strideFrames;
    for (let k = 0; k < poses.length; k++) {
      const p0 = poses[k];
      const p1 = poses[(k + 1) % poses.length];
      const t0 = p0.dt;
      const t1 = k === poses.length - 1 ? strideFrames : p1.dt;
      if (localF >= t0 && localF <= t1) {
        const u = (localF - t0) / (t1 - t0);
        const s =
          k >= 3
            ? 0.5 - 0.5 * Math.cos(u * Math.PI)
            : u * 0.35 + (0.5 - 0.5 * Math.cos(u * Math.PI)) * 0.65;
        return {
          kneeDx: p0.kneeDx + (p1.kneeDx - p0.kneeDx) * s,
          kneeY: p0.kneeY + (p1.kneeY - p0.kneeY) * s,
          footDx: p0.footDx + (p1.footDx - p0.footDx) * s,
          footY: p0.footY + (p1.footY - p0.footY) * s,
          toeDrop: p0.toeDrop + (p1.toeDrop - p0.toeDrop) * s,
        };
      }
    }
    return poses[0];
  }

  const upperFillStops = [];
  const upperOutlineStops = [];
  const sockStops = [];

  for (let t = 0; t <= totalFrames; t += 5) {
    const { kneeDx, kneeY, footDx, footY, toeDrop } = samplePose(t);

    // Upper hip/shoulder coordinates (slightly shifts with stride for natural scapula/haunch roll)
    const hipShiftX = round2(footDx * 0.18);
    const hlX = round2(hipX - topW + hipShiftX);
    const hrX = round2(hipX + topW + hipShiftX);

    // Mid-leg (knee/wrist) coordinates
    const midW = round2((topW + ankleW) * 0.5);
    const klX = round2(hipX - midW + kneeDx * 0.8);
    const krX = round2(hipX + midW + kneeDx * 1.1);
    const kY = round2(kneeY);

    // Ankle coordinates (where the dark Siamese sock starts)
    const sockTopY = round2(footY - 11.0);
    const ankleDx = round2(footDx * 0.72 + kneeDx * 0.28);
    const alX = round2(hipX - ankleW + ankleDx);
    const arX = round2(hipX + ankleW + ankleDx);

    // Paw base coordinates (flared forward toe for cute mitten paw silhouette)
    const heelX = round2(hipX - pawBackHeel + footDx);
    const toeX = round2(hipX + ankleW + pawForwardToe + footDx);
    const heelY = round2(footY);
    const toeY = round2(footY + toeDrop);
    const pawTopY = round2(footY - 5.2);

    // 1. Seamless Upper Leg Fill (closed shape extending up into torso at fillTopY)
    const upperFillD = [
      `M ${hlX} ${fillTopY}`,
      `C ${hlX} ${round2((fillTopY + kY) * 0.5)} ${klX} ${kY} ${alX} ${ round2(sockTopY + 3) }`,
      `L ${arX} ${round2(sockTopY + 3)}`,
      `C ${krX} ${kY} ${hrX} ${round2((fillTopY + kY) * 0.5)} ${hrX} ${fillTopY}`,
      `Z`,
    ].join(' ');

    // 2. Open U-Shaped Side Outline for Upper Leg (no horizontal line across top of thigh/shoulder!)
    const slTopX = round2(hipX - topW * 0.92 + hipShiftX);
    const srTopX = round2(hipX + topW * 0.92 + hipShiftX);
    const upperOutlineD = [
      `M ${slTopX} ${strokeTopY}`,
      `C ${slTopX} ${round2((strokeTopY + kY) * 0.52)} ${klX} ${kY} ${alX} ${round2(sockTopY + 2)}`,
      `L ${arX} ${round2(sockTopY + 2)}`,
      `C ${krX} ${kY} ${srTopX} ${round2((strokeTopY + kY) * 0.52)} ${srTopX} ${strokeTopY}`,
    ].join(' ');

    // 3. Dark Siamese Sock & Forward-Facing Mitten Paw (4 smooth cubic curves)
    const sockD = [
      `M ${alX} ${sockTopY}`,
      `C ${alX} ${pawTopY} ${heelX} ${ round2(heelY - 3.5) } ${heelX} ${heelY}`,
      `C ${heelX} ${round2(heelY + 3.2)} ${toeX} ${round2(toeY + 3.2)} ${toeX} ${round2(toeY - 1.2)}`,
      `C ${toeX} ${round2(pawTopY - 0.8)} ${arX} ${round2(pawTopY - 1.2)} ${arX} ${sockTopY}`,
      `C ${round2(hipX + ankleW * 0.35 + ankleDx)} ${round2(sockTopY - 1.6)} ${round2(hipX - ankleW * 0.35 + ankleDx)} ${round2(sockTopY - 1.6)} ${alX} ${sockTopY} Z`,
    ].join(' ');

    upperFillStops.push({ t, d: upperFillD, closed: true, ease: EASE_LINEAR });
    upperOutlineStops.push({ t, d: upperOutlineD, closed: false, ease: EASE_LINEAR });
    sockStops.push({ t, d: sockD, closed: true, ease: EASE_LINEAR });
  }

  return { upperFillStops, upperOutlineStops, sockStops };
}

function buildSiaWalking() {
  const OP = 120; // 2 full 60-frame strides @ 60fps = 2.0s non-repetitive loop

  // 4-Beat Lateral Gait Footfall Offsets (Hind -> Fore on same side, then opposite side):
  const nearHind = buildMorphingCatLeg(80, true, true, 0, OP, 60);
  const nearFore = buildMorphingCatLeg(134, true, false, 14, OP, 60);
  const farHind = buildMorphingCatLeg(68, false, true, 30, OP, 60);
  const farFore = buildMorphingCatLeg(120, false, false, 44, OP, 60);

  const layersBackToFront = [
    // 1. Far Hind Leg (BEHIND Torso, parented to Torso ind: 10, phase 30)
    makeShapeLayer({
      ind: 50,
      nm: 'Walk Far Hind Leg',
      parent: 10,
      pivot: [68, 154],
      shapesInPainterOrder: [
        morphPathGroup('Far Hind Upper Leg', farHind.upperFillStops, {
          fill: '#E5CDB4',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
        morphPathGroup('Far Hind Sock Paw', farHind.sockStops, {
          fill: '#3D2820',
          stroke: '#2A1810',
          strokeWidth: 4,
        }),
      ],
      op: OP,
    }),

    // 2. Far Fore Leg (BEHIND Torso, parented to Torso ind: 10, phase 44)
    makeShapeLayer({
      ind: 48,
      nm: 'Walk Far Fore Leg',
      parent: 10,
      pivot: [120, 154],
      shapesInPainterOrder: [
        morphPathGroup('Far Fore Upper Leg', farFore.upperFillStops, {
          fill: '#E5CDB4',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
        morphPathGroup('Far Fore Sock Paw', farFore.sockStops, {
          fill: '#3D2820',
          stroke: '#2A1810',
          strokeWidth: 4,
        }),
      ],
      op: OP,
    }),

    // 3. S-Curved Siamese Tail (BEHIND Torso, parented to Torso ind: 10 — morphs S-wave with follow-through)
    makeShapeLayer({
      ind: 30,
      nm: 'Walk S-Wave Tail',
      parent: 10,
      pivot: [64, 150],
      rot: kf1D([
        { t: 0, v: -3.0 },
        { t: 15, v: 5.0 },
        { t: 30, v: -3.8 },
        { t: 45, v: 4.5 },
        { t: 60, v: -3.0 },
        { t: 75, v: 5.2 },
        { t: 90, v: -3.8 },
        { t: 105, v: 4.5 },
        { t: 120, v: -3.0 },
      ]),
      shapesInPainterOrder: [
        morphPathGroup(
          'Tail S-Wave',
          [
            {
              t: 0,
              d: 'M 68 146 C 40 138 46 106 40 86 C 36 72 20 76 24 90 C 28 104 36 114 34 130 C 32 144 44 155 64 156 Z',
            },
            {
              t: 30,
              d: 'M 68 146 C 43 135 50 103 45 83 C 41 69 25 72 28 86 C 31 100 39 111 37 127 C 35 141 45 154 64 156 Z',
            },
            {
              t: 60,
              d: 'M 68 146 C 38 140 43 108 37 88 C 33 74 17 78 21 92 C 25 106 34 116 32 132 C 30 146 43 156 64 156 Z',
            },
            {
              t: 90,
              d: 'M 68 146 C 43 135 50 103 45 83 C 41 69 25 72 28 86 C 31 100 39 111 37 127 C 35 141 45 154 64 156 Z',
            },
            {
              t: 120,
              d: 'M 68 146 C 40 138 46 106 40 86 C 36 72 20 76 24 90 C 28 104 36 114 34 130 C 32 144 44 155 64 156 Z',
            },
          ],
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
      ],
      op: OP,
    }),

    // 4. Feline Torso (Core Body ind: 10 — 2-step vertical cushion + spine flex scale)
    makeShapeLayer({
      ind: 10,
      nm: 'Walk Torso',
      pivot: [104, 152],
      pos: kfVec([
        { t: 0, v: [104, 151.2] },
        { t: 9, v: [104, 153.6] }, // Step 1 Down recoil
        { t: 23, v: [104, 150.4] }, // Step 1 Up arch
        { t: 39, v: [104, 153.6] }, // Step 2 Down recoil
        { t: 53, v: [104, 150.4] }, // Step 2 Up arch
        { t: 60, v: [104, 151.2] },
        { t: 69, v: [104, 153.6] }, // Step 3 Down recoil
        { t: 83, v: [104, 150.4] }, // Step 3 Up arch
        { t: 99, v: [104, 153.6] }, // Step 4 Down recoil
        { t: 113, v: [104, 150.4] }, // Step 4 Up arch
        { t: 120, v: [104, 151.2] },
      ]),
      scale: kfVec(
        [
          { t: 0, v: [100.8, 99.4] },
          { t: 9, v: [99.2, 100.8] },
          { t: 23, v: [101.2, 99.0] },
          { t: 39, v: [99.2, 100.8] },
          { t: 53, v: [101.2, 99.0] },
          { t: 69, v: [99.2, 100.8] },
          { t: 83, v: [101.2, 99.0] },
          { t: 99, v: [99.2, 100.8] },
          { t: 113, v: [101.2, 99.0] },
          { t: 120, v: [100.8, 99.4] },
        ],
        true
      ),
      rot: kf1D([
        { t: 0, v: -1.0 },
        { t: 15, v: 1.2 },
        { t: 30, v: -1.0 },
        { t: 45, v: 1.2 },
        { t: 60, v: -1.0 },
        { t: 75, v: 1.2 },
        { t: 90, v: -1.0 },
        { t: 105, v: 1.2 },
        { t: 120, v: -1.0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Feline Torso',
          'M 58 144 C 55 158 63 167 80 167 L 136 167 C 152 166 158 150 148 134 C 134 120 72 120 58 144 Z',
          { fill: '#F7EBD6', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
      ],
      op: OP,
    }),

    // 5. Near Hind Leg (IN FRONT of Torso — seamless haunch fill + open U outline + forward mitten paw)
    makeShapeLayer({
      ind: 15,
      nm: 'Walk Near Hind Leg',
      parent: 10,
      pivot: [80, 152],
      shapesInPainterOrder: [
        morphPathGroup('Near Hind Seamless Haunch Fill', nearHind.upperFillStops, {
          fill: '#F7EBD6',
          stroke: 'none',
        }),
        morphPathGroup('Near Hind Side Outline', nearHind.upperOutlineStops, {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 4.4,
        }),
        morphPathGroup('Near Hind Sock Mitten Paw', nearHind.sockStops, {
          fill: '#4B3329',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
      ],
      op: OP,
    }),

    // 6. Near Fore Leg (IN FRONT of Torso — seamless shoulder fill + open U outline + forward mitten paw)
    makeShapeLayer({
      ind: 14,
      nm: 'Walk Near Fore Leg',
      parent: 10,
      pivot: [134, 152],
      shapesInPainterOrder: [
        morphPathGroup('Near Fore Seamless Shoulder Fill', nearFore.upperFillStops, {
          fill: '#F7EBD6',
          stroke: 'none',
        }),
        morphPathGroup('Near Fore Side Outline', nearFore.upperOutlineStops, {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 4.4,
        }),
        morphPathGroup('Near Fore Sock Mitten Paw', nearFore.sockStops, {
          fill: '#4B3329',
          stroke: '#2A1810',
          strokeWidth: 4.2,
        }),
      ],
      op: OP,
    }),

    // 7. Emerald Collar & Dangling Tag (IN FRONT of shoulder, parented to Torso ind: 10)
    makeShapeLayer({
      ind: 9,
      nm: 'Walk Collar & Tag Pendulum',
      parent: 10,
      pivot: [139, 144],
      rot: kf1D([
        { t: 0, v: 6 },
        { t: 14, v: -8 },
        { t: 29, v: 7 },
        { t: 44, v: -8 },
        { t: 60, v: 6 },
        { t: 74, v: -8 },
        { t: 89, v: 7 },
        { t: 104, v: -8 },
        { t: 120, v: 6 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup('Emerald Collar', 'M 118 134 C 126 146 138 150 149 142', {
          fill: 'none',
          stroke: '#10B981',
          strokeWidth: 5,
          closed: false,
        }),
        circleGroup('Collar Tag', 139, 148, 5, {
          fill: '#28F59C',
          stroke: '#2A1810',
          strokeWidth: 2.5,
        }),
      ],
      op: OP,
    }),

    // 8. Ears & Sprout (parented to Head ind: 20 — delayed bobbing on footfalls)
    makeShapeLayer({
      ind: 21,
      nm: 'Walk Left Ear',
      parent: 20,
      pivot: [102, 62],
      rot: kf1D([
        { t: 0, v: 1.8 },
        { t: 13, v: -4.0 },
        { t: 28, v: 2.2 },
        { t: 43, v: -4.0 },
        { t: 60, v: 1.8 },
        { t: 73, v: -4.5 },
        { t: 88, v: 2.2 },
        { t: 103, v: -4.0 },
        { t: 120, v: 1.8 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Ear Outer',
          'M 80 86 C 76 56 81 34 90 31 C 99 29 115 46 123 60 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Left Ear Inner',
          'M 86 80 C 84 58 87 41 93 39 C 99 38 110 50 116 61 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 22,
      nm: 'Walk Right Ear',
      parent: 20,
      pivot: [156, 62],
      rot: kf1D([
        { t: 0, v: -1.8 },
        { t: 13, v: 4.0 },
        { t: 28, v: -2.2 },
        { t: 43, v: 4.0 },
        { t: 60, v: -1.8 },
        { t: 73, v: 4.5 },
        { t: 88, v: -2.2 },
        { t: 103, v: 4.0 },
        { t: 120, v: -1.8 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Ear Outer',
          'M 179 86 C 183 56 178 34 169 31 C 160 29 144 46 136 60 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 5 }
        ),
        svgPathGroup(
          'Right Ear Inner',
          'M 173 80 C 175 58 172 41 166 39 C 160 38 149 50 143 61 Z',
          { fill: '#7D5243' }
        ),
      ],
      op: OP,
    }),
    makeShapeLayer({
      ind: 23,
      nm: 'Walk Sprout',
      parent: 20,
      pivot: [130, 62],
      rot: kf1D([
        { t: 0, v: 3.0 },
        { t: 15, v: -5.0 },
        { t: 30, v: 3.5 },
        { t: 45, v: -5.0 },
        { t: 60, v: 3.0 },
        { t: 75, v: -5.0 },
        { t: 90, v: 3.5 },
        { t: 105, v: -5.0 },
        { t: 120, v: 3.0 },
      ]),
      shapesInPainterOrder: [
        lineGroup('Stem', 130, 66, 130, 42, { stroke: '#2A1810', strokeWidth: 4 }),
        svgPathGroup(
          'Leaf L',
          'M 130 45 C 118 46 113 38 114 31 C 122 30 129 35 130 45 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
        svgPathGroup(
          'Leaf R',
          'M 130 45 C 131 34 139 28 148 29 C 148 39 141 46 130 45 Z',
          { fill: '#68D458', stroke: '#2A1810', strokeWidth: 3.2 }
        ),
      ],
      op: OP,
    }),

    // 9. Head, Mask, Nose, Mouth & Whiskers (parented to Torso ind: 10 — counter-balanced level carriage)
    makeShapeLayer({
      ind: 20,
      nm: 'Walk Head Base',
      parent: 10,
      pivot: [128, 122],
      rot: kf1D([
        { t: 0, v: 1.1 },
        { t: 15, v: -1.3 },
        { t: 30, v: 1.1 },
        { t: 45, v: -1.3 },
        { t: 60, v: 1.1 },
        { t: 75, v: -1.3 },
        { t: 90, v: 1.1 },
        { t: 105, v: -1.3 },
        { t: 120, v: 1.1 },
      ]),
      shapesInPainterOrder: [
        ellipseGroup('Head Oval', 130, 95, 52, 41, {
          fill: '#F7EBD6',
          stroke: '#2A1810',
          strokeWidth: 5,
        }),
        svgPathGroup(
          'Siamese Mask',
          'M 88 102 C 88 86 102 80 115 74 C 123 68 126 64 130 64 C 134 64 137 68 145 74 C 158 80 172 86 172 102 C 172 118 153 123 143 128 C 136 132 133 134 130 134 C 127 134 124 132 117 128 C 107 123 88 118 88 102 Z',
          { fill: '#4B3329' }
        ),
        // Nose, Mouth & Whiskers
        svgPathGroup(
          'Nose',
          'M 126 108 C 126 105 136 105 136 108 C 136 112 131 114 131 114 Z',
          { fill: '#2A1810' }
        ),
        svgPathGroup(
          'Mouth Open',
          'M 122 114 C 124 126 138 126 140 114 Z',
          { fill: '#331812', stroke: '#2A1810', strokeWidth: 3 }
        ),
        ellipseGroup('Tongue', 131, 121, 5, 2.8, { fill: '#F77E8B' }),
        svgPathGroup(
          'Upper Lip',
          'M 119 112 C 123 117 129 117 131 112 C 133 117 139 117 143 112',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 3.6, closed: false }
        ),
        lineGroup('Whisker L1', 69, 106, 85, 105, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker L2', 72, 115, 86, 111, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R1', 191, 106, 175, 105, { stroke: '#2A1810', strokeWidth: 4 }),
        lineGroup('Whisker R2', 188, 115, 174, 111, { stroke: '#2A1810', strokeWidth: 4 }),
      ],
      op: OP,
    }),

    // 10. Left Glossy Teal Eye (parented to Head ind: 20 — natural blink on Stride 2!)
    makeShapeLayer({
      ind: 24,
      nm: 'Walk Left Teal Eye Blink',
      parent: 20,
      pivot: [108, 99],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 74, v: [100, 100] },
          { t: 78, v: [104, 8], ease: EASE_OUT_SNAP }, // Natural blink mid-prowl
          { t: 83, v: [98, 104], ease: EASE_OUT_SNAP },
          { t: 88, v: [100, 100] },
          { t: 120, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: [
        ellipseGroup('Left Eye Iris', 108, 99, 11.5, 10.5, {
          fill: '#1FD4AE',
          stroke: '#2A1810',
          strokeWidth: 3,
        }),
        ellipseGroup('Left Pupil', 110, 100, 6.8, 7.2, { fill: '#084C41' }),
        circleGroup('Left Glint 1', 106, 95, 3, { fill: '#FFFFFF' }),
        circleGroup('Left Glint 2', 113, 104, 1.4, { fill: '#FFFFFF' }),
      ],
      op: OP,
    }),

    // 11. Stationary Right Camera Aperture Eye (parented to Head ind: 20 — subtle focus pulse, NEVER spins!)
    makeShapeLayer({
      ind: 25,
      nm: 'Walk Camera Aperture Eye',
      parent: 20,
      pivot: [153, 99],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 30, v: [106, 106] },
          { t: 60, v: [100, 100] },
          { t: 78, v: [108, 108], ease: EASE_OUT_SNAP },
          { t: 95, v: [100, 100] },
          { t: 120, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: cameraEyeShapes(153, 99, 12),
      op: OP,
    }),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: OP,
    w: 240,
    h: 240,
    nm: 'Sia Quadruped Walk Cycle',
    ddd: 0,
    assets: [],
    layers: layersBackToFront.reverse(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. GENERATE `sia-logo.json` (240 frames @ 60fps = 4.0s Head Avatar Loop)
// ═════════════════════════════════════════════════════════════════════════════
function buildSiaLogo() {
  const OP = 240;

  const layersBackToFront = [
    // 1. Left Ear (parented to Head ind: 20 — feline double twitch)
    makeShapeLayer({
      ind: 21,
      nm: 'Logo Left Ear',
      parent: 20,
      pivot: [78, 86],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 30, v: 0 },
        { t: 38, v: -8.0, ease: EASE_OUT_SNAP },
        { t: 46, v: -1.5 },
        { t: 54, v: -9.5, ease: EASE_OUT_SNAP },
        { t: 70, v: 0 },
        { t: 160, v: 2.5 },
        { t: 240, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Left Ear Outer',
          'M 48 116 C 43 76 50 44 61 37 C 71 31 95 54 109 73 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 6 }
        ),
        svgPathGroup(
          'Left Ear Inner',
          'M 55 108 C 52 78 57 53 64 48 C 72 44 90 62 101 76 Z',
          { fill: '#5E4136' }
        ),
        svgPathGroup('Left Ear Crease', 'M 62 50 C 70 64 78 78 83 89', {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 5,
          closed: false,
        }),
      ],
      op: OP,
    }),

    // 2. Right Ear (parented to Head ind: 20)
    makeShapeLayer({
      ind: 22,
      nm: 'Logo Right Ear',
      parent: 20,
      pivot: [162, 86],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 115, v: 0 },
        { t: 126, v: 8.5, ease: EASE_OUT_SNAP },
        { t: 145, v: 2.0 },
        { t: 158, v: 7.5, ease: EASE_OUT_SNAP },
        { t: 180, v: 0 },
        { t: 240, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Right Ear Outer',
          'M 192 116 C 197 76 190 44 179 37 C 169 31 145 54 131 73 Z',
          { fill: '#4B3329', stroke: '#2A1810', strokeWidth: 6 }
        ),
        svgPathGroup(
          'Right Ear Inner',
          'M 185 108 C 188 78 183 53 176 48 C 168 44 150 62 139 76 Z',
          { fill: '#5E4136' }
        ),
        svgPathGroup('Right Ear Crease', 'M 178 50 C 170 64 162 78 157 89', {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 5,
          closed: false,
        }),
      ],
      op: OP,
    }),

    // 3. Top Nutrition Sprout (parented to Head ind: 20)
    makeShapeLayer({
      ind: 23,
      nm: 'Logo Top Sprout',
      parent: 20,
      pivot: [120, 68],
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 60, v: -5.5 },
        { t: 125, v: 6.5 },
        { t: 185, v: -4.0 },
        { t: 240, v: 0 },
      ]),
      shapesInPainterOrder: [
        lineGroup('Stem', 120, 70, 120, 55, { stroke: '#25853E', strokeWidth: 5 }),
        svgPathGroup(
          'Leaf L',
          'M 120 60 C 106 60 99 50 100 41 C 110 40 119 47 120 60 Z',
          { fill: '#68D458', stroke: '#1E6F35', strokeWidth: 2 }
        ),
        svgPathGroup('Vein L', 'M 120 60 C 114 53 109 48 105 45', {
          fill: 'none',
          stroke: '#1E6F35',
          strokeWidth: 2.5,
          closed: false,
        }),
        svgPathGroup(
          'Leaf R',
          'M 120 58 C 121 41 132 33 145 34 C 145 48 135 58 120 58 Z',
          { fill: '#68D458', stroke: '#1E6F35', strokeWidth: 2 }
        ),
        svgPathGroup('Vein R', 'M 120 58 C 126 49 132 43 138 39', {
          fill: 'none',
          stroke: '#1E6F35',
          strokeWidth: 2.5,
          closed: false,
        }),
      ],
      op: OP,
    }),

    // 4. Head Silhouette, Siamese Mask, Wink & Smile (ind: 20)
    makeShapeLayer({
      ind: 20,
      nm: 'Logo Head Base',
      pivot: [120, 145],
      pos: kfVec([
        { t: 0, v: [120, 145] },
        { t: 60, v: [120, 142.2] },
        { t: 120, v: [120, 145.5] },
        { t: 180, v: [120, 142.5] },
        { t: 240, v: [120, 145] },
      ]),
      rot: kf1D([
        { t: 0, v: 0 },
        { t: 65, v: 3.2 },
        { t: 140, v: -2.8 },
        { t: 195, v: 1.5 },
        { t: 240, v: 0 },
      ]),
      shapesInPainterOrder: [
        svgPathGroup(
          'Head Silhouette',
          'M 48 112 C 42 128 38 147 36 154 L 44 157 L 39 164 C 54 192 84 206 120 206 C 156 206 186 192 201 164 L 196 157 L 204 154 C 202 147 198 128 192 112 C 176 78 150 68 120 68 C 90 68 64 78 48 112 Z',
          { fill: '#F5E8D0', stroke: '#2A1810', strokeWidth: 6 }
        ),
        svgPathGroup(
          'Chin Warm Shading',
          'M 46 166 C 62 190 88 202 120 202 C 152 202 178 190 194 166 C 176 184 150 193 120 193 C 90 193 64 184 46 166 Z',
          { fill: '#E6D2B5' }
        ),
        svgPathGroup(
          'Siamese Mask',
          'M 56 136 C 56 106 82 90 120 90 C 158 90 184 106 184 136 C 184 158 164 172 146 181 C 134 187 127 189 120 189 C 113 189 106 187 94 181 C 76 172 56 158 56 136 Z',
          { fill: '#4B3329' }
        ),
        lineGroup('Tick Top', 151, 103, 151, 108, { stroke: '#28F59C', strokeWidth: 2.5 }),
        lineGroup('Tick Bottom', 151, 160, 151, 165, { stroke: '#28F59C', strokeWidth: 2.5 }),
        lineGroup('Tick Left', 120, 134, 125, 134, { stroke: '#28F59C', strokeWidth: 2.5 }),
        lineGroup('Tick Right', 177, 134, 182, 134, { stroke: '#28F59C', strokeWidth: 2.5 }),
        svgPathGroup('Happy Wink Arch', 'M 73 139 C 79 121 96 121 102 139', {
          fill: 'none',
          stroke: '#2A1810',
          strokeWidth: 6.5,
          closed: false,
        }),
        svgPathGroup(
          'Pink Nose',
          'M 111 148 C 111 144 129 144 129 148 C 129 153 123 158 120 158 C 117 158 111 153 111 148 Z',
          { fill: '#F77E8B', stroke: '#2A1810', strokeWidth: 4.5 }
        ),
        svgPathGroup(
          'Cat Smile',
          'M 101 163 C 106 173 118 171 120 158 C 122 171 134 173 139 163',
          { fill: 'none', stroke: '#2A1810', strokeWidth: 5.5, closed: false }
        ),
      ],
      op: OP,
    }),

    // 5. Stationary Camera Aperture Eye (parented to Head ind: 20 — subtle focus pulse, never spins!)
    makeShapeLayer({
      ind: 25,
      nm: 'Logo Camera Aperture Eye',
      parent: 20,
      pivot: [151, 134],
      scale: kfVec(
        [
          { t: 0, v: [100, 100] },
          { t: 75, v: [106, 106] },
          { t: 135, v: [97, 97] },
          { t: 185, v: [108, 108], ease: EASE_OUT_SNAP },
          { t: 240, v: [100, 100] },
        ],
        true
      ),
      shapesInPainterOrder: cameraEyeShapes(151, 134, 17),
      op: OP,
    }),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: OP,
    w: 240,
    h: 240,
    nm: 'Sia Logo Avatar',
    ddd: 0,
    assets: [],
    layers: layersBackToFront.reverse(),
  };
}

// ─── GENERATE & VALIDATE ALL 5 FILES ─────────────────────────────────────────

const files = [
  { filename: 'sia-chef.json', build: buildSiaChef },
  { filename: 'sia-sitting.json', build: buildSiaChef },
  { filename: 'sia-scanner.json', build: buildSiaScanner },
  { filename: 'sia-water.json', build: buildSiaWater },
  { filename: 'sia-walking.json', build: buildSiaWalking },
  { filename: 'sia-logo.json', build: buildSiaLogo },
];

for (const item of files) {
  const jsonObj = item.build();
  const str = JSON.stringify(jsonObj);
  if (str.includes('NaN') || str.includes('undefined') || str.includes('null')) {
    throw new Error(`Invalid token found in ${item.filename}`);
  }
  const outPath = path.join(OUT_DIR, item.filename);
  fs.writeFileSync(outPath, JSON.stringify(jsonObj, null, 2), 'utf8');
  console.log(
    `[OK] Generated ${item.filename} (${jsonObj.layers.length} bone layers, ${jsonObj.op} frames @ ${jsonObj.fr}fps, ${(str.length / 1024).toFixed(1)} KB)`
  );
}
