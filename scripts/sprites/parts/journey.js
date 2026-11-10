/**
 * Journey world art, drawn in code to the master palette (placeholders).
 *
 * Layers (one continuous image each, so regions dissolve into each other
 * through ordered dithering instead of meeting at hard seams):
 *   journey_sky     speed 0.25   sky bands, smog streaks, light shafts, clouds, sun
 *   journey_far     speed 0.5    distant ridges, forest silhouettes, snowy peaks
 *   journey_mid     speed 0.75   dead stumps, marsh water and reeds, trees, hills
 *   journey_ground  speed 1      ground and the trail the knight walks
 *   journey_fore    speed 1.25   rocks, reeds and grass in front of everything
 *   journey_fog     speed 1      smog that covers regions not yet reached
 *
 * Colour follows recovery: the early regions use stone, slate and rust only;
 * green appears first as tiny shoots in the marsh and takes over from the
 * fields on. Ashen Wastes and the fortress have no green at all.
 *
 * Props: five milestone landmarks (locked / lit), a story signpost, a battle
 * camp, the fortress, its distant silhouette, swaying grass, and the dither
 * masks used by the fog-lifting reveal.
 */
const { Img } = require('../lib/image');
const { rgbOf } = require('../lib/color');
const { polygon, ellipse, stroke, render, Mask } = require('../lib/raster');
const { dots } = require('../lib/anim');
const { add } = require('../lib/manifest');
const J = require('../../../lib/journey/regions');

const H = J.WORLD_HEIGHT;
const BLEND = 16; // world pixels either side of a region boundary that dither together

// ---------------------------------------------------------------- helpers

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));
const bayer = (x, y) => BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4];

function hash(x, y = 0, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 1D value noise in 0..1. */
function noise(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const t = f * f * (3 - 2 * f);
  return hash(i, 0, seed) * (1 - t) + hash(i + 1, 0, seed) * t;
}

function noise2(x, y, seed = 0) {
  const i = Math.floor(y);
  const f = y - i;
  const t = f * f * (3 - 2 * f);
  return noise(x + i * 17.3, seed) * (1 - t) + noise(x + (i + 1) * 17.3, seed) * t;
}

/** Dithered pick across a list of tokens by a 0..1 value. */
function ramp(tokens, v, x, y) {
  const f = Math.max(0, Math.min(1, v)) * (tokens.length - 1);
  const i = Math.floor(f);
  return bayer(x, y) < f - i && i + 1 < tokens.length ? tokens[i + 1] : tokens[i];
}

// ---------------------------------------------------------------- themes

const THEMES = {
  ashen: {
    sky: ['stone700', 'stone600', 'stone600', 'stone500'], skyFx: 'smog',
    far: { color: 'stone800', top: 'stone700', base: 68, amp: 10, freq: 0.09, jag: 3 },
    mid: { kind: 'stumps', ground: 'stone700', top: 'stone600', base: 88, accent: 'stone800' },
    ground: { base: 'stone600', dark: 'stone700', light: 'stone500', top: 'stone500', detail: 'ash' },
    path: { kind: 'cobble', base: 'stone500', edge: 'stone700', light: 'stone400', seam: 'stone600' },
    fore: { kind: 'rocks', a: 'stone800', b: 'stone700' },
  },
  marsh: {
    sky: ['indigo800', 'stone700', 'stone600', 'stone600'], skyFx: 'lowsmog',
    far: { color: 'indigo800', top: 'indigo700', base: 74, amp: 5, freq: 0.04, jag: 0 },
    mid: { kind: 'marsh', ground: 'stone700', top: 'stone600', base: 90, accent: 'stone600' },
    ground: { base: 'stone700', dark: 'brass800', light: 'stone600', top: 'stone600', detail: 'mud' },
    path: { kind: 'planks', base: 'brass600', edge: 'brass800', light: 'brass500', seam: 'brass800' },
    fore: { kind: 'reeds', a: 'stone700', b: 'brass800' },
  },
  haze: {
    sky: ['indigo600', 'indigo500', 'indigo500', 'indigo400'], skyFx: 'shafts',
    far: { color: 'indigo600', top: 'indigo500', base: 64, amp: 8, freq: 0.05, jag: 0 },
    mid: { kind: 'saplings', ground: 'stone700', top: 'stone600', base: 88, accent: 'moss700' },
    ground: { base: 'stone600', dark: 'stone700', light: 'stone500', top: 'stone500', detail: 'patches' },
    path: { kind: 'gravel', base: 'stone500', edge: 'stone700', light: 'stone400', seam: 'stone600' },
    fore: { kind: 'tufts', a: 'moss700', b: 'stone700' },
  },
  fields: {
    sky: ['indigo500', 'indigo400', 'indigo400', 'indigo300'], skyFx: 'clouds', cloud: 'indigo300',
    far: { color: 'indigo500', top: 'indigo400', base: 60, amp: 9, freq: 0.03, jag: 0 },
    mid: { kind: 'hills', ground: 'moss600', top: 'moss500', base: 80, accent: 'moss700' },
    ground: { base: 'moss500', dark: 'moss600', light: 'moss400', top: 'moss400', detail: 'flowers' },
    path: { kind: 'dirt', base: 'brass500', edge: 'brass700', light: 'brass400', seam: 'brass600' },
    fore: { kind: 'grass', a: 'moss500', b: 'moss400' },
  },
  woods: {
    sky: ['indigo700', 'indigo600', 'indigo500', 'indigo500'], skyFx: 'clouds', cloud: 'indigo400',
    far: { color: 'moss800', top: 'moss700', base: 62, amp: 4, freq: 0.05, jag: 0, trees: 6 },
    mid: { kind: 'forest', ground: 'moss800', top: 'moss700', base: 90, accent: 'brass800' },
    ground: { base: 'moss700', dark: 'moss800', light: 'moss600', top: 'moss600', detail: 'mushrooms' },
    path: { kind: 'dirt', base: 'brass600', edge: 'brass800', light: 'brass500', seam: 'brass700' },
    fore: { kind: 'ferns', a: 'moss600', b: 'moss500' },
  },
  heights: {
    sky: ['indigo400', 'indigo300', 'indigo300', 'bone'], skyFx: 'sun', cloud: 'bone',
    far: { color: 'indigo400', top: 'indigo300', base: 56, amp: 22, freq: 0.06, jag: 0, peaks: true, snow: 'bone' },
    mid: { kind: 'slopes', ground: 'moss500', top: 'moss400', base: 78, accent: 'stone400' },
    ground: { base: 'moss400', dark: 'moss500', light: 'moss300', top: 'moss300', detail: 'sunflowers' },
    path: { kind: 'slabs', base: 'stone400', edge: 'stone600', light: 'bone', seam: 'stone500' },
    fore: { kind: 'grass', a: 'moss400', b: 'moss300' },
  },
  fortress: {
    sky: ['rust800', 'rust700', 'indigo800', 'indigo800'], skyFx: 'smog',
    far: { color: 'stone800', top: 'stone700', base: 64, amp: 12, freq: 0.1, jag: 4 },
    mid: { kind: 'spires', ground: 'stone800', top: 'stone700', base: 88, accent: 'indigo900' },
    ground: { base: 'stone700', dark: 'stone800', light: 'stone600', top: 'stone600', detail: 'scorch' },
    path: { kind: 'flags', base: 'stone600', edge: 'stone800', light: 'stone500', seam: 'indigo900' },
    fore: { kind: 'rubble', a: 'stone800', b: 'indigo900' },
  },
  epilogue: {
    sky: ['indigo400', 'indigo300', 'brass300', 'brass300'], skyFx: 'clouds', cloud: 'bone',
    far: { color: 'indigo500', top: 'indigo400', base: 62, amp: 7, freq: 0.03, jag: 0 },
    mid: { kind: 'orchard', ground: 'moss500', top: 'moss400', base: 82, accent: 'brass300' },
    ground: { base: 'moss500', dark: 'moss600', light: 'moss400', top: 'moss400', detail: 'flowers' },
    path: { kind: 'gold', base: 'brass400', edge: 'brass600', light: 'brass300', seam: 'brass500' },
    fore: { kind: 'grass', a: 'moss500', b: 'moss400' },
  },
};

/**
 * Smooth variant for slow layers (the sky): a slow layer shows several
 * regions at once, so blend continuously from one region's centre to the
 * next instead of only at the boundaries.
 */
function themeAtSmooth(worldX, px, py) {
  const regions = J.REGIONS;
  const centres = regions.map((r) => (r.x0 + r.x1) / 2);
  const wx = Math.max(centres[0], Math.min(centres[centres.length - 1], worldX));
  let i = 0;
  while (i + 1 < centres.length && wx > centres[i + 1]) i++;
  if (i + 1 >= centres.length) return { theme: THEMES[regions[i].id], region: regions[i] };
  const t = (wx - centres[i]) / (centres[i + 1] - centres[i]);
  const j = bayer(px, py) < t ? i + 1 : i;
  return { theme: THEMES[regions[j].id], region: regions[j] };
}

/** Region theme at a world x, dithering across boundaries. */
function themeAt(worldX, px, py) {
  const regions = J.REGIONS;
  const wx = Math.max(0, Math.min(J.WORLD_WIDTH - 1, worldX));
  let i = regions.findIndex((r) => wx < r.x1);
  if (i < 0) i = regions.length - 1;
  const r = regions[i];
  // Near the end of this region: dither into the next one.
  if (i + 1 < regions.length && wx > r.x1 - BLEND) {
    const t = (wx - (r.x1 - BLEND)) / (2 * BLEND);
    if (bayer(px, py) < t) return { theme: THEMES[regions[i + 1].id], region: regions[i + 1] };
  }
  // Near the start: dither back into the previous one.
  if (i > 0 && wx < r.x0 + BLEND) {
    const t = (r.x0 + BLEND - wx) / (2 * BLEND);
    if (bayer(px, py) < t) return { theme: THEMES[regions[i - 1].id], region: regions[i - 1] };
  }
  return { theme: THEMES[r.id], region: r };
}

// ---------------------------------------------------------------- layer painters

function paintSky(t, X, y, worldX) {
  let token = ramp(t.sky, y / 100, X, y);
  if (t.skyFx === 'smog' && y > 14 && y < 74) {
    const n = noise2(X * 0.04, y * 0.25, 3);
    if (n > 0.62 && bayer(X, y) < 0.5) token = 'stone500';
  }
  if (t.skyFx === 'lowsmog' && y > 50 && y < 86 && bayer(X, y) < 0.35 + 0.3 * noise(X * 0.05, 5)) token = 'stone600';
  if (t.skyFx === 'shafts' && y < 96) {
    const band = (((X + Math.floor(y * 0.6)) % 48) + 48) % 48;
    if (band < 7 && bayer(X, y) < 0.32 + 0.1 * noise(X * 0.02, 9)) token = 'brass300';
  }
  if (t.skyFx === 'clouds' || t.skyFx === 'sun') {
    const cell = Math.floor(X / 36);
    const cx = cell * 36 + 8 + hash(cell, 1, 11) * 20;
    const cy = 12 + hash(cell, 2, 11) * 26;
    const dx = (X - cx) / 13;
    const dy = (y - cy) / 4;
    const d = dx * dx + dy * dy;
    if (hash(cell, 3, 11) > 0.35 && (d < 0.7 || (d < 1 && bayer(X, y) < 0.5))) token = t.cloud;
  }
  return token;
}

function farRidge(t, X) {
  let r = t.base - t.amp * noise(X * t.freq, 21);
  if (t.jag) r -= Math.floor(hash(X, 0, 22) * t.jag);
  if (t.peaks) {
    // Sharp triangular peaks of varying height.
    const u = X * 0.045 + noise(X * 0.02, 23) * 1.5;
    const tri = 1 - Math.abs((u % 2) - 1);
    r = t.base - t.amp * tri * (0.6 + 0.4 * noise(Math.floor(u / 2), 24));
  }
  if (t.trees) {
    const m = ((X % t.trees) + t.trees) % t.trees;
    r -= 5 - Math.abs(m - t.trees / 2) * 1.6;
  }
  return Math.round(r);
}

function paintFar(t, X, y) {
  const f = t.far;
  const r = farRidge(f, X);
  if (y < r) return null;
  if (f.snow && y < r + 3 && r < 42) return bayer(X, y) < 0.85 ? f.snow : f.top;
  return y === r ? f.top : f.color;
}

function paintMid(t, X, y) {
  const m = t.mid;
  const base = m.base + Math.round(2 * noise(X * 0.06, 31));
  const ground = y >= base ? (y === base ? m.top : m.ground) : null;
  switch (m.kind) {
    case 'stumps': {
      const cell = Math.floor(X / 18);
      if (hash(cell, 0, 32) > 0.4) {
        const sx = cell * 18 + 3 + Math.floor(hash(cell, 1, 32) * 10);
        const h = 6 + Math.floor(hash(cell, 2, 32) * 8);
        if ((X === sx || X === sx + 1) && y >= base - h && y < base) return m.accent;
        if (X === sx + 2 && y === base - h + 2) return m.accent; // a dead branch
        if (X === sx - 1 && y === base - h + 4) return m.accent;
      }
      return ground;
    }
    case 'marsh': {
      if (y >= 84 && y <= 90) return (X + y * 3) % 11 === 0 ? 'indigo600' : 'indigo700';
      const cell = Math.floor(X / 4);
      if (hash(cell, 0, 33) > 0.55) {
        const rx = cell * 4 + Math.floor(hash(cell, 1, 33) * 3);
        const h = 3 + Math.floor(hash(cell, 2, 33) * 6);
        if (X === rx && y >= 84 - h && y < 84) return y === 84 - h ? 'brass700' : m.accent;
      }
      return y > 90 ? m.ground : null;
    }
    case 'saplings': {
      const cell = Math.floor(X / 30);
      if (hash(cell, 0, 34) > 0.45) {
        const tx = cell * 30 + 6 + Math.floor(hash(cell, 1, 34) * 16);
        const dx = X - tx;
        const dy = y - (base - 9);
        if (dx * dx + dy * dy * 1.4 <= 10) return dy < 0 && dx < 0 ? 'moss600' : 'moss700';
        if (X === tx && y > base - 7 && y < base) return 'brass700';
      }
      if (ground && y > base && bayer(X, y) < 0.25 * noise(X * 0.05, 35)) return 'moss700';
      return ground;
    }
    case 'hills': {
      const hb = 80 - Math.round(7 * noise(X * 0.025, 36));
      if (y < hb) return null;
      if (y === hb) return 'moss500';
      return bayer(X, y) < (y - hb) / 30 ? 'moss700' : 'moss600';
    }
    case 'forest': {
      for (let c = Math.floor(X / 9) - 1; c <= Math.floor(X / 9) + 1; c++) {
        const cx = c * 9 + 4;
        const cy = 70 + hash(c, 1, 37) * 7;
        const rr = 7 + hash(c, 2, 37) * 3;
        const dx = X - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rr * rr) return dx + dy < -rr * 0.6 ? 'moss600' : 'moss700';
      }
      const tc = Math.floor(X / 9);
      if (X - tc * 9 >= 3 && X - tc * 9 <= 4 && y > 76) return y >= base ? m.ground : 'brass800';
      return y >= 80 ? m.ground : null;
    }
    case 'slopes': {
      const sb = 78 - Math.round(9 * noise(X * 0.03, 38));
      if (y < sb) return null;
      if (y === sb) return 'moss400';
      if (hash(X, y, 39) < 0.012) return 'stone400';
      return 'moss500';
    }
    case 'spires': {
      const cell = Math.floor(X / 14);
      const sx = cell * 14 + 7;
      const h = 10 + Math.floor(hash(cell, 0, 40) * 12);
      if (y >= base - h && y < base && Math.abs(X - sx) <= (y - (base - h)) / 3) return 'indigo900';
      return ground;
    }
    case 'orchard': {
      const hb = 82 - Math.round(4 * noise(X * 0.03, 41));
      const cell = Math.floor(X / 16);
      const tx = cell * 16 + 8;
      const dx = X - tx;
      const dy = y - (hb - 7);
      if (dx * dx + dy * dy <= 22) {
        if (hash(X, y, 42) < 0.08) return hash(X, y, 43) < 0.5 ? 'brass300' : 'rust300';
        return dx + dy < -2 ? 'moss400' : 'moss500';
      }
      if (X === tx && y >= hb - 3 && y < hb) return 'brass700';
      if (y < hb) return null;
      return y === hb ? 'moss400' : 'moss500';
    }
    default:
      return ground;
  }
}

function paintGround(t, X, y) {
  if (y < J.GROUND_TOP) return null;
  const g = t.ground;
  const p = t.path;
  // Trail.
  if (y === J.PATH_TOP - 1 || y === J.PATH_BOTTOM + 1) return p.edge;
  if (y >= J.PATH_TOP && y <= J.PATH_BOTTOM) {
    const h = hash(X, y, 51);
    switch (p.kind) {
      case 'cobble': {
        const row = Math.floor((y - J.PATH_TOP) / 3);
        if ((y - J.PATH_TOP) % 3 === 2 || (X + row * 3) % 6 === 0) return p.seam;
        return h < 0.15 ? p.light : p.base;
      }
      case 'planks':
        if (X % 7 === 0) return p.seam;
        if (y === J.PATH_TOP) return p.light;
        return h < 0.1 ? p.seam : p.base;
      case 'slabs':
        if (X % 10 === 0 || y === J.PATH_TOP + 4) return p.seam;
        return y === J.PATH_TOP || h < 0.08 ? p.light : p.base;
      case 'flags':
        if (X % 8 === 0 || (y - J.PATH_TOP) % 4 === 3) return p.seam;
        return h < 0.1 ? p.light : p.base;
      default: // dirt, gravel, gold
        if (h < 0.12) return p.light;
        if (h > 0.9) return p.seam;
        return p.base;
    }
  }
  // Ground with texture.
  if (y === J.GROUND_TOP) return g.top;
  const h = hash(X, y, 52);
  let token = bayer(X, y) < 0.3 * noise2(X * 0.08, y * 0.2, 53) ? g.dark : g.base;
  if (h > 0.97) token = g.light;
  switch (g.detail) {
    case 'ash':
      if (h < 0.025) return 'stone800';
      if (h > 0.995) return 'rust600';
      break;
    case 'mud':
      if (noise2(X * 0.06, y * 0.3, 54) > 0.68) token = 'brass800';
      if (h < 0.012 && y < J.PATH_TOP) return 'moss600'; // the first green shoots
      break;
    case 'patches':
      if (noise2(X * 0.05, y * 0.3, 55) > 0.6 && bayer(X, y) < 0.7) token = 'moss600';
      break;
    case 'flowers':
    case 'sunflowers':
      if (h < 0.02) return ['bone', 'brass300', 'rust300'][Math.floor(hash(X, y, 56) * 3)];
      break;
    case 'mushrooms':
      if (h < 0.006) return 'rust400';
      if (h < 0.009) return 'bone';
      break;
    case 'scorch':
      if (h < 0.02) return 'rust700';
      if (h > 0.985) return 'indigo900';
      break;
    default:
      break;
  }
  return token;
}

function paintFore(t, X, y) {
  if (y < 106) return null;
  const f = t.fore;
  const bottom = H - 1;
  switch (f.kind) {
    case 'rocks': {
      const cell = Math.floor(X / 22);
      if (hash(cell, 0, 61) < 0.5) return null;
      const cx = cell * 22 + 6 + Math.floor(hash(cell, 1, 61) * 10);
      const w = 3 + Math.floor(hash(cell, 2, 61) * 3);
      const h = 3 + Math.floor(hash(cell, 3, 61) * 4);
      const dx = (X - cx) / w;
      const dy = (y - bottom) / h;
      if (dx * dx + dy * dy <= 1) return dy < -0.5 ? f.b : f.a;
      return null;
    }
    case 'reeds':
    case 'tufts':
    case 'grass':
    case 'ferns': {
      const spacing = { reeds: 4, tufts: 12, grass: 3, ferns: 10 }[f.kind];
      const odds = { reeds: 0.45, tufts: 0.35, grass: 0.6, ferns: 0.45 }[f.kind];
      const maxH = { reeds: 12, tufts: 5, grass: 7, ferns: 9 }[f.kind];
      const cell = Math.floor(X / spacing);
      for (let c = cell - 1; c <= cell + 1; c++) {
        if (hash(c, 0, 62) > odds) continue;
        const bx = c * spacing + Math.floor(hash(c, 1, 62) * spacing);
        const h = 2 + Math.floor(hash(c, 2, 62) * (maxH - 1));
        const top = bottom - h;
        if (y < top) continue;
        const lean = f.kind === 'ferns' ? Math.round((bottom - y) * (X < bx ? -0.6 : 0.6)) : 0;
        if (X === bx + lean || (f.kind !== 'reeds' && f.kind !== 'grass' && Math.abs(X - bx) === 1 && y > top + 2)) {
          return y === top ? f.b : f.a;
        }
      }
      if (f.kind === 'grass' && y === bottom - 1 && hash(X, 0, 63) < 0.05) return 'brass300';
      return null;
    }
    case 'rubble': {
      const cell = Math.floor(X / 9);
      if (hash(cell, 0, 64) < 0.5) return null;
      const sx = cell * 9 + 4;
      const h = 3 + Math.floor(hash(cell, 1, 64) * 6);
      if (Math.abs(X - sx) <= (y - (bottom - h)) / 2 && y > bottom - h) return f.a;
      return null;
    }
    default:
      return null;
  }
}

function paintLayer(name, speed, painter) {
  const pad = J.layerPad(speed);
  const width = Math.ceil(J.WORLD_WIDTH * speed) + pad * 2;
  const img = new Img(width, H);
  const pick = speed < 0.5 ? themeAtSmooth : themeAt;
  for (let X = 0; X < width; X++) {
    const worldX = (X - pad) / speed;
    for (let y = 0; y < H; y++) {
      const { theme } = pick(worldX, X, y);
      const token = painter(theme, X, y, worldX);
      if (token) img.set(X, y, rgbOf(token));
    }
  }
  return { img, pad };
}

function paintFog() {
  const width = J.WORLD_WIDTH;
  const img = new Img(width, H);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < H; y++) {
      const n = noise2(x * 0.045, y * 0.09, 71);
      const density = 0.74 + 0.22 * n - (y < 20 ? 0.12 : 0);
      if (bayer(x, y) >= density) continue;
      const w = noise2(x * 0.08 + 40, y * 0.14, 72);
      img.set(x, y, rgbOf(w > 0.64 ? 'stone500' : w < 0.3 ? 'indigo700' : 'stone600'));
    }
  }
  return img;
}

/** 4x4 dither masks for the reveal: opaque where the pattern is "on". */
function ditherMask(level) {
  const img = new Img(4, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (bayer(x, y) < level) img.set(x, y, rgbOf('bone'));
  return img;
}

// ---------------------------------------------------------------- props

const STONE = ['stone800', 'stone700', 'stone600', 'stone500', 'stone400'];
const DARK_STONE = ['stone800', 'stone800', 'stone700', 'stone600'];
const BRASS = ['brass800', 'brass700', 'brass600', 'brass500', 'brass400', 'brass300'];
const MOSS = ['moss800', 'moss700', 'moss600', 'moss500', 'moss400', 'moss300'];
const WATER = ['indigo700', 'indigo600', 'indigo500', 'indigo400', 'indigo300'];
const FIRE = ['rust700', 'rust600', 'rust500', 'rust400', 'rust300'];

const R = (w, h) => ({ w, h, P: (pts) => polygon(w, h, pts), E: (cx, cy, rx, ry) => ellipse(w, h, cx, cy, rx, ry), S: (pts, sw) => stroke(w, h, pts, sw), rect: (x0, y0, x1, y1) => polygon(w, h, [[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]]) });

/** Landmark = shared body + a per-frame glow. Locked uses dull stone only. */
const LANDMARKS = {
  beacon(lit, f) {
    const g = R(16, 24);
    const parts = [
      { mask: g.rect(6, 10, 9, 20), ramp: lit ? STONE : DARK_STONE, base: 2 },
      { mask: g.rect(4, 20, 11, 22), ramp: lit ? STONE : DARK_STONE, base: 1 },
      { mask: g.E(8, 9, 5.5, 2), ramp: lit ? BRASS : DARK_STONE, base: 2 },
    ];
    if (lit) {
      const flick = [[[8, 1], [5, 8], [11, 8], [8, 5], [10, 3]], [[8, 2], [5, 8], [11, 8], [7, 4], [6, 4]], [[9, 1], [5, 8], [11, 8], [8, 4], [10, 4]]][f];
      parts.push({ mask: g.P(flick), ramp: FIRE, base: 3 });
    }
    let img = render(16, 24, parts);
    if (lit) img = dots(img, [[8, 6 + (f % 2), 'brass300'], [7, 7, 'bone']]);
    else img = dots(img, [[8, 6, 'stone600'], [7, 4, 'stone600'], [9, 2, 'stone700']]); // cold smoke
    return img;
  },
  lantern(lit, f) {
    const g = R(16, 24);
    const parts = [
      { mask: g.rect(7, 8, 8, 21), ramp: lit ? BRASS : DARK_STONE, base: 1 },
      { mask: g.rect(5, 21, 10, 22), ramp: lit ? STONE : DARK_STONE, base: 1 },
      { mask: g.rect(4, 1, 11, 7), ramp: lit ? BRASS : DARK_STONE, base: 2 },
      { mask: g.rect(6, 3, 9, 5), ramp: lit ? (f === 1 ? ['brass400', 'brass300', 'bone'] : ['brass300', 'bone', 'bone']) : ['indigo900'], base: 1, flat: true },
    ];
    return render(16, 24, parts);
  },
  spring(lit, f) {
    const g = R(16, 24);
    const parts = [
      { mask: g.rect(7, 11, 8, 18), ramp: lit ? STONE : DARK_STONE, base: 2 },
      { mask: g.E(8, 19.5, 7.5, 3.5), ramp: lit ? STONE : DARK_STONE, base: 2 },
      { mask: g.E(8, 18.5, 5.5, 1.6), ramp: lit ? WATER : ['stone800'], base: 2, flat: !lit },
    ];
    let img = render(16, 24, parts);
    if (lit) {
      const arcs = [
        [[6, 9], [5, 11], [10, 9], [11, 11], [8, 9]],
        [[6, 10], [4, 13], [10, 10], [12, 13], [8, 8]],
      ][f % 2];
      img = dots(img, arcs.map(([x, y]) => [x, y, 'indigo300']).concat([[7, 18, 'bone'], [10, 19, 'indigo300']]));
    }
    return img;
  },
  tree(lit, f) {
    const g = R(16, 24);
    const parts = [{ mask: g.P([[6, 23], [7, 11], [9, 11], [10, 23]]), ramp: lit ? BRASS.slice(0, 4) : DARK_STONE, base: 1 }];
    if (lit) {
      const sway = f === 1 ? 1 : 0;
      parts.push({ mask: g.E(8 + sway, 7, 7, 5.5).union(g.E(4 + sway, 11, 3.5, 3), g.E(12 + sway, 11, 3.5, 3)), ramp: MOSS, base: 2, dither: true });
    } else {
      parts.push({ mask: g.S([[8, 12], [8, 5], [5, 2]], 1).union(g.S([[8, 8], [12, 4]], 1), g.S([[8, 10], [4, 7]], 1)), ramp: DARK_STONE, base: 1 });
    }
    let img = render(16, 24, parts);
    if (lit) img = dots(img, [[5 + f, 5, 'moss300'], [11, 7 + f, 'moss300'], [8, 3, 'brass300']]);
    return img;
  },
  stone(lit, f) {
    const g = R(16, 24);
    let img = render(16, 24, [
      { mask: g.P([[5, 23], [5, 7], [7, 3], [10, 4], [11, 9], [11, 23]]), ramp: lit ? STONE : DARK_STONE, base: 2 },
      { mask: g.rect(3, 22, 12, 23), ramp: lit ? STONE : DARK_STONE, base: 1 },
    ]);
    const runes = [[7, 9], [8, 10], [9, 9], [8, 13], [7, 14], [9, 15], [8, 17]];
    const glow = lit ? (f === 1 ? 'bone' : 'moss300') : 'stone700';
    img = dots(img, runes.map(([x, y]) => [x, y, glow]));
    return img;
  },
};

function signpost(unlocked) {
  const g = R(12, 16);
  let img = render(12, 16, [
    { mask: g.rect(5, 6, 6, 15), ramp: unlocked ? BRASS : DARK_STONE, base: 1 },
    { mask: g.rect(1, 2, 10, 7), ramp: unlocked ? BRASS : DARK_STONE, base: 3 },
  ]);
  if (unlocked) img = dots(img, [[3, 4, 'bone'], [4, 4, 'bone'], [5, 4, 'bone'], [7, 4, 'bone'], [3, 5, 'brass700'], [4, 5, 'brass700'], [6, 5, 'brass700'], [8, 5, 'brass700']]);
  return img;
}

function camp(active, f) {
  const g = R(16, 16);
  let img = render(16, 16, [
    { mask: g.S([[8, 4], [8, 0]], 1), ramp: active ? BRASS : DARK_STONE, base: 1, flat: true },
    { mask: g.P([[1, 15], [8, 4], [15, 15]]), ramp: active ? FIRE : DARK_STONE, base: 2 },
    { mask: g.P([[6, 15], [8, 10], [10, 15]]), ramp: ['indigo950'], base: 0, flat: true },
  ]);
  if (active) img = dots(img, [[9, 0, 'rust400'], [10, 1 - (f % 2), 'rust400'], [11, 1, 'rust500']]);
  return img;
}

function fortress(f) {
  const W = 64;
  const g = R(W, 64);
  const DARK = ['indigo950', 'indigo900', 'stone800', 'stone700', 'stone600'];
  const walls = g.rect(6, 30, 57, 63);
  const towers = g.rect(2, 16, 15, 63).union(g.rect(48, 16, 61, 63));
  const keep = g.rect(22, 8, 41, 63);
  const merlons = new Mask(W, 64);
  for (let x = 2; x <= 60; x += 4) merlons.union(g.rect(x, 12, x + 1, 15), g.rect(x, 26, x + 1, 29));
  const spires = g.P([[1, 16], [8.5, 2], [16, 16]]).union(g.P([[47, 16], [54.5, 2], [62, 16]]), g.P([[21, 8], [32, 0], [43, 8]]));
  let img = render(W, 64, [
    { mask: walls, ramp: DARK, base: 3 },
    { mask: towers.union(merlons), ramp: DARK, base: 3 },
    { mask: keep, ramp: DARK, base: 4 },
    { mask: spires, ramp: ['indigo950', 'indigo900', 'indigo800', 'indigo700'], base: 2 },
    { mask: g.P([[25, 63], [25, 50], [28, 46], [35, 46], [38, 50], [38, 63]]), ramp: ['indigo950'], base: 0, flat: true },
  ]);
  const windows = [[8, 22], [9, 22], [54, 22], [55, 22], [31, 14], [32, 14], [31, 26], [32, 26], [8, 40], [55, 40], [27, 34], [36, 34]];
  img = dots(img, windows.map(([x, y], i) => [x, y, (i + f) % 3 === 0 ? 'rust300' : 'rust400']));
  return img;
}

function fortressSilhouette() {
  const g = R(32, 24);
  const m = g.rect(3, 12, 28, 23).union(g.rect(1, 7, 7, 23), g.rect(24, 7, 30, 23), g.rect(11, 3, 20, 23), g.P([[0, 7], [4, 0], [8, 7]]), g.P([[23, 7], [27, 0], [31, 7]]), g.P([[10, 3], [15.5, -2], [21, 3]]));
  let img = render(32, 24, [{ mask: m, ramp: ['indigo900'], base: 0, flat: true }], { outlineToken: 'indigo950' });
  return dots(img, [[4, 10, 'rust400'], [27, 10, 'rust400'], [15, 7, 'rust300'], [16, 13, 'rust400']]);
}

function grass(f) {
  const g = R(8, 8);
  const lean = f === 1 ? 1 : 0;
  return render(8, 8, [
    { mask: g.S([[2, 7], [1 + lean, 2]], 1).union(g.S([[4, 7], [4 + lean, 0]], 1), g.S([[6, 7], [7 + lean, 3]], 1)), ramp: ['moss600', 'moss500', 'moss400'], base: 1, flat: true },
  ], { outlineToken: 'moss800' });
}

// ---------------------------------------------------------------- build

module.exports = function buildJourney() {
  const o = { category: 'map', source: 'code' };
  const layers = [
    ['sky', paintSky],
    ['far', paintFar],
    ['mid', paintMid],
    ['ground', paintGround],
    ['fore', paintFore],
  ];
  layers.forEach(([name, painter], i) => {
    const speed = J.LAYER_SPEEDS[name];
    const { img, pad } = paintLayer(name, speed, painter);
    add(`journey_${name}`, 'idle', [img], { ...o, file: `journey_${name}_idle`, meta: { layer: i, speed, pad, worldWidth: J.WORLD_WIDTH } });
  });
  add('journey_fog', 'idle', [paintFog()], { ...o, file: 'journey_fog_idle', meta: { layer: 5, speed: 1, pad: 0 } });
  for (const level of [25, 50, 75]) add(`fx_dither_${level}`, 'idle', [ditherMask(level / 100)], { ...o, file: `fx_dither_${level}_idle` });

  for (const [kind, draw] of Object.entries(LANDMARKS)) {
    add(`journey_lm_${kind}`, 'lit', [0, 1, 2].map((f) => draw(true, f)), { ...o, file: `journey_lm_${kind}_lit`, fps: 4, defaultAnimation: 'lit' });
    add(`journey_lm_${kind}`, 'locked', [draw(false, 0)], { ...o, file: `journey_lm_${kind}_locked` });
  }
  add('journey_story', 'unlocked', [signpost(true)], { ...o, file: 'journey_story_unlocked', defaultAnimation: 'unlocked' });
  add('journey_story', 'locked', [signpost(false)], { ...o, file: 'journey_story_locked' });
  add('journey_camp', 'idle', [camp(true, 0), camp(true, 1)], { ...o, file: 'journey_camp_idle', fps: 3 });
  add('journey_camp', 'locked', [camp(false, 0)], { ...o, file: 'journey_camp_locked' });
  add('journey_fortress', 'idle', [fortress(0), fortress(1), fortress(2)], { ...o, file: 'journey_fortress_idle', fps: 2 });
  add('journey_fortress_far', 'idle', [fortressSilhouette()], { ...o, file: 'journey_fortress_far_idle' });
  add('journey_grass', 'idle', [grass(0), grass(1)], { ...o, file: 'journey_grass_idle', fps: 2 });
};
