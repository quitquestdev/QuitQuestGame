/**
 * Palette quantisation. Maps any source colour to the nearest master-palette
 * token in CIELAB space, optionally restricted to some families (so, for
 * example, a green forest never becomes moss, which is reserved for meaning).
 */
const { palette } = require('../../../theme/palette');

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToLab([r, g, b]) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

const TOKENS = Object.entries(palette).map(([name, hex]) => {
  const rgb = hexToRgb(hex);
  return { name, rgb, lab: rgbToLab(rgb), family: name.replace(/\d+$/, '') };
});

const rgbOf = (token) => {
  const t = TOKENS.find((x) => x.name === token);
  if (!t) throw new Error(`unknown palette token ${token}`);
  return [...t.rgb, 255];
};

/** Ordered dark -> light token names for a family. */
function ramp(family) {
  return TOKENS.filter((t) => t.family === family)
    .sort((a, b) => a.lab[0] - b.lab[0])
    .map((t) => t.name);
}

/**
 * Nearest palette token to an RGB colour.
 * opts.families: allowed family names (default: all except moss).
 * opts.chromaWeight: < 1 favours matching lightness over hue, which keeps
 * shading ramps intact when the source hue has no close palette match.
 */
function nearestToken(rgb, opts = {}) {
  const families = opts.families || ['indigo', 'brass', 'rust', 'stone', 'bone'];
  const cw = opts.chromaWeight ?? 1;
  const lab = rgbToLab(rgb);
  let best = null;
  let bestD = Infinity;
  for (const t of TOKENS) {
    if (!families.includes(t.family)) continue;
    const d = (lab[0] - t.lab[0]) ** 2 + cw * ((lab[1] - t.lab[1]) ** 2 + (lab[2] - t.lab[2]) ** 2);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best.name;
}

/**
 * Recolour an image to the palette. Alpha becomes binary at `alphaCut`
 * (semi-transparent drop shadows below it are removed).
 * Returns { img, tokens } where tokens[y][x] is the token name or null.
 */
function quantize(img, opts = {}) {
  const alphaCut = opts.alphaCut ?? 128;
  const cache = new Map();
  const out = img.clone();
  const tokens = [];
  for (let y = 0; y < img.h; y++) {
    tokens.push([]);
    for (let x = 0; x < img.w; x++) {
      const [r, g, b, a] = img.get(x, y);
      if (a < alphaCut) {
        out.set(x, y, [0, 0, 0, 0]);
        tokens[y].push(null);
        continue;
      }
      const key = (r << 16) | (g << 8) | b;
      let name = cache.get(key);
      if (!name) {
        name = opts.override?.([r, g, b]) || nearestToken([r, g, b], opts);
        cache.set(key, name);
      }
      out.set(x, y, rgbOf(name));
      tokens[y].push(name);
    }
  }
  return { img: out, tokens };
}

/** Swap every pixel of one family onto another family's ramp, matching rank. */
function swapFamily(img, from, to) {
  const a = ramp(from);
  const b = ramp(to);
  const lookup = new Map(a.map((name, i) => [rgbOf(name).slice(0, 3).join(','), rgbOf(b[Math.round((i / Math.max(1, a.length - 1)) * (b.length - 1))])]));
  return img.map((p) => lookup.get(p.slice(0, 3).join(',')) || p);
}

/** Check: every opaque pixel is an exact palette colour. */
function assertPaletteOnly(img, label) {
  const ok = new Set(TOKENS.map((t) => t.rgb.join(',')));
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const p = img.get(x, y);
      if (p[3] === 0) continue;
      if (p[3] !== 255 || !ok.has(p.slice(0, 3).join(','))) throw new Error(`${label}: off-palette pixel at ${x},${y}: ${p}`);
    }
  }
}

module.exports = { rgbOf, ramp, nearestToken, quantize, swapFamily, assertPaletteOnly, TOKENS };
