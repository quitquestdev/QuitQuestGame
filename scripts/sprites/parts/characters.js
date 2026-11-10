/**
 * Hero (three class variants of one knight) and the five regular enemies,
 * from Dungeon Crawl Stone Soup tiles (CC0), recoloured to the palette.
 */
const path = require('path');
const { Img } = require('../lib/image');
const { quantize, swapFamily, rgbOf } = require('../lib/color');
const { anim, outline } = require('../lib/anim');
const { add, ROOT } = require('../lib/manifest');

const SRC = path.join(ROOT, 'art-sources/placeholder/dcss');
const load = (rel) => Img.load(path.join(SRC, rel));

// Characters may use every family except moss (green is a meaning colour).
const NO_GREEN = ['indigo', 'brass', 'rust', 'stone', 'bone'];

function knight() {
  const layers = ['base/human_male', 'legs/leg_armor_0', 'boots/middle_brown', 'body/plate', 'head/helm_plume', 'hand_right/broadsword', 'hand_left/lshield_quartered'];
  const img = new Img(32, 32);
  layers.forEach((l) => img.paste(load(`player/${l}.png`)));
  return outline(quantize(img, { families: NO_GREEN, chromaWeight: 0.6 }).img);
}

function monster(file, families = NO_GREEN, chromaWeight = 0.8) {
  return outline(quantize(load(`monster/${file}.png`), { families, chromaWeight }).img);
}

/** Goblin gets a smouldering cigarette butt at the mouth. */
function cigaretteButtGoblin() {
  const img = monster('goblin_new');
  const g = img.clone();
  // Butt hangs from the corner of the mouth: filter, paper, ember, then a wisp of smoke.
  [[18, 16, 'brass400'], [19, 16, 'bone'], [20, 16, 'bone'], [21, 16, 'rust300'], [22, 15, 'stone400'], [22, 13, 'stone500'], [23, 12, 'stone500']].forEach(([x, y, t]) => g.set(x, y, rgbOf(t)));
  return g;
}

module.exports = function buildCharacters() {
  const base = knight();
  const classes = {
    warrior: base, // rust plume and shield
    mage: swapFamily(base, 'rust', 'indigo'),
    rogue: swapFamily(swapFamily(base, 'rust', 'stone'), 'indigo', 'stone'),
  };
  for (const [cls, img] of Object.entries(classes)) {
    const id = `hero_${cls}`;
    const file = `knight_${cls}`;
    const o = { category: 'characters', source: 'dcss' };
    add(id, 'idle', anim.idleBob(img), { ...o, file: `${file}_idle`, fps: 4 });
    add(id, 'attack', anim.attack(img, 1), { ...o, file: `${file}_attack`, fps: 12, loop: false });
    add(id, 'hurt', anim.hurt(img, 1), { ...o, file: `${file}_hurt`, fps: 10, loop: false });
    add(id, 'victory', anim.victory(img), { ...o, file: `${file}_victory`, fps: 6 });
    // Walking on the world map: a stepping bob (the source tile is a single still).
    add(id, 'walk', anim.idleBob(img, [0, -2, 0, -1]), { ...o, file: `${file}_walk`, fps: 8 });
  }

  const enemies = {
    smoke_wraith: { img: monster('silent_spectre', ['indigo', 'stone', 'bone'], 0.5), idle: 'float' },
    cigarette_butt_goblin: { img: cigaretteButtGoblin() },
    social_pressure_imp: { img: monster('imp', ['rust', 'brass', 'indigo', 'bone']), idle: 'float' },
    stress_demon: { img: monster('hellion_new', ['rust', 'indigo', 'brass', 'bone'], 0.6) },
    boredom_slime: { img: monster('azure_jelly_new', ['indigo', 'stone', 'bone']), idle: 'squash' },
  };
  for (const [name, e] of Object.entries(enemies)) {
    const id = `enemy_${name}`;
    const o = { category: 'enemies', source: 'dcss' };
    const idle = e.idle === 'float' ? anim.idleFloat(e.img) : anim.idleBob(e.img, e.idle === 'squash' ? [0, 1, 1, 0] : undefined);
    add(id, 'idle', idle, { ...o, file: `${name}_idle`, fps: e.idle === 'float' ? 5 : 4 });
    add(id, 'attack', anim.attack(e.img, -1), { ...o, file: `${name}_attack`, fps: 12, loop: false });
    add(id, 'hurt', anim.hurt(e.img, -1), { ...o, file: `${name}_hurt`, fps: 10, loop: false });
  }
};
