/**
 * Builds all placeholder art from art-sources/placeholder (CC0 / public
 * domain packs, see CREDITS.md) plus code-drawn fallbacks, recoloured to the
 * master palette, and upserts the entries into the default manifest.
 *
 *   npm run sprites:placeholders
 *
 * Output: public/assets/sprites/placeholder/**  (NOT FOR RELEASE)
 * Entries whose manifest flag is "placeholder": false are never touched.
 */
const { write } = require('./lib/manifest');

const only = process.argv.slice(2);
const parts = ['characters', 'boss', 'icons', 'icons-more', 'backgrounds', 'ui', 'journey', 'overworld'];
for (const part of parts) {
  if (only.length && !only.includes(part)) continue;
  try {
    require.resolve(`./parts/${part}`);
  } catch {
    continue;
  }
  require(`./parts/${part}`)();
  console.log(`built ${part}`);
}
const { written, kept } = write();
console.log(`manifest: ${written} placeholder entries written${kept.length ? `, kept final art for ${kept.join(', ')}` : ''}`);
