/**
 * World map (drawn in code), 120x180 native pixels.
 *
 *   map_world_smog   the island before you get there: grey land under smog
 *   map_world_clear  the same island restored: moss land, landmarks in colour
 *   map_marker       the "you are here" banner (2-frame wave)
 *
 * The game shows the smog map and reveals the clear map below the hero's
 * marker, so the land you have travelled visibly heals (green = recovery).
 * Region names, day ranges and road waypoints live in the clear map's
 * manifest meta, so a repainted map can move them without code changes.
 */
const path = require('path');
const { Img } = require('../lib/image');
const { rgbOf } = require('../lib/color');
const { tint } = require('../lib/anim');
const { polygon, ellipse, render, Mask } = require('../lib/raster');
const { grid } = require('../lib/grid');
const { add, SPRITES } = require('../lib/manifest');

const W = 120;
const H = 180;

// Road waypoints: the hero walks from day 0 at the bottom to day 365 at the top.
const WAYPOINTS = [
  { day: 0, x: 60, y: 174 },
  { day: 30, x: 30, y: 150 },
  { day: 60, x: 88, y: 124 },
  { day: 90, x: 36, y: 98 },
  { day: 120, x: 86, y: 72 },
  { day: 150, x: 34, y: 48 },
  { day: 180, x: 82, y: 26 },
  { day: 365, x: 58, y: 13 },
];

// One region per story chapter, named after places in the story text.
const REGIONS = [
  { id: 'temple', name: 'Temple of Clean Air', chapter: 1, from: 1, to: 30, icon: 'icon_hut', at: [90, 160] },
  { id: 'woods', name: 'Temptation Woods', chapter: 2, from: 31, to: 60, icon: 'icon_tree', at: [30, 130] },
  { id: 'peaks', name: 'The Storm Peaks', chapter: 3, from: 61, to: 90, icon: 'icon_mountain', at: [92, 102] },
  { id: 'city', name: 'The Royal City', chapter: 4, from: 91, to: 120, icon: 'icon_castle', at: [30, 76] },
  { id: 'hall', name: "Squires' Hall", chapter: 5, from: 121, to: 150, icon: 'icon_helmet', at: [92, 48] },
  { id: 'statues', name: 'Hall of Statues', chapter: 6, from: 151, to: 180, icon: 'icon_trophy', at: [28, 24] },
  { id: 'lair', name: "The Dragon's Lair", chapter: 7, from: 181, to: 365, icon: 'icon_volcano', at: [96, 10] },
];

const COAST = [
  [14, 179], [6, 160], [10, 140], [4, 118], [10, 96], [6, 74], [12, 52], [8, 30], [18, 10], [40, 2],
  [80, 2], [104, 8], [115, 28], [110, 50], [116, 72], [110, 96], [116, 118], [110, 140], [114, 160], [104, 179],
];

function sea() {
  const img = new Img(W, H);
  const base = rgbOf('indigo800');
  const wave = rgbOf('indigo700');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const crest = (y % 8 === 3 && (x + Math.floor(y / 8) * 3) % 10 < 3) || (y % 8 === 7 && (x + 5 + Math.floor(y / 8) * 3) % 10 < 2);
      img.set(x, y, crest ? wave : base);
    }
  }
  return img;
}

function road(img, token) {
  const c = rgbOf(token);
  let dist = 0;
  for (let i = 0; i + 1 < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
    for (let s = 0; s < steps; s++) {
      const x = Math.round(a.x + ((b.x - a.x) * s) / steps);
      const y = Math.round(a.y + ((b.y - a.y) * s) / steps);
      if (Math.floor(dist / 3) % 2 === 0) img.set(x, y, c);
      dist++;
    }
  }
}

function icon(id) {
  return Img.load(path.join(SPRITES, `placeholder/icons/${id}_idle_01.png`));
}

function island(variant) {
  const clear = variant === 'clear';
  const land = polygon(W, H, COAST);
  const ramp = clear ? ['moss800', 'moss700', 'moss600', 'moss500', 'moss400'] : ['stone800', 'stone700', 'stone600', 'stone500', 'stone400'];
  const img = sea().paste(render(W, H, [{ mask: land, ramp, base: 1, dither: true }]));

  // Ground texture: scattered tufts and hollows (deterministic, so rebuilds match).
  const tuft = rgbOf(clear ? 'moss400' : 'stone500');
  const hollow = rgbOf(clear ? 'moss800' : 'stone800');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!land.has(x, y) || !land.has(x - 2, y) || !land.has(x + 2, y) || !land.has(x, y - 2)) continue;
      const h = (x * 73856093) ^ (y * 19349663);
      if ((h >>> 0) % 113 === 0) {
        img.set(x, y, tuft);
        img.set(x + 1, y, tuft);
      } else if ((h >>> 0) % 157 === 0) {
        img.set(x, y, hollow);
      }
    }
  }

  road(img, clear ? 'brass300' : 'stone400');

  for (const r of REGIONS) {
    let art = icon(r.icon);
    if (!clear) art = tint(art, 'stone');
    img.paste(art, r.at[0] - 8, r.at[1] - 8);
  }

  if (!clear) {
    // Smog clouds over the shrouded land: a checker-dithered core with a
    // scattered rim, so it reads as cloud rather than hatching.
    const clouds = [[30, 160, 16], [86, 140, 18], [40, 112, 17], [84, 88, 18], [34, 62, 16], [82, 36, 17], [56, 14, 18]];
    const core = new Mask(W, H);
    const rim = new Mask(W, H);
    clouds.forEach(([x, y, r]) => {
      core.union(ellipse(W, H, x, y, r * 0.6, r * 0.33));
      rim.union(ellipse(W, H, x, y, r, r * 0.55));
    });
    const light = rgbOf('stone400');
    const mid = rgbOf('stone500');
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!land.has(x, y)) continue;
        if (core.has(x, y) && (x + y) % 2 === 0) img.set(x, y, light);
        else if (rim.has(x, y) && y % 2 === 0 && (x + (y % 4 === 0 ? 0 : 2)) % 4 === 0) img.set(x, y, mid);
      }
    }
  }
  return img;
}

const MARKER = [
  [
    'XXXXXXX...',
    'XbrrrrrX..',
    'XbrrrrrrX.',
    'XbrrrrrX..',
    'XbXXXXX...',
    'Xb........',
    'Xb........',
    'Xb........',
    'Xb........',
    'Xb........',
    'XbX.......',
    'XXXX......',
  ],
  [
    'XXXXXX....',
    'XbrrrrX...',
    'XbrrrrrX..',
    'XbrrrrrrX.',
    'XbXXXXXX..',
    'Xb........',
    'Xb........',
    'Xb........',
    'Xb........',
    'Xb........',
    'XbX.......',
    'XXXX......',
  ],
];

module.exports = function buildMap() {
  const meta = {
    width: W,
    height: H,
    waypoints: WAYPOINTS,
    regions: REGIONS.map(({ id, name, chapter, from, to }) => ({ id, name, chapter, from, to })),
  };
  add('map_world_smog', 'idle', [island('smog')], { category: 'map', file: 'map_world_smog_idle', source: 'code', meta });
  add('map_world_clear', 'idle', [island('clear')], { category: 'map', file: 'map_world_clear_idle', source: 'code', meta });
  const legend = { b: 'brass400', r: 'rust500' };
  // Marker anchor: the foot of the pole, 1px in from the left, on the bottom row.
  add('map_marker', 'idle', MARKER.map((rows) => grid(rows, legend, { w: 10, h: 12 })), {
    category: 'map',
    file: 'map_marker_idle',
    source: 'code',
    fps: 3,
    meta: { anchorX: 1, anchorY: 11 },
  });
};
