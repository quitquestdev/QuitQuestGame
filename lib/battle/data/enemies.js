/**
 * Enemies. Each one is pure data: health, hit sizes, a repeating pattern of
 * telegraphed intents, and a few taunts. Change feel here, not in code.
 *
 * Intents (shown to the player one turn ahead):
 *   attack  a normal hit (`attack` damage)
 *   charge  no damage; the enemy winds up. Its next `heavy` lands hard
 *   heavy   a big hit (`heavy` damage), only if the enemy is still charged;
 *           a stun or anything that breaks the charge turns it into a normal attack
 *   heal    the enemy restores `heal` health
 *   taunt   no damage; the enemy shows off (a free turn for the player)
 *
 * Health and damage scale with the knight's level (tuning in ./tuning.js) so
 * fights stay about one to three minutes as the knight grows.
 *
 * Taunts are playful. They never shame the player or blame them for a
 * craving.
 *
 * `xp`, `tier` and `scene` keep the values the game used before.
 */
const ENEMIES = {
  smoke_wraith: {
    id: 'smoke_wraith',
    name: 'Smoke Wraith',
    sprite: 'enemy_smoke_wraith',
    tier: 'mild',
    xp: 75,
    hp: 120,
    attack: 10,
    heavy: 26,
    heal: 0,
    pattern: ['attack', 'taunt', 'attack', 'charge', 'heavy'],
    taunts: ['Whooo... just a little wisp!', 'Catch me if you can. You cannot!', 'I drift in, I drift out.'],
    loot: 'a wisp of cool morning air',
  },
  cigarette_butt_goblin: {
    id: 'cigarette_butt_goblin',
    name: 'Cigarette-Butt Goblin',
    sprite: 'enemy_cigarette_butt_goblin',
    tier: 'mild',
    xp: 60,
    hp: 110,
    attack: 9,
    heavy: 24,
    heal: 0,
    // Quick jabs, then a lunge.
    pattern: ['attack', 'attack', 'taunt', 'attack', 'charge', 'heavy'],
    taunts: ['Hee hee! Shiny butts, all mine!', 'Nibble, nibble, jab, jab!', 'You will never find my stash!'],
    loot: 'a goblin\'s lost button',
  },
  social_pressure_imp: {
    id: 'social_pressure_imp',
    name: 'Social Pressure Imp',
    sprite: 'enemy_social_pressure_imp',
    tier: 'mild',
    xp: 50,
    hp: 100,
    attack: 9,
    heavy: 24,
    heal: 0,
    // All talk: lots of taunts, then a sudden shove.
    pattern: ['taunt', 'attack', 'taunt', 'charge', 'heavy'],
    taunts: ['Everyone is looking this way!', 'Psst! The cool table is over here!', 'Peer review! Peer review!'],
    loot: 'a party hat, slightly squashed',
  },
  stress_demon: {
    id: 'stress_demon',
    name: 'Stress Demon',
    sprite: 'enemy_stress_demon',
    tier: 'medium',
    xp: 100,
    hp: 140,
    attack: 12,
    heavy: 30,
    heal: 15,
    // Opens with a wind-up, then a frantic burst.
    pattern: ['charge', 'heavy', 'attack', 'attack', 'heal'],
    taunts: ['Deadlines! Deadlines everywhere!', 'Feel that buzz? That is me!', 'Hurry hurry hurry!'],
    loot: 'a cracked hourglass, now calm',
  },
  boredom_slime: {
    id: 'boredom_slime',
    name: 'Boredom Slime',
    sprite: 'enemy_boredom_slime',
    tier: 'strong',
    xp: 150,
    hp: 150,
    attack: 11,
    heavy: 30,
    heal: 16,
    // Slow and squishy: it heals, yawns, and slowly winds up.
    pattern: ['heal', 'attack', 'taunt', 'charge', 'heavy', 'attack'],
    taunts: ['Blorp. Nothing to do...', 'Let us just sit here. Forever.', 'Yaaawn. Wake me when it is over.'],
    loot: 'a jar of very still slime',
  },
  nicotine_lord: {
    id: 'nicotine_lord',
    name: 'The Nicotine Lord',
    sprite: 'enemy_nicotine_lord',
    tier: 'strong',
    boss: true,
    xp: 200,
    hp: 230,
    attack: 13,
    heavy: 34,
    heal: 25,
    // The boss changes rhythm below 60% health: more wind-ups and a heal.
    phases: [
      { untilHp: 0.6, pattern: ['taunt', 'attack', 'charge', 'heavy', 'attack'] },
      { untilHp: 0, pattern: ['charge', 'heavy', 'attack', 'heal', 'charge', 'heavy', 'taunt'], announce: 'The Nicotine Lord rises in a cloud of smoke!' },
    ],
    taunts: ['My smoke once covered this whole land!', 'You have come far, little knight.', 'The fog bends to me!', 'These walls have stood for years.'],
    loot: 'the Nicotine Lord\'s broken crown',
  },
};

/** Pools for each craving strength (the dashboard buttons and map camps). */
const TIER_POOLS = {
  mild: ['social_pressure_imp', 'smoke_wraith', 'cigarette_butt_goblin'],
  medium: ['stress_demon'],
  strong: ['boredom_slime', 'nicotine_lord'],
};

/**
 * Urge Mode picks from the world map region the player is in (by quit day),
 * so the enemy fits the land on the map. The boss only appears in practice
 * battles (the fortress on the map, or the Strong button), never by surprise.
 */
const REGION_POOLS = {
  ashen: ['smoke_wraith', 'cigarette_butt_goblin'],
  marsh: ['boredom_slime', 'smoke_wraith'],
  haze: ['social_pressure_imp', 'stress_demon'],
  fields: ['social_pressure_imp', 'cigarette_butt_goblin'],
  woods: ['stress_demon', 'boredom_slime'],
  heights: ['stress_demon', 'social_pressure_imp'],
  fortress: ['stress_demon', 'boredom_slime'],
  epilogue: ['smoke_wraith', 'social_pressure_imp', 'stress_demon', 'boredom_slime', 'cigarette_butt_goblin'],
};

/** Old save files used these names before the roster was renamed. */
const LEGACY_NAMES = {
  'Nicotine Imp': 'social_pressure_imp',
  'Smoke Specter': 'smoke_wraith',
  'Craving Demon': 'stress_demon',
  'Tar Monster': 'boredom_slime',
  'Addiction Dragon': 'nicotine_lord',
};

module.exports = { ENEMIES, TIER_POOLS, REGION_POOLS, LEGACY_NAMES };
