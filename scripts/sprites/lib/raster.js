/**
 * Tiny shape rasteriser and shader for code-drawn sprites.
 *
 * Shapes become boolean masks; parts are painted back to front, each shaded
 * along a palette ramp with light from the top-left, then the whole sprite
 * gets a 1px dark outline. Results use palette tokens only.
 */
const { Img } = require('./image');
const { rgbOf } = require('./color');

class Mask {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.bits = new Uint8Array(w * h);
  }
  has(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.bits[y * this.w + x] === 1;
  }
  put(x, y) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.bits[y * this.w + x] = 1;
    return this;
  }
  union(...others) {
    others.forEach((o) => o.bits.forEach((b, i) => { if (b) this.bits[i] = 1; }));
    return this;
  }
  subtract(o) {
    o.bits.forEach((b, i) => { if (b) this.bits[i] = 0; });
    return this;
  }
}

/** Filled polygon (even-odd, pixel centres). */
function polygon(w, h, pts) {
  const m = new Mask(w, h);
  for (let y = 0; y < h; y++) {
    const cy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) m.put(x, y);
    }
  }
  return m;
}

function ellipse(w, h, cx, cy, rx, ry) {
  const m = new Mask(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) m.put(x, y);
    }
  }
  return m;
}

/** Thick polyline (for horns, bones, claws). */
function stroke(w, h, pts, width = 1) {
  const m = new Mask(w, h);
  const r = width / 2;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++) {
        for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) {
          if (Math.hypot(x + 0.5 - px, y + 0.5 - py) <= r + 0.25) m.put(x, y);
        }
      }
    }
  }
  return m;
}

/**
 * Paint parts back to front.
 * part = { mask, ramp: ['indigo800', ...dark->light], base: index, dither?: true,
 *          flat?: true (no lighting), castShadow?: true (darken parts just below it) }
 */
function render(w, h, parts, { outlineToken = 'indigo950' } = {}) {
  const img = new Img(w, h);
  const owner = new Int16Array(w * h).fill(-1);
  parts.forEach((p, pi) => {
    const { mask, ramp } = p;
    const base = p.base ?? Math.floor(ramp.length / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask.has(x, y)) continue;
        let k = base;
        if (!p.flat) {
          if (!mask.has(x - 1, y - 1) || !mask.has(x, y - 1)) k += 2;
          else if (!mask.has(x - 2, y - 2)) k += 1;
          if (!mask.has(x + 1, y + 1) || !mask.has(x + 1, y)) k -= 1;
          if (!mask.has(x, y + 2) && mask.has(x, y - 2)) k -= 1;
        }
        if (p.dither && (x + y) % 2 === 0 && !mask.has(x - 3, y - 3)) k += 1;
        k =Math.max(0, Math.min(ramp.length - 1, k));
        img.set(x, y, rgbOf(ramp[k]));
        owner[y * w + x] = pi;
      }
    }
    // Contact shadow: darken pixels of earlier parts just below/right of this part.
    if (p.castShadow) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const o = owner[y * w + x];
          if (o >= 0 && o !== pi && (mask.has(x - 1, y - 1) || mask.has(x, y - 1))) {
            const q = parts[o];
            img.set(x, y, rgbOf(q.ramp[0]));
          }
        }
      }
    }
  });
  // Outline the union.
  const c = rgbOf(outlineToken);
  const out = img.clone();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (img.opaque(x, y)) continue;
      if (img.opaque(x - 1, y) || img.opaque(x + 1, y) || img.opaque(x, y - 1) || img.opaque(x, y + 1)) out.set(x, y, c);
    }
  }
  return out;
}

module.exports = { Mask, polygon, ellipse, stroke, render };
