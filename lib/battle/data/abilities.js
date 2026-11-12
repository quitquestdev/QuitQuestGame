/**
 * Hero abilities. Every number here is tuning: change it here, not in code.
 *
 * Four abilities rehearse common, widely recommended ways to ride out a
 * craving. Their tip lines are supportive suggestions, not medical claims.
 * Strike is the original Attack. The original Special (class strike powered
 * by a charge meter) became Breathe; the unused Defend and Potion actions
 * became Delay and Sip.
 */
const ABILITIES = {
  strike: {
    id: 'strike',
    name: 'Strike',
    icon: 'icon_sword',
    short: 'A steady blow.',
    base: 10, // damage = base + perLevel * knight level
    perLevel: 5,
    cooldown: 0,
  },
  delay: {
    id: 'delay',
    name: 'Delay',
    icon: 'icon_hourglass',
    short: 'Hold the line. Blocks most of the next hit.',
    holdSeconds: 3, // the knight holds for a few seconds before the shield is up
    reduce: 0.7, // share of the next enemy hit that is blocked
    cooldown: 2, // turns before it can be used again
    tip: 'Urges tend to pass if you wait them out.',
  },
  breathe: {
    id: 'breathe',
    name: 'Breathe',
    icon: 'icon_breath',
    short: 'Slow breaths charge a powerful strike.',
    cooldown: 3,
    // Strike damage x class multiplier x (minMult..1 by breathing rhythm).
    classMult: { warrior: 3, mage: 2.7, rogue: 2.4 },
    strikeNames: { warrior: 'Mighty Strike', mage: 'Fireball', rogue: 'Shadow Strike' },
    minMult: 0.6,
    skipScore: 0.5, // skipping the breathing still gives a fair strike
    inhaleMs: 4000,
    exhaleMs: 6000,
    cycles: 2, // about 20 seconds
    shortCycles: 1, // "shorter" option: about 10 seconds
    tip: 'Slow breaths can help you settle.',
  },
  sip: {
    id: 'sip',
    name: 'Sip',
    icon: 'icon_water',
    short: 'Restore health.',
    heal: 0.3, // share of max health restored
    uses: 2, // per battle
    cooldown: 1,
    tip: 'A glass of water is a simple reset.',
  },
  distract: {
    id: 'distract',
    name: 'Distract',
    icon: 'icon_target',
    short: 'Tap the pattern to stun the enemy.',
    cooldown: 3,
    durationMs: 5000, // time to tap the pattern
    length: 4, // taps in the pattern
    tiles: 4,
    stunDamage: 6, // a small knock while it is stunned
    tip: 'Shifting your attention can take the edge off.',
  },
};

/** Order on the ability bar. */
const ABILITY_ORDER = ['strike', 'delay', 'breathe', 'sip', 'distract'];

module.exports = { ABILITIES, ABILITY_ORDER };
