/**
 * Deterministic noise and ordered dithering for code-drawn art.
 * Same inputs always give the same pixels, so rebuilt art never drifts.
 */

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

/** 4x4 ordered-dither threshold in 0..1. */
const bayer = (x, y) => BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4];

/** Integer hash to 0..1. */
function hash(x, y = 0, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** 2D value noise in 0..1. */
function noise2(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** Fractal noise: a few octaves of noise2, still in 0..1. */
function fbm(x, y, seed = 0, octaves = 3) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise2(x, y, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.5;
    x *= 2;
    y *= 2;
  }
  return sum / norm;
}

/** Dithered pick across tokens (dark to light) by a 0..1 value. */
function pick(tokens, v, x, y) {
  const f = Math.max(0, Math.min(1, v)) * (tokens.length - 1);
  const i = Math.floor(f);
  return bayer(x, y) < f - i && i + 1 < tokens.length ? tokens[i + 1] : tokens[i];
}

module.exports = { bayer, hash, noise2, fbm, pick };
