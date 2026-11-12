/**
 * Tiny pixel-art helper for code-drawn sprites.
 *
 * Sprites are written as ASCII grids, one character per pixel, with a legend
 * that maps characters to palette token names. '.' is always transparent.
 * Only palette colours can be used, so generated art always matches the theme.
 *
 *   const { writeSprite } = require('./pixel');
 *   writeSprite('public/assets/sprites/placeholder/gem_idle_01.png', [
 *     '..XX..',
 *     '.XhmX.',
 *     '..XX..',
 *   ], { X: 'indigo950', h: 'brass300', m: 'brass500' });
 *
 * Output is a PNG at native size. Never pre-scaled.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { palette } = require('../../theme/palette');

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function gridToPng(rows, legend) {
  const height = rows.length;
  const width = rows[0].length;
  rows.forEach((r, y) => {
    if (r.length !== width) throw new Error(`row ${y} is ${r.length} wide, expected ${width}`);
  });
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const i = (width * y + x) << 2;
      if (ch === '.' || ch === ' ') {
        png.data[i + 3] = 0;
        continue;
      }
      const token = legend[ch];
      if (!token) throw new Error(`character "${ch}" at ${x},${y} is not in the legend`);
      const hex = palette[token];
      if (!hex) throw new Error(`"${token}" is not a palette token`);
      const [r, g, b] = hexToRgb(hex);
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
  }
  return png;
}

function writeSprite(file, rows, legend) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(gridToPng(rows, legend)));
  return file;
}

/** Write numbered frames: base + '_01.png', '_02.png', ... */
function writeFrames(baseWithoutExt, frames, legend) {
  return frames.map((rows, i) => writeSprite(`${baseWithoutExt}_${String(i + 1).padStart(2, '0')}.png`, rows, legend));
}

module.exports = { writeSprite, writeFrames, gridToPng };
