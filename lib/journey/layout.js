/**
 * Journey layout: turns progress and milestone data into positions on the
 * world road. Pure functions, no React and no DOM.
 *
 * This is the boundary between data and presentation. The map never reads
 * game state directly: it receives a `JourneyData` object, so any other
 * source of progress or milestones can drive the same map.
 *
 * JourneyData {
 *   day: number                       current quit day (whole days)
 *   milestones: [{ id, day, title, description, icon, unlocked, experience }]
 *   storyBeats: [{ day, title }]
 *   encounters: [{ id, day, tier, boss? }]
 * }
 */
const { REGIONS, WORLD_WIDTH } = require('./regions');

const MIN_GAP = 22; // native pixels between neighbouring milestone landmarks
const EDGE = 8; // keep landmarks this far inside their region

/** Natural x of a day inside its region, before spacing adjustments. */
function naturalX(region, day) {
  const { x0, width, from, to } = region;
  if (region.scale === 'log') {
    const t = Math.log(Math.max(day, from) / (from - 1)) / Math.log((to + 1) / (from - 1));
    return x0 + width * Math.min(1, Math.max(0, t));
  }
  if (region.scale === 'fortress') return x0 + 40;
  return x0 + ((day - from) / (to + 1 - from)) * width;
}

/**
 * Anchor points (day -> x) for the whole road. Milestone days become anchors
 * so landmarks are spaced apart and the knight stands exactly on them.
 */
function buildAnchors(milestoneDays) {
  const anchors = [];
  for (const region of REGIONS) {
    const start = region.id === 'ashen' ? { day: region.from, x: region.x0 + 6 } : { day: region.from, x: region.x0 };
    if (region.scale === 'fortress') {
      anchors.push({ day: region.from, x: region.x0 + 40 });
      continue;
    }
    anchors.push(start);
    const days = milestoneDays.filter((d) => d > region.from && d <= region.to).sort((a, b) => a - b);
    let prev = start.x;
    for (const d of days) {
      const x = Math.min(region.x1 - EDGE, Math.max(naturalX(region, d), prev + MIN_GAP));
      anchors.push({ day: d, x });
      prev = x;
    }
  }
  const last = REGIONS[REGIONS.length - 1];
  anchors.push({ day: last.to + 1, x: last.x1 });
  // Strictly increasing in both day and x.
  return anchors.filter((a, i) => i === 0 || (a.day > anchors[i - 1].day && a.x >= anchors[i - 1].x));
}

function makeDayToX(anchors) {
  return (day) => {
    if (day <= anchors[0].day) return anchors[0].x;
    for (let i = 0; i + 1 < anchors.length; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (day <= b.day) return a.x + ((day - a.day) / (b.day - a.day)) * (b.x - a.x);
    }
    return anchors[anchors.length - 1].x;
  };
}

function regionForDay(day) {
  return REGIONS.find((r) => day <= r.to) || REGIONS[REGIONS.length - 1];
}

function regionAtX(x) {
  return REGIONS.find((r) => x < r.x1) || REGIONS[REGIONS.length - 1];
}

function buildJourneyLayout(data) {
  const day = Math.max(0, Math.floor(data.day || 0));
  const milestones = data.milestones || [];
  const anchors = buildAnchors(milestones.map((m) => m.day));
  const dayToX = makeDayToX(anchors);
  const current = regionForDay(day);

  const regions = REGIONS.map((r) => ({
    ...r,
    reached: day >= r.from,
    current: r.id === current.id,
    restored: day > r.to,
  }));
  const firstUnreached = regions.find((r) => !r.reached);
  const fortress = REGIONS.find((r) => r.id === 'fortress');

  return {
    day,
    width: WORLD_WIDTH,
    regions,
    currentRegion: regions.find((r) => r.current),
    fogStartX: firstUnreached ? firstUnreached.x0 : WORLD_WIDTH,
    playerX: Math.round(dayToX(day)),
    fortressX: fortress.x0 + 104, // centre of the fortress building
    dayToX: (d) => Math.round(dayToX(d)),
    regionAtX,
    landmarks: milestones.map((m) => ({ ...m, x: Math.round(dayToX(m.day)) })),
    stories: (data.storyBeats || []).map((s) => ({ ...s, x: Math.round(dayToX(s.day)), unlocked: s.day <= day })),
    encounters: (data.encounters || []).map((e) => ({ ...e, x: Math.round(dayToX(e.day)), unlocked: day >= e.day })),
  };
}

module.exports = { buildJourneyLayout, regionForDay, regionAtX, MIN_GAP };
