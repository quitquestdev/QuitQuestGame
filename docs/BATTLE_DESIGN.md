# Battle design note

How the battle overhaul layers on top of the existing game. Written before
the change; the README describes the result.

## What exists today

- **Start:**
  - `startBattle(intensity)` picks a random enemy from the Mild, Medium or
    Strong pool. It is used by the dashboard's Craving Emergency buttons and
    the world map's camps.
  - `startBattleAgainst(id)` is used by the map's fortress, against the
    Nicotine Lord.
  - Both call `beginBattle(enemy, tier)`, which sets `battleState` and opens
    the Battle tab.
- **State:** `battleState` lives in `components/QuitQuestRPG.jsx` and is saved
  with progress. It holds `inBattle`, `currentEnemy`, HP and max HP for both
  sides, `battleLog`, `playerTurn`, `comboCount`, `specialCharge`,
  `battlesWon`, `perfectVictories` and `tier`.
- **Turns:**
  - The player picks **Attack**: 10 + 5 × level + a random 0 to 9.
  - Or **Special**, which needs 100 charge (+20 per action) and uses a class
    multiplier: warrior 2.5, mage 2, rogue 1.8.
  - About 1.5 s later the enemy hits back for its attack value + a random
    0 to 7.
  - `defend` and `usePotion` (heal 50) exist in code but have never had
    buttons.
  - Enemy `defense` and `weakness` are unused.
- **Hero health:** 100 + 20 × knight level, where the level comes from days
  smoke-free.
- **Enemies:** six, each with hp, attack and xp. There are no patterns or
  telegraphs.
- **End:**
  - **Win:** XP = enemy xp + 10 × combo. Also `battlesWon` + 1,
    `cravingsDefeated` + 1, and `perfectVictories` + 1 if the hero is at
    full health. A particle burst plays and the result goes in
    `history.battles`.
  - **Loss:** a kind log line and nothing taken away.
  - **Flee:** back to the dashboard.
- **Achievements:** count `battlesWon` and `perfectVictories`. The Glory tab
  and the Premium Advanced Stats read these counters and the battle log.
- **UI:** a rust panel with the enemy's health, the parallax field
  (BattleField), the hero's health, and the Attack and Special buttons.
  Damage numbers, hurt frames and a victory pose already animate.

## The new layering

1. **Rules move to `lib/battle/`** as a pure state machine (`engine.js`),
   with no React and no timers. All numbers live in data files:
   `data/abilities.js`, `data/enemies.js` and `data/tuning.js`. The screen
   only presents the engine's state and the events it returns.
2. **Saved state keeps its shape.** `battleState` keeps `battlesWon`,
   `perfectVictories`, `inBattle`, `currentEnemy` and `tier`, which other
   screens read, and gains an `engine` field holding the engine's state.
   Battles saved by older versions are closed gracefully.
3. **Outcomes stay the same:**
   - Victory still adds XP (same formula), `battlesWon`, `cravingsDefeated`
     and `perfectVictories`, writes the battle log and checks achievements.
   - Defeat still takes nothing away.
   - Leaving still returns to the dashboard.
   - The only change is diminishing XP after several wins in a day; the
     counters stay accurate.
4. **Abilities:**
   - Attack becomes **Strike**.
   - Special becomes **Breathe**: a class strike powered by paced breathing
     instead of a charge meter. It keeps the class names and multipliers.
   - The unused Defend becomes **Delay**, and the unused Potion becomes
     **Sip**.
   - **Distract** is new.
5. **Telegraphs:** each enemy repeats a short pattern of intents (attack,
   charge, heavy, heal, taunt). The next intent is always shown, and damage
   is fixed, so no randomness decides a fight.
6. **Inputs:** breathing reads from a `BreathInput` (touch now). Scoring is
   independent of where the input comes from.
7. **Feel:** effects run from the engine's events: hit-stop, shake, flashes,
   numbers, particles, sounds and haptics. Reduced Effects and the system
   reduce-motion setting turn off shake, flashes and heavy particles.
8. **Urge Mode** is a one-tap entry into the same engine in `urge` mode.
   It picks the enemy by map region and has an always-visible exit and a
   support panel.
9. **Ads** are hard-blocked while any battle, Urge Mode or result screen is
   showing.
