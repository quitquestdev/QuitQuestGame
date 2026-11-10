/**
 * Presentation helpers for places on the world road. Which landmark shape a
 * health milestone gets is a visual choice, so it lives here rather than in
 * the data layer.
 */

// Landmark shape by the milestone's existing icon.
const KIND_BY_ICON = {
  icon_heart: 'lantern',
  icon_heartbeat: 'lantern',
  icon_blood_drop: 'spring',
  icon_circulation: 'spring',
  icon_breath: 'beacon',
  icon_lung: 'beacon',
  icon_sprout: 'tree',
  icon_heart_healed: 'tree',
  icon_flame: 'tree',
};

export const LANDMARK_NAMES = {
  lantern: 'a lantern',
  spring: 'a spring',
  beacon: 'a beacon',
  tree: 'an ancient tree',
  stone: 'a standing stone',
};

export function landmarkKind(milestone) {
  return KIND_BY_ICON[milestone.icon] || 'stone';
}

/** "20 minutes", "8 hours", "3 days", "2 weeks", "1 year". Whole units only. */
export function durationLabel(day) {
  const minutes = Math.round(day * 1440);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (day < 1) {
    const h = Math.round(day * 24);
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  if (day >= 365 && day % 365 === 0) {
    const y = day / 365;
    return `${y} year${y === 1 ? '' : 's'}`;
  }
  if (day === 14) return '2 weeks';
  return `${day} day${day === 1 ? '' : 's'}`;
}

export const TIER_LABELS = {
  mild: 'Mild cravings',
  medium: 'Medium cravings',
  strong: 'Strong cravings',
  boss: 'The Nicotine Lord',
};
