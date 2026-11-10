/**
 * Collects generated sprites and upserts them into the default manifest.
 *
 * Safe to re-run: an entry whose `placeholder` flag is false (final art) is
 * never overwritten, so regenerating placeholders cannot clobber real art.
 */
const fs = require('fs');
const path = require('path');
const { assertPaletteOnly } = require('./color');

const ROOT = path.join(__dirname, '../../..');
const SPRITES = path.join(ROOT, 'public/assets/sprites');
const MANIFEST = path.join(SPRITES, 'manifest.json');

const entries = {};

/**
 * Write frames and register an animation.
 *   add('enemy_smoke_wraith', 'idle', frames, { file: 'smoke_wraith_idle', fps: 6, category: 'enemies', source: 'dcss' })
 * Files land in placeholder/<category>/<file>_NN.png.
 */
function add(id, animName, frames, opts) {
  const { file, fps = 6, loop = true, category, source, meta, defaultAnimation } = opts;
  const rel = `placeholder/${category}/${file}`;
  frames.forEach((img, i) => {
    assertPaletteOnly(img, `${id}.${animName}[${i}]`);
    img.save(path.join(SPRITES, `${rel}_${String(i + 1).padStart(2, '0')}.png`));
  });
  const { w, h } = frames[0];
  frames.forEach((f, i) => {
    if (f.w !== w || f.h !== h) throw new Error(`${id}.${animName} frame ${i} is ${f.w}x${f.h}, expected ${w}x${h}`);
  });
  const e = (entries[id] = entries[id] || { category, frameWidth: w, frameHeight: h, placeholder: true, source, animations: {} });
  if (e.frameWidth !== w || e.frameHeight !== h) throw new Error(`${id}: ${animName} size differs from other animations`);
  if (meta) e.meta = meta;
  if (defaultAnimation) e.defaultAnimation = defaultAnimation;
  e.animations[animName] = { path: `${rel}_##.png`, frames: frames.length, fps: frames.length > 1 ? fps : 0, ...(loop ? {} : { loop: false }) };
}

function write() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const kept = [];
  for (const [id, e] of Object.entries(entries)) {
    const existing = manifest.sprites[id];
    if (existing && existing.placeholder === false) {
      kept.push(id);
      continue;
    }
    manifest.sprites[id] = e;
  }
  manifest.sprites = Object.fromEntries(Object.entries(manifest.sprites).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  return { written: Object.keys(entries).length - kept.length, kept };
}

module.exports = { add, write, ROOT, SPRITES };
