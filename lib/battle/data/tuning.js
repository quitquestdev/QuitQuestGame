/**
 * Battle-wide tuning: hero health, level scaling, rewards and their caps.
 * Fights aim for about one to three minutes (the boss toward three).
 */
const TUNING = {
  hero: {
    baseHp: 100, // max health = baseHp + hpPerLevel * level (as before)
    hpPerLevel: 20,
  },
  // Enemies grow with the knight so fights keep their length.
  scaling: {
    hpPerLevel: 0.3, // +30% enemy health per knight level above 1
    damagePerLevel: 0.18, // +18% enemy damage per level above 1
  },
  rewards: {
    comboXp: 10, // XP per combo hit at the moment of victory (as before)
    // Diminishing returns: the first `fullWins` victories in `windowHours`
    // give full XP, then each further win gives the next factor. Never zero:
    // genuine repeated use is never blocked, only rewarded less.
    windowHours: 24,
    fullWins: 3,
    factors: [0.5, 0.25],
    floor: 0.1,
  },
};

module.exports = { TUNING };
