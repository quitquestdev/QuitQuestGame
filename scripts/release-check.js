/**
 * Release check for the sprite manifest.
 *
 *   npm run release:check          report only (exit 1 only on broken art)
 *   npm run release:check:strict   also fail while any placeholder art remains
 *
 * Checks every entry in the default manifest and in every skin pack
 * (public/assets/skins/<pack>/manifest.json, including the Premium knight skins)
 * and every sound effect (public/assets/sounds/manifest.json):
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
const sources = {};
let frameCount = 0;

function framePaths(anim) {
  const n = anim.frames || 1;
  if (!anim.path.includes('##')) return [anim.path];
  return Array.from({ length: n }, (_, i) => anim.path.replace('##', String(i + 1).padStart(2, '0')));
}

/** Check one manifest. Skin packs are labelled; dev-only packs never block a release. */
function checkManifest(m, { packLabel = '', group = '', packDevOnly = false } = {}) {
  for (const [id, entry] of Object.entries(m.sprites)) {
    const key = packLabel ? `${packLabel}: ${id}` : id;
    if (packDevOnly || (entry.meta && entry.meta.devOnly)) devOnly.push(key);
    else if (entry.placeholder) (placeholders[group || entry.category || 'other'] = placeholders[group || entry.category || 'other'] || []).push(key);
    sources[key] = entry.source;

    for (const [animName, anim] of Object.entries(entry.animations || {})) {
      for (const rel of framePaths(anim)) {
        frameCount++;
        const file = path.join(ROOT, 'public', m.baseUrl, rel);
        const where = `${packLabel ? packLabel + ': ' : ''}${id}.${animName} (${rel})`;
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
}

checkManifest(manifest);

// Skin packs (public/assets/skins/*/manifest.json): the Premium knight skins
// and the dev demo pack. Their placeholder art is listed like the default art.
const skinsDir = path.join(ROOT, 'public/assets/skins');
const skinPacks = [];
for (const dir of fs.existsSync(skinsDir) ? fs.readdirSync(skinsDir).sort() : []) {
  const file = path.join(skinsDir, dir, 'manifest.json');
  if (!fs.existsSync(file)) continue;
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  skinPacks.push(pack.id);
  checkManifest(pack, { packLabel: `skin ${pack.id}`, group: 'skin packs', packDevOnly: dir.startsWith('dev-') });
}

// Sound effects (public/assets/sounds/manifest.json): every file exists, and
// placeholder sounds are listed like placeholder art.
const soundManifestPath = path.join(ROOT, 'public/assets/sounds/manifest.json');
if (fs.existsSync(soundManifestPath)) {
  const sm = JSON.parse(fs.readFileSync(soundManifestPath, 'utf8'));
  for (const [id, entry] of Object.entries(sm.sounds || {})) {
    const key = `sound ${id}`;
    sources[key] = entry.source;
    if (!fs.existsSync(path.join(ROOT, 'public', sm.baseUrl, entry.path))) errors.push(`missing sound file: ${id} (${entry.path})`);
    if (entry.placeholder) (placeholders.sounds = placeholders.sounds || []).push(key);
  }
}

const total = Object.keys(sources).length;
const phCount = Object.values(placeholders).reduce((n, l) => n + l.length, 0);

console.log(`Sprite manifest and ${skinPacks.length} skin pack(s) (${skinPacks.join(', ')}): ${total} entries, ${frameCount} frames\n`);
if (phCount) {
  console.log(`Placeholder art still in use: ${phCount} of ${total - devOnly.length} release entries`);
  for (const [cat, ids] of Object.entries(placeholders).sort()) {
    console.log(`  ${cat} (${ids.length})`);
    for (const id of ids.sort()) console.log(`    - ${id}${sources[id] ? `  [${sources[id]}]` : ''}`);
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
