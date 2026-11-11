/**
 * Premium knight skins: palette recolours of the default knight, delivered as
 * skin packs through the sprite registry's override mechanism. No component
 * changes: a skin pack overrides hero_* and overworld_knight_* by ID.
 *
 *   npm run sprites:skins
 *
 * Each skin maps palette tokens to palette tokens (never new colours), and
 * leaves the indigo950 outline alone. Green (moss) is a meaning colour and
 * rust means danger, so neither is used for armour.
 *
 * Output: public/assets/skins/premium-<id>/manifest.json and frames. Every
 * entry is tagged placeholder: true; `npm run release:check` lists them.
 */
const fs = require('fs');
const path = require('path');
const { Img } = require('./lib/image');
const { rgbOf, TOKENS, assertPaletteOnly } = require('./lib/color');
const { SKINS } = require('../../lib/premium/skins');

const ROOT = path.join(__dirname, '../..');
const SPRITES = path.join(ROOT, 'public/assets/sprites');
const manifest = JSON.parse(fs.readFileSync(path.join(SPRITES, 'manifest.json'), 'utf8'));

/** Token -> token maps. Anything not listed keeps its colour. */
const RECOLOURS = {
  gilded: {
    stone800: 'brass800', stone700: 'brass700', stone600: 'brass600', stone500: 'brass500', stone400: 'brass400',
    brass500: 'stone500', brass400: 'bone',
  },
  midnight: {
    stone800: 'indigo800', stone700: 'indigo700', stone600: 'indigo600', stone500: 'indigo500', stone400: 'indigo400',
    indigo500: 'brass500', indigo400: 'brass400',
    rust600: 'stone600', rust500: 'stone500', rust400: 'stone400', rust300: 'bone',
  },
  silver: {
    stone800: 'stone700', stone700: 'stone600', stone600: 'stone500', stone500: 'stone400', stone400: 'bone',
    rust600: 'indigo600', rust500: 'indigo500', rust400: 'indigo400', rust300: 'indigo300',
    indigo500: 'brass500', indigo400: 'brass400',
  },
};

const byRgb = new Map(TOKENS.map((t) => [t.rgb.join(','), t.name]));
function recolour(img, map) {
  return img.map((p) => {
    if (!p[3]) return p;
    const name = byRgb.get(p.slice(0, 3).join(','));
    return name && map[name] ? rgbOf(map[name]) : p;
  });
}

// The sprites a skin replaces, and the class sprite whose frames it recolours.
const TARGETS = [
  { ids: ['hero_warrior', 'hero_mage', 'hero_rogue'], from: 'hero_warrior', file: 'knight' },
  { ids: ['overworld_knight_warrior', 'overworld_knight_mage', 'overworld_knight_rogue'], from: 'overworld_knight_warrior', file: 'map_knight' },
];

const framePaths = (a) => Array.from({ length: a.frames }, (_, i) => a.path.replace('##', String(i + 1).padStart(2, '0')));

for (const skin of SKINS) {
  const map = RECOLOURS[skin.id];
  if (!map) throw new Error(`no recolour for skin ${skin.id}`);
  const dir = path.join(ROOT, 'public/assets/skins', `premium-${skin.id}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const out = {
    id: `premium-${skin.id}`,
    name: `${skin.name} (Premium knight skin, placeholder art)`,
    version: 1,
    baseUrl: `/assets/skins/premium-${skin.id}/`,
    sprites: {},
  };
  for (const t of TARGETS) {
    const base = manifest.sprites[t.from];
    const animations = {};
    for (const [name, a] of Object.entries(base.animations)) {
      const rel = `${t.file}_${name}_##.png`;
      framePaths(a).forEach((src, i) => {
        const img = recolour(Img.load(path.join(SPRITES, src)), map);
        assertPaletteOnly(img, `${skin.id} ${t.from}.${name}[${i}]`);
        img.save(path.join(dir, rel.replace('##', String(i + 1).padStart(2, '0'))));
      });
      animations[name] = { ...a, path: rel };
    }
    for (const id of t.ids) {
      out.sprites[id] = {
        category: base.category,
        frameWidth: base.frameWidth,
        frameHeight: base.frameHeight,
        placeholder: true,
        source: 'code',
        ...(base.defaultAnimation ? { defaultAnimation: base.defaultAnimation } : {}),
        animations,
      };
    }
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`built skin ${skin.id}: ${Object.keys(out.sprites).length} sprites`);
}
