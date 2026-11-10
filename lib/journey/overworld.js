/**
 * The overhead world: the same road as lib/journey/regions.js, drawn across
 * a map seen from above.
 *
 * The journey layout (layout.js) places everything on a one-dimensional
 * road (x from 0 to WORLD_WIDTH). This module only projects that road onto
 * the overhead map, so the data layer is shared by both map views and knows
 * nothing about either.
 *
 * Plain CommonJS with no React or DOM, shared by the map renderer and the
 * art build (scripts/sprites/parts/overworld.js), so the road the knight
 * walks is exactly the road painted on the terrain.
 *
 * All sizes are native pixels.
 */
const { REGIONS } = require('./regions');

const MAP_W = 320;
const MAP_H = 240;

/**
 * Road waypoints per region, in walking order. Each region's stretch of road
 * starts where the previous one ended. The route runs from the Ashen Wastes
 * in the south-west, north through the fields and woods, over the heights to
 * the fortress in the north-east, then down the east coast (the Long Road).
 */
const ROUTE = {
  ashen: [[20, 216], [38, 204], [58, 210], [78, 206]],
  marsh: [[98, 212], [118, 204], [132, 190], [136, 172]],
  haze: [[124, 158], [104, 152], [86, 140], [78, 122]],
  fields: [[84, 104], [102, 92], [124, 96], [144, 108], [164, 112]],
  woods: [[184, 106], [198, 94], [200, 76], [190, 60]],
  heights: [[198, 46], [216, 38], [236, 42], [252, 36]],
  fortress: [[266, 32], [276, 30]],
  epilogue: [[284, 46], [290, 70], [282, 96], [288, 124], [280, 152], [288, 180], [282, 206]],
};

/**
 * How far each region's land reaches from its stretch of road, in pixels
 * added to (or taken from) the plain distance. Keeps the mountain range and
 * the fortress's crag large and stops the fields swallowing the north-west.
 */
const TERRITORY = { ashen: 4, marsh: 2, haze: -4, fields: -4, woods: 4, heights: 24, fortress: 24, epilogue: -12 };

// Polyline segments with cumulative lengths, per region.
const SEGMENTS = [];
const REGION_ROAD = {};
{
  let prev = null;
  let total = 0;
  for (const r of REGIONS) {
    const pts = prev ? [prev, ...ROUTE[r.id]] : ROUTE[r.id];
    const start = total;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      SEGMENTS.push({ region: r.id, x1, y1, x2, y2, len, s0: total });
      total += len;
    }
    REGION_ROAD[r.id] = { s0: start, s1: total };
    prev = pts[pts.length - 1];
  }
}
const ROAD_LENGTH = SEGMENTS.reduce((a, s) => a + s.len, 0);

/** Point on the road at road distance s: { x, y, nx, ny } (unit normal, pointing left of travel). */
function pointAtS(s) {
  const seg = SEGMENTS.find((g) => s <= g.s0 + g.len) || SEGMENTS[SEGMENTS.length - 1];
  const t = seg.len ? Math.max(0, Math.min(1, (s - seg.s0) / seg.len)) : 0;
  const dx = (seg.x2 - seg.x1) / (seg.len || 1);
  const dy = (seg.y2 - seg.y1) / (seg.len || 1);
  return { x: seg.x1 + (seg.x2 - seg.x1) * t, y: seg.y1 + (seg.y2 - seg.y1) * t, nx: dy, ny: -dx };
}

/** Road distance for a journey x (layout.js): each region's span maps onto its own stretch of road. */
function sForJourneyX(jx) {
  const r = REGIONS.find((g) => jx < g.x1) || REGIONS[REGIONS.length - 1];
  const f = Math.max(0, Math.min(1, (jx - r.x0) / r.width));
  const { s0, s1 } = REGION_ROAD[r.id];
  return s0 + (s1 - s0) * f;
}

/** Map position of a journey x. */
const pointForJourneyX = (jx) => pointAtS(sForJourneyX(jx));

/**
 * Nearest point on the road to (x, y): { s, d, region }. Used by the art
 * build. `bias` (region id -> pixels) lets some regions claim more land.
 */
function nearestOnRoad(x, y, bias) {
  let best = { d: Infinity, s: 0, region: SEGMENTS[0].region };
  for (const g of SEGMENTS) {
    const vx = g.x2 - g.x1;
    const vy = g.y2 - g.y1;
    const t = g.len ? Math.max(0, Math.min(1, ((x - g.x1) * vx + (y - g.y1) * vy) / (g.len * g.len))) : 0;
    const px = g.x1 + vx * t;
    const py = g.y1 + vy * t;
    const d = Math.hypot(x - px, y - py);
    const score = bias ? d - (bias[g.region] || 0) : d;
    if (score < (best.score ?? Infinity)) best = { d, score, s: g.s0 + g.len * t, region: g.region };
  }
  return best;
}

/** The region whose land (x, y) is on (ignoring the art's ragged borders). */
const regionAtPoint = (x, y) => nearestOnRoad(x, y, TERRITORY).region;

module.exports = { MAP_W, MAP_H, ROUTE, TERRITORY, regionAtPoint, SEGMENTS, REGION_ROAD, ROAD_LENGTH, pointAtS, sForJourneyX, pointForJourneyX, nearestOnRoad };
