/**
 * Minimal RGBA image toolkit for the placeholder art pipeline.
 * Everything is integer pixels: no scaling, no smoothing, ever.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

class Img {
  constructor(w, h, data) {
    this.w = w;
    this.h = h;
    this.data = data || Buffer.alloc(w * h * 4);
  }

  static load(file) {
    const png = PNG.sync.read(fs.readFileSync(file));
    return new Img(png.width, png.height, Buffer.from(png.data));
  }

  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const png = new PNG({ width: this.w, height: this.h });
    this.data.copy(png.data);
    fs.writeFileSync(file, PNG.sync.write(png));
    return file;
  }

  clone() {
    return new Img(this.w, this.h, Buffer.from(this.data));
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  set(x, y, rgba) {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = rgba[0];
    this.data[i + 1] = rgba[1];
    this.data[i + 2] = rgba[2];
    this.data[i + 3] = rgba.length > 3 ? rgba[3] : 255;
  }

  opaque(x, y) {
    return this.get(x, y)[3] > 0;
  }

  crop(x, y, w, h) {
    const out = new Img(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.set(i, j, this.get(x + i, y + j));
    return out;
  }

  /** Draw `src` over this image at (dx, dy). Alpha is binary: any coverage wins. */
  paste(src, dx = 0, dy = 0) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const p = src.get(x, y);
        if (p[3] > 0) this.set(x + dx, y + dy, p);
      }
    }
    return this;
  }

  /** Same pixels on a larger transparent canvas (never scales). */
  pad(w, h, anchor = 'bottom') {
    const out = new Img(w, h);
    const dx = Math.floor((w - this.w) / 2);
    const dy = anchor === 'bottom' ? h - this.h : anchor === 'top' ? 0 : Math.floor((h - this.h) / 2);
    return out.paste(this, dx, dy);
  }

  /** Translate content by whole pixels inside the same frame. */
  shift(dx, dy) {
    return new Img(this.w, this.h).paste(this, dx, dy);
  }

  map(fn) {
    const out = this.clone();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const p = this.get(x, y);
        if (p[3] > 0) out.set(x, y, fn(p, x, y));
      }
    }
    return out;
  }

  /**
   * Whole-number nearest-neighbour enlargement. Only for final outputs such
   * as app icons and splash images; sprites themselves are never pre-scaled.
   */
  scaleInt(n) {
    if (!Number.isInteger(n) || n < 1) throw new Error(`scaleInt needs a whole number, got ${n}`);
    const out = new Img(this.w * n, this.h * n);
    for (let y = 0; y < out.h; y++) {
      for (let x = 0; x < out.w; x++) out.set(x, y, this.get(Math.floor(x / n), Math.floor(y / n)));
    }
    return out;
  }

  /** Bounding box of opaque pixels. */
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.opaque(x, y)) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
}

module.exports = { Img };
