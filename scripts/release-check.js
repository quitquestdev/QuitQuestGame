/**
 * Release check for the sprite manifest.
 *
 *   npm run release:check          report only (exit 1 only on broken art)
 *   npm run release:check:strict   also fail while any placeholder art remains
 *
 * Checks every entry in the default manifest:
 *   - lists entries still tagged "placeholder": true, grouped by category
 *   - every frame file exists
 *   - every frame is exactly frameWidth x frameHeight (art is never pre-scaled)
 *   - warns about pixels outside the 32-colour master palette
 * Entries with meta.devOnly (dev harness art) are listed separately and never
 * block a release.
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { palette } = require('../theme/palette');

const ROOT = path.join(__dirname, '..');
const strict = process.argv.includes('--strict');
const manifestPath = path.join(ROOT, 'public/assets/sprites/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const paletteRgb = new Set(Object.values(palette).map((h) => [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16)).join(',')));

const errors = [];
const warnings = [];
const placeholders = {};
const devOnly = [];
let frameCount = 0;

function framePaths(anim) {
  const n = anim.frames || 1;
  if (!anim.path.includes('##')) return [anim.path];
  return Array.from({ length: n }, (_, i) => anim.path.replace('##', String(i + 1).padStart(2, '0')));
}

for (const [id, entry] of Object.entries(manifest.sprites)) {
  if (entry.meta && entry.meta.devOnly) devOnly.push(id);
  else if (entry.placeholder) (placeholders[entry.category || 'other'] = placeholders[entry.category || 'other'] || []).push(id);

  for (const [animName, anim] of Object.entries(entry.animations || {})) {
    for (const rel of framePaths(anim)) {
      frameCount++;
      const file = path.join(ROOT, 'public', manifest.baseUrl, rel);
      const where = `${id}.${animName} (${rel})`;
      if (!fs.existsSync(file)) {
        errors.push(`missing file: ${where}`);
        continue;
      }
      let png;
      try {
        png = PNG.sync.read(fs.readFileSync(file));
      } catch (e) {
        errors.push(`unreadable PNG: ${where}: ${e.message}`);
        continue;
      }
      if (png.width !== entry.frameWidth || png.height !== entry.frameHeight) {
        errors.push(`wrong size: ${where} is ${png.width}x${png.height}, manifest says ${entry.frameWidth}x${entry.frameHeight}`);
      }
      let off = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        if (png.data[i + 3] === 0) continue;
        if (!paletteRgb.has(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`)) off++;
      }
      if (off) warnings.push(`off-palette colours: ${where} has ${off} pixel(s) outside the master palette`);
    }
  }
}

const total = Object.keys(manifest.sprites).length;
const phCount = Object.values(placeholders).reduce((n, l) => n + l.length, 0);

console.log(`Sprite manifest: ${total} entries, ${frameCount} frames\n`);
if (phCount) {
  console.log(`Placeholder art still in use: ${phCount} of ${total - devOnly.length} release entries`);
  for (const [cat, ids] of Object.entries(placeholders).sort()) {
    console.log(`  ${cat} (${ids.length})`);
    for (const id of ids.sort()) console.log(`    - ${id}${manifest.sprites[id].source ? `  [${manifest.sprites[id].source}]` : ''}`);
  }
} else {
  console.log('No placeholder art in release entries.');
}
if (devOnly.length) console.log(`\nDev-only entries (never shipped in game screens): ${devOnly.join(', ')}`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ! ${w}`));
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach((e) => console.log(`  x ${e}`));
}

const failed = errors.length > 0 || (strict && phCount > 0);
console.log(`\n${failed ? 'FAIL' : 'OK'}${strict ? ' (strict)' : ''}: ${errors.length} error(s), ${warnings.length} warning(s), ${phCount} placeholder entr${phCount === 1 ? 'y' : 'ies'}`);
process.exit(failed ? 1 : 0);
