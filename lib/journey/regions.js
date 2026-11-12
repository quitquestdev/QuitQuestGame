/**
 * The journey world: regions in order along one road, from the start of the
 * quit to the Nicotine Lord's fortress at day 180, then a short epilogue road
 * for the long-term milestones.
 *
 * Plain CommonJS with no React or DOM, shared by the map renderer and the
 * art build script (scripts/sprites/parts/journey.js), so the art and the
 * layout always agree on sizes.
 *
 * Day ranges follow the health milestones already in the app: the first
 * three days hold the 20-minute to 3-day milestones, Smog Marsh ends at the
 * 2-week circulation milestone, Thinning Haze at the 1-month lung milestone,
 * and Whispering Woods holds the 3-month cilia milestone.
 *
 * All sizes are native pixels; the map draws them at 2x.
 */

// World height and the rows things stand on (native pixels).
const WORLD_HEIGHT = 120;
const GROUND_TOP = 92; // first row of ground on the path layer
const PATH_TOP = 100; // trail band
const PATH_BOTTOM = 107;
const PROP_BASELINE = 99; // landmarks, signposts and camps stand here (far edge of the trail)
const KNIGHT_BASELINE = 106; // the knight's feet

// Parallax speeds: how far each layer moves per pixel the camera moves.
const LAYER_SPEEDS = { sky: 0.25, far: 0.5, mid: 0.75, ground: 1, fore: 1.25 };

// Extra pixels drawn beyond each end of a layer so a slow (or fast) layer
// still fills a viewport up to MAX_VIEW_NATIVE wide at either end of the road.
const MAX_VIEW_NATIVE = 320;
const layerPad = (speed) => Math.ceil((MAX_VIEW_NATIVE / 2) * Math.abs(1 - speed));

/**
 * from/to: inclusive quit days. width: native pixels of road.
 * scale: how days spread across the width ('linear' or 'log').
 */
const REGIONS = [
  { id: 'ashen', name: 'Ashen Wastes', from: 0, to: 3, width: 200, scale: 'linear', blurb: 'Dead grey ground under heavy smog.' },
  { id: 'marsh', name: 'Smog Marsh', from: 4, to: 14, width: 160, scale: 'linear', blurb: 'Murky water and drifting smoke, and the first green shoots.' },
  { id: 'haze', name: 'Thinning Haze', from: 15, to: 30, width: 160, scale: 'linear', blurb: 'The smog breaks apart and light gets through.' },
  { id: 'fields', name: 'Mending Fields', from: 31, to: 60, width: 200, scale: 'linear', blurb: 'Grass returns, with small flowers.' },
  { id: 'woods', name: 'Whispering Woods', from: 61, to: 120, width: 240, scale: 'linear', blurb: 'A dense living forest. Fireflies at dusk.' },
  { id: 'heights', name: 'Sunlit Heights', from: 121, to: 179, width: 200, scale: 'linear', blurb: 'Clear skies and wide views.' },
  { id: 'fortress', name: "The Nicotine Lord's Fortress", from: 180, to: 180, width: 160, scale: 'fortress', blurb: 'Where the Nicotine Lord waits.' },
  { id: 'epilogue', name: 'The Long Road', from: 181, to: 5475, width: 240, scale: 'log', blurb: 'The years beyond: one, five, ten and fifteen.' },
];

// Cumulative x positions.
let x = 0;
for (const r of REGIONS) {
  r.x0 = x;
  r.x1 = x + r.width;
  x += r.width;
}
const WORLD_WIDTH = x;

module.exports = {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  GROUND_TOP,
  PATH_TOP,
  PATH_BOTTOM,
  PROP_BASELINE,
  KNIGHT_BASELINE,
  LAYER_SPEEDS,
  MAX_VIEW_NATIVE,
  layerPad,
  REGIONS,
};
