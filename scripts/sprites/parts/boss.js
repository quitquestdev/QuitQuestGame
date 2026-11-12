/**
 * The Nicotine Lord: a 64x64 smog dragon, drawn in code (no CC0 sprite at
 * this size exists, and upscaling a smaller one would break the no-pre-scaling
 * rule). Faces left, toward the hero.
 */
const { polygon, ellipse, stroke, render, Mask } = require('../lib/raster');
const { anim, dots } = require('../lib/anim');
const { add } = require('../lib/manifest');

const W = 64;
const H = 64;

const SMOG = ['indigo900', 'indigo800', 'indigo700', 'indigo600', 'indigo500', 'indigo400'];
const WING = ['indigo900', 'indigo800', 'indigo700', 'indigo600', 'indigo500'];
const BONE = ['stone700', 'stone600', 'stone500', 'stone400', 'bone'];
const HORN = ['brass800', 'brass700', 'brass600', 'brass500', 'brass400', 'brass300'];
const EMBER = ['rust700', 'rust600', 'rust500', 'rust400', 'rust300'];
const FUME = ['stone800', 'stone700', 'stone600', 'stone500', 'stone400'];

const P = (pts, dx = 0, dy = 0) => polygon(W, H, pts.map(([x, y]) => [x + dx, y + dy]));
const S = (pts, w, dx = 0, dy = 0) => stroke(W, H, pts.map(([x, y]) => [x + dx, y + dy]), w);

/** Rising smog puffs: a ring of small dithered ellipses that drift upward. */
function plumes(t, list) {
  const m = new Mask(W, H);
  list.forEach(([x, y, r], i) => m.union(ellipse(W, H, x + ((i + t) % 2), y - t, r, r * 0.8)));
  return m;
}

/**
 * pose: { t: 0..3 idle phase, lunge: px, jaw: px open, breath: bool }
 */
function drawLord({ t = 0, lunge = 0, jaw = 0, breath = false } = {}) {
  const headDy = [0, -1, -1, 0][t];
  const wingDy = [0, -1, -2, -1][t];
  const hx = -lunge;
  const hy = headDy + Math.floor(lunge / 2);

  const parts = [
    // Far wing membrane and its bone.
    { mask: P([[42, 26], [50, 12], [60, 3], [63, 14], [57, 18], [61, 26], [53, 28], [55, 36], [46, 35]], 0, wingDy), ramp: WING, base: 1 },
    { mask: S([[42, 26], [51, 11], [60, 3]], 2, 0, wingDy), ramp: BONE, base: 1 },
    { mask: S([[51, 12], [57, 18]], 1, 0, wingDy).union(S([[50, 14], [53, 28]], 1, 0, wingDy)), ramp: BONE, base: 0, flat: true },
    // Tail.
    { mask: S([[48, 56], [56, 59], [61, 55], [62, 49]], 4), ramp: SMOG, base: 1 },
    // Body.
    { mask: ellipse(W, H, 40, 45, 17, 15), ramp: SMOG, base: 2, dither: true, castShadow: false },
    // Chest, lighter smog where the embers glow through.
    { mask: ellipse(W, H, 36, 47, 7, 11), ramp: SMOG, base: 4 },
    // Neck.
    { mask: P([[29, 42], [23, 31], [20, 23], [26, 19], [33, 27], [41, 35]], hx, hy), ramp: SMOG, base: 3 },
    // Hind leg and front leg.
    { mask: P([[46, 52], [54, 50], [56, 60], [48, 62], [44, 60]]), ramp: SMOG, base: 1 },
    { mask: P([[25, 50], [32, 46], [35, 56], [30, 61], [22, 61]]), ramp: SMOG, base: 2, castShadow: true },
    // Claws.
    { mask: S([[22, 61], [20, 63]], 1).union(S([[26, 61], [25, 63]], 1), S([[30, 61], [30, 63]], 1), S([[48, 62], [47, 63]], 1), S([[53, 61], [54, 63]], 1)), ramp: HORN, base: 3, flat: true },
    // Lower jaw (opens on attack).
    { mask: P([[11, 26], [19, 27], [27, 26], [25, 30], [15, 30]], hx, hy + jaw), ramp: SMOG, base: 2 },
    // Head.
    { mask: P([[8, 22], [12, 17], [20, 13], [28, 14], [31, 19], [28, 25], [18, 27], [10, 26]], hx, hy), ramp: SMOG, base: 3, castShadow: true },
    // Horns.
    { mask: S([[24, 15], [28, 8], [34, 4]], 2, hx, hy).union(S([[27, 17], [33, 11], [39, 10]], 2, hx, hy)), ramp: HORN, base: 2 },
    // Brow ridge.
    { mask: S([[14, 17], [22, 15]], 1, hx, hy), ramp: SMOG, base: 1, flat: true },
  ];

  let img = render(W, H, parts);

  // Ember cracks in the chest: the lit end of the cigarette, smouldering inside.
  const cracks = [
    [34, 39, 'rust500'], [35, 40, 'rust400'], [35, 41, 'rust300'], [36, 42, 'rust400'], [36, 43, 'rust300'], [35, 44, 'rust400'], [35, 45, 'rust500'],
    [41, 41, 'rust500'], [42, 42, 'rust400'], [42, 43, 'rust300'], [43, 44, 'rust400'], [43, 45, 'rust500'],
    [38, 50, 'rust500'], [39, 51, 'rust400'], [38, 52, 'rust500'],
  ];
  // Eye, teeth and a nostril ember.
  const face = [
    [17 + hx, 18 + hy, 'rust400'], [18 + hx, 18 + hy, 'rust300'], [19 + hx, 18 + hy, 'bone'],
    [13 + hx, 26 + hy, 'bone'], [16 + hx, 26 + hy, 'bone'], [20 + hx, 26 + hy, 'bone'],
    [10 + hx, 21 + hy, 'rust500'],
  ];
  img = dots(img, cracks.concat(face));

  // Nostril smoke curling up (idle) or a smog breath with embers (attack).
  if (breath) {
    const pts = [];
    for (let x = 0; x < 9 + hx; x++) {
      for (let y = 22 + hy; y < 32 + hy; y++) {
        const spread = 1 + (9 + hx - x) * 1.1;
        if (Math.abs(y - (27 + hy)) <= spread && (x + y) % 2 === 0) pts.push([x, y, (x * 7 + y) % 5 === 0 ? 'rust300' : x % 3 === 0 ? 'brass400' : 'stone400']);
      }
    }
    img = dots(img, pts);
  } else {
    const wisp = [[8, 19], [7, 18], [7, 16], [6, 15], [6, 13], [5, 12]];
    img = dots(img, wisp.map(([x, y], i) => [x + hx + (i + t) % 2, y + hy - t, i % 2 ? 'stone500' : 'stone400']));
  }
  // Smog drifting off the back: sparse checker dither, no outline, so it reads as smoke.
  const smoke = [];
  plumes(t, [[50, 21, 5], [57, 29, 4], [45, 16, 4], [60, 19, 3]]).bits.forEach((b, i) => {
    const x = i % W;
    const y = Math.floor(i / W);
    if (b && (x + y + t) % 2 === 0 && !img.opaque(x, y)) smoke.push([x, y, (x + 2 * y) % 3 === 0 ? 'stone400' : 'stone500']);
  });
  return dots(img, smoke);
}

module.exports = function buildBoss() {
  const id = 'enemy_nicotine_lord';
  const o = { category: 'enemies', source: 'code' };
  const idle = [0, 1, 2, 3].map((t) => drawLord({ t }));
  const attack = [
    drawLord({ t: 0, lunge: -1 }),
    drawLord({ t: 1, lunge: 2, jaw: 1 }),
    drawLord({ t: 2, lunge: 4, jaw: 3, breath: true }),
    drawLord({ t: 3, lunge: 2, jaw: 2, breath: true }),
    drawLord({ t: 0 }),
  ];
  add(id, 'idle', idle, { ...o, file: 'boss_nicotine_lord_idle', fps: 4 });
  add(id, 'attack', attack, { ...o, file: 'boss_nicotine_lord_attack', fps: 10, loop: false });
  add(id, 'hurt', anim.hurt(idle[0], -1), { ...o, file: 'boss_nicotine_lord_hurt', fps: 10, loop: false });
};
