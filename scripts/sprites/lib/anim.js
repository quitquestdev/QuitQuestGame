/**
 * Frame generators that turn one still sprite into placeholder animations.
 * All motion is whole-pixel translation; all colour changes stay on the
 * palette (stepping along a family ramp, or a flat flash colour).
 *
 * `dir` is the facing direction: +1 faces right, -1 faces left.
 */
const { Img } = require('./image');
const { TOKENS, ramp, rgbOf } = require('./color');

const byRgb = new Map(TOKENS.map((t) => [t.rgb.join(','), t]));

/** Move each pixel `steps` along its own family ramp (positive = lighter). */
function shade(img, steps) {
  return img.map((p) => {
    const t = byRgb.get(p.slice(0, 3).join(','));
    if (!t) return p;
    const r = t.family === 'bone' ? ramp('stone').concat('bone') : ramp(t.family);
    const i = Math.max(0, Math.min(r.length - 1, r.indexOf(t.name) + steps));
    return rgbOf(r[i]);
  });
}

/** Solid silhouette in one token (hit flash). */
function flash(img, token = 'bone') {
  const c = rgbOf(token);
  return img.map(() => c);
}

/** Map every pixel onto a family ramp by its lightness (damage tint). */
function tint(img, family) {
  const target = ramp(family);
  const order = TOKENS.slice().sort((a, b) => a.lab[0] - b.lab[0]).map((t) => t.rgb.join(','));
  return img.map((p) => {
    const rank = order.indexOf(p.slice(0, 3).join(','));
    const i = Math.round((Math.max(0, rank) / (order.length - 1)) * (target.length - 1));
    return rgbOf(target[i]);
  });
}

/** Add a 1px outline in `token` around the silhouette, inside the frame. */
function outline(img, token = 'indigo950') {
  const c = rgbOf(token);
  const out = img.clone();
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.opaque(x, y)) continue;
      if (img.opaque(x - 1, y) || img.opaque(x + 1, y) || img.opaque(x, y - 1) || img.opaque(x, y + 1)) out.set(x, y, c);
    }
  }
  return out;
}

/** Draw single pixels: points = [[x, y, token], ...]. */
function dots(img, points) {
  const out = img.clone();
  points.forEach(([x, y, token]) => out.set(x, y, rgbOf(token)));
  return out;
}

/** A 4-point twinkle centred at (x, y). */
function twinkle(x, y, token = 'bone', arm = 1) {
  const pts = [[x, y, token]];
  for (let k = 1; k <= arm; k++) pts.push([x - k, y, 'brass300'], [x + k, y, 'brass300'], [x, y - k, 'brass300'], [x, y + k, 'brass300']);
  return pts;
}

const anim = {
  idleBob: (img, path = [0, -1, -1, 0]) => path.map((dy) => img.shift(0, dy)),
  idleFloat: (img) => [0, -1, -2, -1].map((dy) => img.shift(0, dy)),
  attack: (img, dir = 1) => [img.shift(-dir, 0), shade(img.shift(dir * 3, 0), 1), img.shift(dir * 2, 0), img.clone()],
  hurt: (img, dir = 1) => [flash(img.shift(-dir * 2, 0)), tint(img.shift(-dir, 0), 'rust'), img.clone()],
  victory: (img) => [
    img.clone(),
    dots(img.shift(0, -2), [...twinkle(4, 6), ...twinkle(27, 10)]),
    dots(img.shift(0, -3), [...twinkle(6, 3, 'bone', 2), ...twinkle(26, 5)]),
    dots(img.shift(0, -1), twinkle(28, 4)),
  ],
};

module.exports = { anim, shade, flash, tint, outline, dots, twinkle, Img };
