/**
 * Overhead world map art, drawn in code to the master palette (placeholders).
 *
 *   overworld_terrain        the whole land seen from above, light from the north-west
 *   overworld_shadow_<id>    the shadow over one region not yet reached (idle),
 *                            and its one-time `lift` as the shadow draws back
 *
 * Colour follows recovery, as on the road view: the Ashen Wastes and the
 * fortress have no green at all, the marsh has only a few shoots, and green
 * takes over from the fields on. The shadow is the terrain itself darkened
 * into the indigo family, so the shape of the land ahead can just be made out.
 */
const { Img } = require('../lib/image');
const { rgbOf } = require('../lib/color');
const { bayer, hash, noise2, fbm, pick } = require('../lib/noise');
const { grid } = require('../lib/grid');
const { polygon, render } = require('../lib/raster');
const { dots } = require('../lib/anim');
const { swapFamily } = require('../lib/color');
const { add } = require('../lib/manifest');
const W = require('../../../lib/journey/overworld');
const { REGIONS } = require('../../../lib/journey/regions');

const { MAP_W, MAP_H } = W;
const REGION_INDEX = Object.fromEntries(REGIONS.map((r, i) => [r.id, i]));

// ---------------------------------------------------------------- geography

/** Distance from (x, y) to a polyline. */
function distToLine(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const vx = x2 - x1;
    const vy = y2 - y1;
    const l2 = vx * vx + vy * vy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - x1 - vx * t, y - y1 - vy * t));
  }
  return best;
}

const RIVER = [[238, 54], [232, 78], [240, 100], [234, 124], [230, 140]];
const LAKE = { cx: 222, cy: 166, rx: 30, ry: 22 };

/** Per-pixel facts the painters share, computed once. */
function survey() {
  const n = MAP_W * MAP_H;
  const land = new Uint8Array(n);
  const water = new Uint8Array(n); // 1 sea, 2 lake, 3 river
  const road = new Float32Array(n); // distance to the road
  const roadRegion = new Array(n);
  const region = new Array(n); // owner region, with soft borders

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const near = W.nearestOnRoad(x + 0.5, y + 0.5);
      road[i] = near.d;
      roadRegion[i] = near.region;

      // Borders between regions wander, then dither over a few pixels.
      const wx = x + (fbm(x * 0.05, y * 0.05, 11) - 0.5) * 22 + (bayer(x, y) - 0.5) * 5;
      const wy = y + (fbm(x * 0.05, y * 0.05, 12) - 0.5) * 22 + (bayer(x + 1, y + 2) - 0.5) * 5;
      region[i] = W.nearestOnRoad(wx, wy, W.TERRITORY).region;

      // The island: a broad blob with a ragged coast, always wide around the road.
      const ex = (x - 160) / 156;
      const ey = (y - 122) / 116;
      const blob = 1 - Math.hypot(ex, ey) + (fbm(x * 0.025, y * 0.025, 3, 4) - 0.5) * 0.7;
      const isLand = blob > 0.05 || near.d < 12 + 10 * fbm(x * 0.06, y * 0.06, 4);
      const lake = ((x - LAKE.cx) / LAKE.rx) ** 2 + ((y - LAKE.cy) / LAKE.ry) ** 2 + (fbm(x * 0.07, y * 0.07, 6) - 0.5) * 0.9 < 1;
      const river = distToLine(x, y, RIVER) < 1.3 + (y > 110 ? 0.6 : 0);
      if (!isLand) water[i] = 1;
      else if ((lake || river) && near.d > 5) water[i] = lake ? 2 : 3;
      else land[i] = 1;
    }
  }

  // Distance (in steps) from land into water, and from water into land.
  const toLand = bfs(land);
  const toWater = bfs(land.map((v) => 1 - v));
  return { land, water, road, roadRegion, region, toLand, toWater };
}

/** 8-way step distance from every pixel to the nearest pixel where src is 1 (capped). */
function bfs(src, cap = 24) {
  const n = MAP_W * MAP_H;
  const d = new Uint8Array(n).fill(255);
  let q = [];
  for (let i = 0; i < n; i++) if (src[i]) { d[i] = 0; q.push(i); }
  for (let step = 1; step <= cap && q.length; step++) {
    const next = [];
    for (const i of q) {
      const x = i % MAP_W;
      const y = (i - x) / MAP_W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx;
        const Y = y + dy;
        if (X < 0 || Y < 0 || X >= MAP_W || Y >= MAP_H) continue;
        const j = Y * MAP_W + X;
        if (d[j] === 255) { d[j] = step; next.push(j); }
      }
    }
    q = next;
  }
  return d;
}

// ---------------------------------------------------------------- stamps

/**
 * Round things scattered on a jittered grid (trees, stumps, houses). Returns
 * the stamp covering (x, y) as { dx, dy, r, h } relative to its centre, or null.
 */
function stampAt(x, y, cell, seed, { density = 1, rMin = 2, rMax = 3 } = {}) {
  const cx = Math.floor(x / cell);
  const cy = Math.floor(y / cell);
  let hit = null;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i;
    const gy = cy + j;
    if (hash(gx, gy, seed) > density) continue;
    const px = gx * cell + hash(gx, gy, seed + 1) * cell;
    const py = gy * cell + hash(gx, gy, seed + 2) * cell;
    const r = rMin + hash(gx, gy, seed + 3) * (rMax - rMin);
    const dx = x + 0.5 - px;
    const dy = y + 0.5 - py;
    // Later (further south) stamps overlap earlier ones, as seen from above at a slight angle.
    if (dx * dx + dy * dy <= r * r && (!hit || py > hit.py)) hit = { dx, dy, r, py, h: hash(gx, gy, seed + 4) };
  }
  return hit;
}

/** Shade a round stamp lit from the north-west: 0 (shadow side) .. 1 (lit). */
const lit = (s) => Math.max(0, Math.min(1, 0.5 - (s.dx + s.dy) / (2.4 * s.r)));

/** Is (x, y) in the soft shadow cast south-east by a stamp? */
function castShadow(x, y, cell, seed, opts, off = 1) {
  return !!stampAt(x - off, y - off, cell, seed, opts);
}

// ---------------------------------------------------------------- regions

const ROAD = {
  ashen: ['stone700', 'stone500', 'stone400'],
  marsh: ['brass800', 'brass600', 'brass500'],
  haze: ['stone700', 'stone500', 'stone400'],
  fields: ['brass700', 'brass500', 'brass400'],
  woods: ['brass800', 'brass600', 'brass500'],
  heights: ['stone600', 'stone400', 'bone'],
  fortress: ['indigo900', 'stone600', 'stone500'],
  epilogue: ['brass600', 'brass400', 'brass300'],
};

const SAND = {
  ashen: ['stone600', 'stone500'],
  marsh: ['stone600', 'brass700'],
  haze: ['stone500', 'stone400'],
  fields: ['brass500', 'brass400'],
  woods: ['brass500', 'brass400'],
  heights: ['stone500', 'stone400'],
  fortress: ['stone800', 'stone700'],
  epilogue: ['brass400', 'brass300'],
};

/**
 * Peaks drawn the way 16-bit overworld maps draw them: a triangle seen at a
 * slight angle, the west face lit and the east face in shadow, snow on top.
 * Placed on a jittered grid wherever the land belongs to the heights (or, as
 * dark crags, to the fortress), and kept clear of the road.
 */
function placePeaks(sv) {
  const peaks = [];
  const cell = 9;
  for (let gy = 0; gy * cell < MAP_H + cell; gy++) {
    for (let gx = 0; gx * cell < MAP_W; gx++) {
      const x = Math.round(gx * cell + (hash(gx, gy, 201) - 0.5) * 6 + (gy % 2) * 4);
      const y = Math.round(gy * cell + (hash(gx, gy, 202) - 0.5) * 5);
      if (x < 2 || y < 4 || x >= MAP_W - 2 || y >= MAP_H) continue;
      const i = y * MAP_W + x;
      const reg = sv.region[i];
      if (reg !== 'heights' && reg !== 'fortress') continue;
      if (!sv.land[i] || sv.toWater[i] < 3) continue;
      if (reg === 'fortress' && hash(gx, gy, 203) < 0.45) continue;
      const w = 5 + Math.floor(hash(gx, gy, 204) * 4);
      const h = Math.round(w * (1.3 + hash(gx, gy, 205) * 0.5));
      // Keep the whole base and body off the road.
      let clear = true;
      for (let dx = -w - 1; dx <= w + 1 && clear; dx += 2) for (let dy = -h; dy <= 1 && clear; dy += 2) {
        const X = x + dx;
        const Y = y + dy;
        if (X >= 0 && Y >= 0 && X < MAP_W && Y < MAP_H && Math.abs(dx) <= w * (1 + dy / h) + 1 && sv.road[Y * MAP_W + X] < 4) clear = false;
      }
      if (clear) peaks.push({ x, y, w, h, dark: reg === 'fortress' });
    }
  }
  return peaks.sort((a, b) => a.y - b.y);
}

/** The peak covering (x, y), front-most first, as { face, snow, edge, dark } or null. */
function peakAt(peaks, x, y) {
  for (let k = peaks.length - 1; k >= 0; k--) {
    const p = peaks[k];
    if (y > p.y || y < p.y - p.h || x < p.x - p.w || x > p.x + p.w) continue;
    const up = (p.y - y) / p.h; // 0 at the base, 1 at the tip
    const half = p.w * (1 - up);
    const dx = x - p.x;
    if (Math.abs(dx) > half) continue;
    const ridge = Math.round(noise2(x * 0.4, y * 0.4, 207) * 1.5 - 0.5);
    return { face: dx + ridge * (up > 0.2 ? 1 : 0) <= 0 ? 'lit' : 'shade', snow: up > 0.58, edge: Math.abs(dx) > half - 1 || y === p.y, up, dark: p.dark };
  }
  return null;
}

function peakToken(pk, x, y) {
  if (pk.dark) {
    if (pk.up > 0.8) return 'rust500';
    if (pk.edge) return 'indigo950';
    return pk.face === 'lit' ? pick(['stone800', 'stone700'], pk.up, x, y) : 'indigo900';
  }
  if (pk.edge && !pk.snow) return pk.face === 'lit' ? 'stone600' : 'indigo700';
  if (pk.snow) return pk.face === 'lit' ? 'bone' : 'indigo300';
  return pk.face === 'lit' ? pick(['stone500', 'stone400'], pk.up * 1.6, x, y) : pick(['indigo600', 'indigo500'], pk.up * 1.6, x, y);
}

const PAINT = {
  ashen(x, y, c) {
    const crack = Math.abs(fbm(x * 0.09, y * 0.09, 31) - 0.5) < 0.018;
    if (crack) return 'stone800';
    const crater = stampAt(x, y, 22, 32, { density: 0.5, rMin: 3, rMax: 5 });
    if (crater && c.road > 4) {
      const d = Math.hypot(crater.dx, crater.dy) / crater.r;
      if (d > 0.7) return crater.dx + crater.dy < 0 ? 'stone800' : 'stone500';
      return 'stone700';
    }
    const stump = stampAt(x, y, 7, 33, { density: 0.35, rMin: 0.8, rMax: 1.2 });
    if (stump && c.road > 3) return 'stone800';
    if (castShadow(x, y, 7, 33, { density: 0.35, rMin: 0.8, rMax: 1.2 }) && c.road > 3) return 'stone700';
    return pick(['stone700', 'stone600', 'stone600', 'stone500'], fbm(x * 0.06, y * 0.06, 34), x, y);
  },
  marsh(x, y, c) {
    const pool = fbm(x * 0.07, y * 0.07, 41);
    if (pool > 0.6 && c.road > 3) {
      if (pool > 0.64) return (x + y * 3) % 11 === 0 ? 'stone600' : pick(['indigo900', 'indigo800', 'indigo800'], fbm(x * 0.2, y * 0.2, 42), x, y);
      return 'stone800';
    }
    if (pool > 0.54 && c.road > 2) {
      const h = hash(x, y, 43);
      if (h < 0.05) return 'moss700'; // the first shoots
      if (h < 0.22) return y % 2 ? 'brass700' : 'brass600'; // reeds
    }
    return pick(['brass800', 'stone700', 'stone700', 'stone600'], fbm(x * 0.06, y * 0.06, 44), x, y);
  },
  haze(x, y, c) {
    const scrub = fbm(x * 0.08, y * 0.08, 51);
    if (scrub > 0.6 && c.road > 2 && bayer(x, y) < (scrub - 0.6) * 5) return hash(x, y, 52) < 0.5 ? 'moss700' : 'moss800';
    const rock = stampAt(x, y, 13, 53, { density: 0.4, rMin: 1, rMax: 2 });
    if (rock && c.road > 3) return lit(rock) > 0.55 ? 'stone400' : 'stone600';
    return pick(['stone700', 'stone600', 'stone500', 'stone500'], fbm(x * 0.05, y * 0.05, 54), x, y);
  },
  fields(x, y, c) {
    const tree = stampAt(x, y, 18, 61, { density: 0.35, rMin: 2, rMax: 3 });
    if (tree && c.road > 4) return pick(['moss700', 'moss600', 'moss500', 'moss400'], lit(tree), x, y);
    if (castShadow(x, y, 18, 61, { density: 0.35, rMin: 2, rMax: 3 }, 2) && c.road > 4) return 'moss700';
    const hedge = Math.abs(fbm(x * 0.045, y * 0.045, 62) - 0.5) < 0.012;
    if (hedge && c.road > 3) return 'moss700';
    const h = hash(x, y, 63);
    if (h < 0.025 && c.road > 2) return ['rust400', 'brass300', 'bone'][Math.floor(h * 120)];
    return pick(['moss600', 'moss500', 'moss500', 'moss400'], fbm(x * 0.05, y * 0.05, 64), x, y);
  },
  woods(x, y, c) {
    const opts = { density: 0.95, rMin: 2.6, rMax: 4 };
    if (c.road > 3.5) {
      const tree = stampAt(x, y, 5, 71, opts);
      if (tree) {
        const l = lit(tree);
        return pick(['moss800', 'moss700', 'moss600', 'moss500', 'moss400'], 0.15 + l * 0.85, x, y);
      }
    }
    if (castShadow(x, y, 5, 71, opts, 2) && c.road > 2) return 'moss800';
    return pick(['moss800', 'moss700', 'moss700', 'moss600'], fbm(x * 0.07, y * 0.07, 72), x, y);
  },
  heights(x, y, c) {
    const h = hash(x, y, 81);
    if (h < 0.02 && c.road > 2) return h < 0.01 ? 'brass300' : 'bone';
    return pick(['moss500', 'moss400', 'moss400', 'moss300'], fbm(x * 0.05, y * 0.05, 82), x, y);
  },
  fortress(x, y, c) {
    const lava = Math.abs(fbm(x * 0.07, y * 0.07, 91) - 0.5);
    if (lava < 0.012 && c.road > 2) return 'rust500';
    if (lava < 0.024 && c.road > 2) return bayer(x, y) < 0.5 ? 'rust700' : 'rust600';
    if (hash(x, y, 92) < 0.03) return 'stone700';
    return pick(['indigo900', 'stone800', 'stone800', 'stone700'], fbm(x * 0.06, y * 0.06, 93), x, y);
  },
  epilogue(x, y, c) {
    if (c.road > 3 && c.road < 12) {
      const house = stampAt(x, y, 16, 101, { density: 0.3, rMin: 1.6, rMax: 2.2 });
      if (house) return house.dy < -0.3 ? (house.dx < 0 ? 'rust500' : 'rust600') : 'bone';
    }
    const tree = stampAt(x, y, 7, 102, { density: 0.45, rMin: 1.5, rMax: 2.2 });
    if (tree && c.road > 3) return hash(x, y, 103) < 0.12 ? 'rust400' : pick(['moss600', 'moss500', 'moss400'], lit(tree), x, y);
    const wheat = fbm(x * 0.05, y * 0.05, 104);
    if (wheat > 0.58 && c.road > 2) return (x + y) % 3 === 0 ? 'brass500' : 'brass400';
    return pick(['moss600', 'moss500', 'moss400', 'moss400'], fbm(x * 0.05, y * 0.05, 105), x, y);
  },
};

function waterToken(kind, steps, x, y) {
  if (kind === 3) return (x + y) % 4 === 0 ? 'indigo400' : 'indigo500'; // river
  if (steps <= 1) return bayer(x, y) < 0.35 ? 'indigo300' : 'indigo400';
  const depth = Math.min(1, (steps - 1) / (kind === 2 ? 8 : 14));
  const wave = hash(Math.floor(x / 3), y, 111) < 0.04 && y % 3 === 0;
  if (wave && depth > 0.2) return 'indigo500';
  return pick(['indigo500', 'indigo600', 'indigo700', 'indigo700', 'indigo800'], depth, x, y);
}

function paintTerrain(sv) {
  const peaks = placePeaks(sv);
  const img = new Img(MAP_W, MAP_H);
  const tokens = new Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const reg = sv.region[i];
      let t;
      if (!sv.land[i]) {
        t = waterToken(sv.water[i], sv.toLand[i], x, y);
      } else if (sv.road[i] < 1.6) {
        const [edge, body, light] = ROAD[sv.roadRegion[i]];
        t = sv.road[i] < 0.9 ? (bayer(x, y) < 0.25 ? light : body) : edge;
      } else if (sv.toWater[i] <= 2 && sv.water[nearestWater(sv, x, y)] !== 3) {
        const [a, b] = SAND[reg];
        t = sv.toWater[i] === 1 ? a : b;
      } else {
        const pk = peakAt(peaks, x, y);
        t = pk ? peakToken(pk, x, y) : PAINT[reg](x, y, { road: sv.road[i] });
        // Peaks cast a short shadow to the south-east.
        if (!pk && (reg === 'heights' || reg === 'fortress') && peakAt(peaks, x - 2, y - 1)) t = reg === 'fortress' ? 'indigo950' : 'moss600';
      }
      tokens[i] = t;
      img.set(x, y, rgbOf(t));
    }
  }
  return { img, tokens };
}

/** Index of a water pixel next to (x, y), for telling river banks from coasts. */
function nearestWater(sv, x, y) {
  for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const X = x + dx;
    const Y = y + dy;
    if (X < 0 || Y < 0 || X >= MAP_W || Y >= MAP_H) continue;
    const j = Y * MAP_W + X;
    if (!sv.land[j]) return j;
  }
  return 0;
}

// ---------------------------------------------------------------- shadow

/** The terrain colour under shadow: the same shape, pushed down into indigo. */
const SHADE = new Map();
function shadeOf(token) {
  if (!SHADE.has(token)) {
    const [r, g, b] = rgbOf(token);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    SHADE.set(token, L < 45 ? 'indigo950' : L < 95 ? 'indigo900' : L < 150 ? 'indigo800' : L < 200 ? 'indigo700' : 'indigo600');
  }
  return SHADE.get(token);
}

const FRINGE = 6; // pixels the soft edge of a shadow reaches onto land already lit

/**
 * One region's shadow, cropped to its bounds. It covers the region and
 * reaches FRINGE pixels onto the regions before it in a thinning dither (the
 * soft edge of the shadow). Where that neighbour is still in shadow too, the
 * fringe lands on identical pixels, so shadows join without a seam.
 *
 * keep < 1 gives the reveal frames: the shadow draws back from the land
 * already lit toward the far side of the region, pixel by pixel.
 */
function paintShadows(sv, tokens) {
  const n = MAP_W * MAP_H;
  const out = {};
  REGIONS.forEach((r, k) => {
    const mine = new Uint8Array(n);
    const before = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (sv.region[i] === r.id) mine[i] = 1;
      else if (REGION_INDEX[sv.region[i]] < k) before[i] = 1;
    }
    const fromMine = bfs(mine, FRINGE + 2);
    const fromBefore = bfs(before, 60);
    let x0 = MAP_W, y0 = MAP_H, x1 = -1, y1 = -1;
    let far = 1;
    const cover = new Float32Array(n).fill(-1); // -1 not covered; else 0..1 order of retreat
    for (let i = 0; i < n; i++) {
      const x = i % MAP_W;
      const y = (i - x) / MAP_W;
      if (mine[i]) {
        // The first region has nothing before it: its shadow draws back from the road's start.
        cover[i] = k === 0 ? Math.hypot(x - W.ROUTE.ashen[0][0], y - W.ROUTE.ashen[0][1]) : fromBefore[i];
        far = Math.max(far, Math.min(60, cover[i]));
      } else if (before[i] && fromMine[i] <= FRINGE) {
        // Wobble the edge so it is not a copy of the region border.
        const d = fromMine[i] + (noise2(x * 0.2, y * 0.2, 401) - 0.5) * 3;
        if (bayer(x, y) < 1 - d / (FRINGE + 1)) cover[i] = 0;
      }
      if (cover[i] >= 0) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    const frame = (keep) => {
      const img = new Img(x1 - x0 + 1, y1 - y0 + 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * MAP_W + x;
        if (cover[i] < 0) continue;
        if (keep < 1) {
          const v = 0.6 * Math.min(1, cover[i] / far) + 0.4 * bayer(x + 1, y + 3);
          if (v < 1 - keep) continue;
        }
        img.set(x - x0, y - y0, rgbOf(shadeOf(tokens[i])));
      }
      return img;
    };
    out[r.id] = { x: x0, y: y0, idle: frame(1), lift: [0.8, 0.55, 0.3, 0.08].map(frame) };
  });
  return out;
}

// ---------------------------------------------------------------- markers

const L = (lit, locked) => ({ lit, locked });
function icon(rows, legend, w, h) {
  return grid(rows, legend, { w, h });
}

/** Landmarks, 9x11, seen at the slight angle the map's peaks use. */
const MARKS = {
  beacon: {
    rows: (f) => [
      f ? '...f.....' : '....f....',
      f ? '...fFf...' : '...fFf...',
      '...fFf...',
      '..XbbbX..',
      '...XsX...',
      '...XsX...',
      '...XsX...',
      '...XsX...',
      '..XsssX..',
      '..XXXXX..',
      '.........',
    ],
    legend: L({ f: 'rust400', F: 'brass300', b: 'brass500', s: 'stone400' }, { f: 'stone700', F: 'stone700', b: 'stone600', s: 'stone600' }),
  },
  lantern: {
    rows: () => [
      '...XXX...',
      '..XbbbX..',
      '..XLLLX..',
      '..XLlLX..',
      '..XbbbX..',
      '...XpX...',
      '...XpX...',
      '...XpX...',
      '...XpX...',
      '..XpppX..',
      '..XXXXX..',
    ],
    legend: L({ b: 'brass500', L: 'brass300', l: 'bone', p: 'brass600' }, { b: 'stone600', L: 'indigo900', l: 'indigo900', p: 'stone700' }),
    frames: [{}, { l: 'brass300', L: 'bone' }],
  },
  spring: {
    rows: (f) => [
      '.........',
      f ? '...w.w...' : '....w....',
      f ? '..w...w..' : '...w.w...',
      f ? '..w...w..' : '...w.w...',
      '..XXXXX..',
      '.XsWWWsX.',
      'XsWwWWWsX',
      'XsWWWwWsX',
      '.XsWWWsX.',
      '..XXXXX..',
      '.........',
    ],
    legend: L({ w: 'indigo300', W: 'indigo400', s: 'stone400' }, { w: 'stone800', W: 'stone800', s: 'stone600' }),
  },
  tree: {
    rows: (f) => [
      '...XXX...',
      '..XgGgX..',
      f ? '.XgGGgdX.' : '.XgGgGdX.',
      '.XgGgddX.',
      '.XgggddX.',
      '..XdddX..',
      '...XtX...',
      '...XtX...',
      '..XtttX..',
      '...XXX...',
      '.........',
    ],
    legend: L({ g: 'moss500', G: 'moss300', d: 'moss600', t: 'brass600' }, { g: 'stone700', G: 'stone600', d: 'stone800', t: 'stone700' }),
  },
  stone: {
    rows: () => [
      '...XXX...',
      '..XsssX..',
      '..XsRsX..',
      '..XssdX..',
      '..XsRdX..',
      '..XssdX..',
      '..XsRdX..',
      '..XssdX..',
      '.XsssddX.',
      '.XXXXXXX.',
      '.........',
    ],
    legend: L({ s: 'stone400', d: 'stone500', R: 'moss300' }, { s: 'stone600', d: 'stone700', R: 'stone700' }),
    frames: [{}, { R: 'bone' }],
  },
};

function markFrames(kind, isLit) {
  const m = MARKS[kind];
  const legend = isLit ? m.legend.lit : m.legend.locked;
  if (!isLit) return [icon(m.rows(0), legend, 9, 11)];
  if (m.frames) return m.frames.map((over) => icon(m.rows(0), { ...legend, ...over }, 9, 11));
  return [0, 1].map((f) => icon(m.rows(f), legend, 9, 11));
}

const STORY_ROWS = [
  'XXXXXXX',
  'XBBBBBX',
  'XBkkkBX',
  'XBBBBBX',
  'XXXpXXX',
  '..XpX..',
  '..XpX..',
  '.XpppX.',
  '.XXXXX.',
];

const CAMP_ROWS = (f) => [
  f ? '....Xf...' : '....Xff..',
  '...XrX...',
  '..XRrrX..',
  '..XRrrX..',
  '.XRRrrrX.',
  '.XRRkrrX.',
  'XRRRkrrrX',
  'XXXXXXXXX',
  '.........',
];

/** The fortress, 24x24: towers, keep and spires, with ember-lit windows. */
function fortressIcon(f) {
  const g = (pts) => polygon(24, 24, pts);
  const rect = (a, b, c, d) => g([[a, b], [c + 1, b], [c + 1, d + 1], [a, d + 1]]);
  const DARK = ['indigo950', 'indigo900', 'stone800', 'stone700', 'stone600'];
  const merlons = rect(1, 7, 1, 8);
  for (let x = 1; x <= 22; x += 2) merlons.union(rect(x, 7, x, 8), rect(x, 13, x, 14));
  let img = render(24, 24, [
    { mask: rect(2, 14, 21, 22), ramp: DARK, base: 3 },
    { mask: rect(0, 8, 5, 22).union(rect(18, 8, 23, 22), merlons), ramp: DARK, base: 3 },
    { mask: rect(8, 5, 15, 22), ramp: DARK, base: 4 },
    { mask: g([[0, 8], [3, 1], [6, 8]]).union(g([[17, 8], [20.5, 1], [24, 8]]), g([[7, 5], [12, -1], [17, 5]])), ramp: ['indigo950', 'indigo900', 'indigo800', 'indigo700'], base: 2 },
    { mask: rect(10, 18, 13, 22), ramp: ['indigo950'], base: 0, flat: true },
  ]);
  const windows = [[2, 11], [21, 11], [11, 9], [12, 9], [11, 14], [12, 14], [3, 17], [20, 17]];
  return dots(img, windows.map(([x, y], i) => [x, y, (i + f) % 3 === 0 ? 'rust300' : 'rust400']));
}

/** The knight on the map, 9x12: plume, helm, shield and sword arm. */
const KNIGHT_ROWS = [
  '....RR...',
  '...XRRX..',
  '..XHHHHX.',
  '..XHvvHX.',
  '..XHHHHX.',
  '.XSXAAAAX',
  'XSsSXAAAX',
  'XSSSXAAAX',
  '.XSXAAAAX',
  '..XLLXLLX',
  '..XLX.XLX',
  '..XX...XX',
];
const KNIGHT_LEGEND = { R: 'rust400', H: 'stone400', v: 'indigo900', S: 'indigo500', s: 'bone', A: 'stone500', L: 'rust600' };

// ---------------------------------------------------------------- ambience

/** Glints on open water: sparse two-pixel highlights that move between frames. */
function seaGlints(sv, f) {
  const img = new Img(MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W - 1; x++) {
    const i = y * MAP_W + x;
    if (sv.land[i] || sv.water[i] === 3 || sv.toLand[i] < 3 || sv.toLand[i + 1] < 3) continue;
    if (hash(x >> 1, y, 300 + f) < 0.012 && x % 2 === 0) {
      img.set(x, y, rgbOf('indigo300'));
      img.set(x + 1, y, rgbOf(sv.toLand[i] > 8 ? 'indigo500' : 'indigo400'));
    }
  }
  return img;
}

/** A small drifting cloud, 36x16: lit from the north-west, ragged dithered edges. */
function cloud(seed) {
  const w = 36;
  const h = 16;
  const img = new Img(w, h);
  const puffs = [[10, 9, 7, 5], [18, 7, 8, 6], [26, 9, 7, 5], [16, 11, 10, 4]].map(([x, y, rx, ry], k) => [x + (hash(k, seed, 501) - 0.5) * 4, y, rx, ry]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let inside = 0;
    for (const [cx, cy, rx, ry] of puffs) inside = Math.max(inside, 1 - Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry));
    if (inside <= 0) continue;
    if (inside < 0.18 && bayer(x, y) > inside * 4) continue; // ragged, see-through edge
    const under = y > 10 || (y > 8 && inside < 0.3);
    img.set(x, y, rgbOf(under ? 'indigo300' : bayer(x, y) < 0.15 && inside < 0.4 ? 'indigo300' : 'bone'));
  }
  return img;
}

// ---------------------------------------------------------------- build

function buildOverworld() {
  const o = { category: 'map', source: 'code' };
  const sv = survey();
  const { img, tokens } = paintTerrain(sv);
  add('overworld_terrain', 'idle', [img], { ...o, file: 'overworld_terrain_idle', meta: { mapWidth: MAP_W, mapHeight: MAP_H } });
  add('overworld_sea', 'idle', [0, 1, 2].map((f) => seaGlints(sv, f)), { ...o, file: 'overworld_sea_idle', fps: 2 });

  const shadows = paintShadows(sv, tokens);
  for (const [id, sh] of Object.entries(shadows)) {
    const meta = { x: sh.x, y: sh.y };
    add(`overworld_shadow_${id}`, 'idle', [sh.idle], { ...o, file: `overworld_shadow_${id}_idle`, meta });
    add(`overworld_shadow_${id}`, 'lift', sh.lift, { ...o, file: `overworld_shadow_${id}_lift`, fps: 5, loop: false, meta });
  }

  for (const kind of Object.keys(MARKS)) {
    add(`overworld_lm_${kind}`, 'lit', markFrames(kind, true), { ...o, file: `overworld_lm_${kind}_lit`, fps: 3, defaultAnimation: 'lit' });
    add(`overworld_lm_${kind}`, 'locked', markFrames(kind, false), { ...o, file: `overworld_lm_${kind}_locked` });
  }
  add('overworld_story', 'unlocked', [icon(STORY_ROWS, { B: 'bone', k: 'stone600', p: 'brass600' }, 7, 9)], { ...o, file: 'overworld_story_unlocked', defaultAnimation: 'unlocked' });
  add('overworld_story', 'locked', [icon(STORY_ROWS, { B: 'stone600', k: 'stone700', p: 'stone700' }, 7, 9)], { ...o, file: 'overworld_story_locked' });
  const campLegend = { r: 'rust600', R: 'rust500', k: 'indigo950', f: 'rust300' };
  add('overworld_camp', 'idle', [0, 1].map((f) => icon(CAMP_ROWS(f), campLegend, 9, 9)), { ...o, file: 'overworld_camp_idle', fps: 3 });
  add('overworld_camp', 'locked', [icon(CAMP_ROWS(0), { r: 'stone700', R: 'stone600', k: 'indigo950', f: 'stone600' }, 9, 9)], { ...o, file: 'overworld_camp_locked' });
  add('overworld_fortress', 'idle', [0, 1, 2].map(fortressIcon), { ...o, file: 'overworld_fortress_idle', fps: 2 });

  const knight = icon(KNIGHT_ROWS, KNIGHT_LEGEND, 9, 12);
  const classes = {
    warrior: knight,
    mage: swapFamily(knight, 'rust', 'indigo'),
    rogue: swapFamily(swapFamily(knight, 'rust', 'stone'), 'indigo', 'stone'),
  };
  for (const [cls, k] of Object.entries(classes)) {
    // A spare transparent row on top so the walking bob never clips.
    const base = new Img(9, 13);
    for (let y = 0; y < 12; y++) for (let x = 0; x < 9; x++) base.set(x, y + 1, k.get(x, y));
    add(`overworld_knight_${cls}`, 'idle', [base], { ...o, file: `overworld_knight_${cls}_idle` });
    add(`overworld_knight_${cls}`, 'walk', [base, base.shift(0, -1)], { ...o, file: `overworld_knight_${cls}_walk`, fps: 6 });
  }

  add('overworld_cloud', 'idle', [cloud(1)], { ...o, file: 'overworld_cloud_idle' });
}

buildOverworld.survey = survey;
buildOverworld.paintTerrain = paintTerrain;
buildOverworld.paintShadows = paintShadows;
module.exports = buildOverworld;
