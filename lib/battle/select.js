/**
 * Which enemy a battle uses.
 *   Practice battles (dashboard Mild / Medium / Strong buttons, map camps)
 *   keep the original rule: a random enemy from the craving strength's pool.
 *   Urge Mode picks from the world map region the player is in (by quit day).
 */
const { TIER_POOLS, REGION_POOLS } = require('./data/enemies');
const { REGIONS } = require('../journey/regions');

const pick = (list, rand) => list[Math.floor(rand() * list.length) % list.length];

function regionForDay(day) {
  return (REGIONS.find((r) => day <= r.to) || REGIONS[REGIONS.length - 1]).id;
}

function pickEnemy({ mode = 'practice', tier = 'medium', day = 0, rand = Math.random }) {
  if (mode === 'urge') return pick(REGION_POOLS[regionForDay(day)] || REGION_POOLS.ashen, rand);
  return pick(TIER_POOLS[tier] || TIER_POOLS.medium, rand);
}

module.exports = { pickEnemy, regionForDay };
