/**
 * Battle rewards. XP comes from winning (resisting), never from starting
 * battles or logging cravings, and it tapers so rewards cannot be farmed:
 * the first few victories in a day give full XP, later ones give less, and
 * never zero. Nothing else is ever blocked: battles, Urge Mode and the
 * support panel stay fully available.
 */
const { TUNING } = require('./data/tuning');
const { enemyData } = require('./engine');

/** Factor for the next win, given earlier wins (ISO times) and now. */
function rewardFactor(previousWinTimes, now = Date.now()) {
  const r = TUNING.rewards;
  const since = now - r.windowHours * 3600 * 1000;
  const recent = previousWinTimes.filter((t) => new Date(t).getTime() >= since).length;
  if (recent < r.fullWins) return 1;
  const i = recent - r.fullWins;
  return i < r.factors.length ? r.factors[i] : r.floor;
}

/**
 * Rewards for a finished battle.
 *   state    final engine state
 *   history  the battle log ({ at, result } entries) BEFORE this battle
 * Returns { xp, baseXp, factor, capped, perfect, loot }.
 */
function battleRewards(state, history = [], now = Date.now()) {
  if (state.phase !== 'victory') return { xp: 0, baseXp: 0, factor: 1, capped: false, perfect: false, loot: null };
  const data = enemyData(state.enemy.id);
  const baseXp = data.xp + state.combo * TUNING.rewards.comboXp; // the original formula
  const factor = rewardFactor(history.filter((b) => b && b.result === 'win').map((b) => b.at), now);
  return {
    xp: Math.max(1, Math.round(baseXp * factor)),
    baseXp,
    factor,
    capped: factor < 1,
    perfect: state.hero.hp === state.hero.maxHp, // as before: a win without losing health
    loot: data.loot || null,
  };
}

module.exports = { rewardFactor, battleRewards };
