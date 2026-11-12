/**
 * The battle rules: a small state machine with no React, no DOM and no
 * timers, so it is unit tested and any screen (web now, React Native later)
 * can present it.
 *
 *   createBattle(options)          -> state (phase 'player', enemy intent shown)
 *   available(state)               -> which abilities can be used now, and why not
 *   playerAct(state, action)       -> { state, events }   phase -> 'enemy' | 'victory' | 'retreat'
 *   enemyAct(state)                -> { state, events }   phase -> 'player' | 'defeat'
 *
 * Turn order: the player sees the enemy's NEXT move (its intent), acts, then
 * the enemy carries out exactly the intent it showed. No hidden randomness:
 * damage is fixed by the data files, so a choice made against the telegraph
 * always plays out as expected.
 *
 * Mini-games run in the presentation layer and report a result:
 *   { type: 'breathe', score }       score 0..1 from lib/battle/breath.js (or skip)
 *   { type: 'distract', success }    from lib/battle/distract.js
 *
 * `events` describe what happened, in order, for the screen to animate:
 *   { type: 'hit', target: 'enemy'|'hero', amount, ability?, big? }
 *   { type: 'heal', target, amount } { type: 'shield', amount } { type: 'stun' }
 *   { type: 'miss' } { type: 'intent', intent } { type: 'taunt', text }
 *   { type: 'charge' } { type: 'phase', text } { type: 'victory' } { type: 'defeat' }
 *   { type: 'tip', text }
 */
const { ABILITIES } = require('./data/abilities');
const { ENEMIES, LEGACY_NAMES } = require('./data/enemies');
const { TUNING } = require('./data/tuning');

const ENGINE_VERSION = 2;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function enemyData(idOrName) {
  return ENEMIES[idOrName] || ENEMIES[LEGACY_NAMES[idOrName]] || null;
}

const heroMaxHp = (level) => TUNING.hero.baseHp + TUNING.hero.hpPerLevel * level;
const levelScale = (level, per) => 1 + per * Math.max(0, level - 1);
const strikeDamage = (level) => ABILITIES.strike.base + ABILITIES.strike.perLevel * level;

function scaledEnemy(e, level) {
  const d = (n) => Math.round(n * levelScale(level, TUNING.scaling.damagePerLevel));
  return {
    id: e.id,
    name: e.name,
    sprite: e.sprite,
    boss: !!e.boss,
    maxHp: Math.round(e.hp * levelScale(level, TUNING.scaling.hpPerLevel)),
    attack: d(e.attack),
    heavy: d(e.heavy),
    heal: d(e.heal || 0),
  };
}

/** The intent pattern in force (bosses switch pattern as their health drops). */
function patternFor(e, hpFraction) {
  if (!e.phases) return { pattern: e.pattern, phase: 0 };
  for (let i = 0; i < e.phases.length; i++) {
    if (hpFraction > e.phases[i].untilHp) return { pattern: e.phases[i].pattern, phase: i };
  }
  const last = e.phases.length - 1;
  return { pattern: e.phases[last].pattern, phase: last };
}

const INTENT_LABELS = { attack: 'Attack', heavy: 'Heavy blow', charge: 'Charge', heal: 'Heal', taunt: 'Taunt', stunned: 'Stunned' };

function intentFor(state, type) {
  const e = state.enemy;
  // A heavy blow needs a charge; without one it is a normal attack.
  const t = type === 'heavy' && !e.charged ? 'attack' : type;
  const power = t === 'attack' ? e.attack : t === 'heavy' ? e.heavy : t === 'heal' ? e.heal : 0;
  return { type: t, power, label: INTENT_LABELS[t] };
}

function nextIntent(state) {
  const data = enemyData(state.enemy.id);
  const { pattern } = patternFor(data, state.enemy.hp / state.enemy.maxHp);
  const type = pattern[state.enemy.step % pattern.length];
  return intentFor(state, type);
}

/**
 * Start a battle.
 *   enemyId  an id from data/enemies.js (old save names also work)
 *   level    knight level (from smoke-free days)
 *   heroClass warrior | mage | rogue
 *   tier     mild | medium | strong | boss | urge | other (for logs and rewards)
 *   mode     'practice' (dashboard, map) or 'urge' (Urge Mode)
 */
function createBattle({ enemyId, level = 1, heroClass = 'warrior', heroName = 'Hero', tier = 'other', mode = 'practice' }) {
  const data = enemyData(enemyId);
  if (!data) throw new Error(`unknown enemy ${enemyId}`);
  const enemy = { ...scaledEnemy(data, level), charged: false, stunned: false, step: 0, phase: 0 };
  enemy.hp = enemy.maxHp;
  const maxHp = heroMaxHp(level);
  const state = {
    v: ENGINE_VERSION,
    phase: 'player',
    turn: 1,
    mode,
    tier,
    hero: { name: heroName, cls: heroClass, level, hp: maxHp, maxHp, shield: 0, sipsLeft: ABILITIES.sip.uses },
    enemy,
    cooldowns: { delay: 0, breathe: 0, sip: 0, distract: 0 },
    combo: 0,
    tookDamage: false,
    intent: null,
    log: [`A wild ${enemy.name} appears!`],
  };
  state.intent = nextIntent(state);
  return state;
}

/** Abilities usable right now: { [id]: { ok, reason?, cooldown?, usesLeft? } }. */
function available(state) {
  const out = {};
  for (const id of Object.keys(ABILITIES)) {
    const cd = state.cooldowns[id] || 0;
    let ok = state.phase === 'player';
    let reason = ok ? null : 'not_your_turn';
    if (ok && id === 'sip' && state.hero.sipsLeft <= 0) {
      ok = false;
      reason = 'no_uses';
    }
    if (ok && cd > 0) {
      ok = false;
      reason = 'cooldown';
    }
    out[id] = { ok, reason, cooldown: cd, ...(id === 'sip' ? { usesLeft: state.hero.sipsLeft } : {}) };
  }
  return out;
}

function clone(s) {
  return JSON.parse(JSON.stringify(s));
}

/** The player's move. Returns the new state and what happened. */
function playerAct(prev, action) {
  if (prev.phase !== 'player') return { state: prev, events: [], rejected: 'not_your_turn' };
  const state = clone(prev);
  const events = [];
  const type = action && action.type;

  if (type === 'retreat') {
    state.phase = 'retreat';
    state.log.push('You stepped back from the battle. That is always allowed.');
    return { state, events: [{ type: 'retreat' }] };
  }

  const ab = ABILITIES[type];
  if (!ab) return { state: prev, events: [], rejected: 'unknown' };
  const avail = available(prev)[type];
  if (!avail.ok) return { state: prev, events: [], rejected: avail.reason };

  const hero = state.hero;
  const enemy = state.enemy;
  let damage = 0;

  if (type === 'strike') {
    damage = strikeDamage(hero.level);
    state.log.push(`${hero.name} strikes for ${damage} damage!`);
  } else if (type === 'breathe') {
    const score = clamp(typeof action.score === 'number' ? action.score : ABILITIES.breathe.skipScore, 0, 1);
    const mult = ABILITIES.breathe.classMult[hero.cls] || ABILITIES.breathe.classMult.warrior;
    const steady = ABILITIES.breathe.minMult + (1 - ABILITIES.breathe.minMult) * score;
    damage = Math.round(strikeDamage(hero.level) * mult * steady);
    const name = ABILITIES.breathe.strikeNames[hero.cls] || 'Mighty Strike';
    state.log.push(`${hero.name} breathes steady and unleashes ${name.toUpperCase()} for ${damage} damage!`);
    events.push({ type: 'charge', score });
  } else if (type === 'delay') {
    hero.shield = ABILITIES.delay.reduce;
    state.log.push(`${hero.name} holds the line.`);
    events.push({ type: 'shield', amount: hero.shield });
  } else if (type === 'sip') {
    const amount = Math.min(hero.maxHp - hero.hp, Math.round(hero.maxHp * ABILITIES.sip.heal));
    hero.hp += amount;
    hero.sipsLeft -= 1;
    state.log.push(`${hero.name} takes a sip of water and recovers ${amount} health.`);
    events.push({ type: 'heal', target: 'hero', amount });
  } else if (type === 'distract') {
    if (action.success) {
      enemy.stunned = true;
      enemy.charged = false;
      damage = ABILITIES.distract.stunDamage;
      state.log.push(`${enemy.name} is stunned by the distraction!`);
      events.push({ type: 'stun' });
    } else {
      state.log.push('The distraction did not land this time. No harm done.');
      events.push({ type: 'miss' });
    }
  }

  if (damage > 0) {
    enemy.hp = Math.max(0, enemy.hp - damage);
    state.combo += 1;
    events.push({ type: 'hit', target: 'enemy', amount: damage, ability: type, big: type === 'breathe' });
  } else {
    state.combo = 0;
  }
  if (ab.tip) events.push({ type: 'tip', text: ab.tip });
  if (ab.cooldown) state.cooldowns[type] = ab.cooldown + 1; // +1: the enemy turn ticks it once

  if (enemy.hp <= 0) {
    state.phase = 'victory';
    state.log.push(`VICTORY! You defeated the ${enemy.name}!`);
    events.push({ type: 'victory' });
    return { state, events };
  }

  // The enemy's intent may change if the player's move changed things (a
  // stun shows "Stunned"; a boss can enter its next phase).
  if (enemy.stunned) state.intent = { type: 'stunned', power: 0, label: INTENT_LABELS.stunned };
  state.phase = 'enemy';
  return { state, events };
}

/** The enemy carries out the intent it showed, then shows its next one. */
function enemyAct(prev) {
  if (prev.phase !== 'enemy') return { state: prev, events: [] };
  const state = clone(prev);
  const events = [];
  const { hero, enemy } = state;
  const data = enemyData(enemy.id);
  const intent = state.intent;

  if (enemy.stunned) {
    enemy.stunned = false;
    state.log.push(`${enemy.name} shakes off the daze.`);
  } else if (intent.type === 'attack' || intent.type === 'heavy') {
    const blocked = Math.round(intent.power * hero.shield);
    const dmg = intent.power - blocked;
    hero.hp = Math.max(0, hero.hp - dmg);
    if (dmg > 0) state.tookDamage = true;
    if (intent.type === 'heavy') enemy.charged = false;
    state.log.push(blocked > 0 ? `${enemy.name} hits for ${dmg} (${blocked} blocked).` : `${enemy.name} hits for ${dmg}!`);
    events.push({ type: 'hit', target: 'hero', amount: dmg, blocked, big: intent.type === 'heavy' });
  } else if (intent.type === 'charge') {
    enemy.charged = true;
    state.log.push(`${enemy.name} is winding up a heavy blow!`);
    events.push({ type: 'charge', by: 'enemy' });
  } else if (intent.type === 'heal') {
    const amount = Math.min(enemy.maxHp - enemy.hp, intent.power);
    enemy.hp += amount;
    state.log.push(`${enemy.name} recovers ${amount} health.`);
    events.push({ type: 'heal', target: 'enemy', amount });
  } else if (intent.type === 'taunt') {
    const lines = data.taunts || [];
    const text = lines.length ? lines[(state.turn - 1) % lines.length] : '...';
    state.log.push(`${enemy.name}: "${text}"`);
    events.push({ type: 'taunt', text });
  }

  hero.shield = 0;
  for (const k of Object.keys(state.cooldowns)) state.cooldowns[k] = Math.max(0, state.cooldowns[k] - 1);
  enemy.step += 1;
  state.turn += 1;

  if (hero.hp <= 0) {
    state.phase = 'defeat';
    state.log.push(`${hero.name} needs a rest. You can try again any time.`);
    events.push({ type: 'defeat' });
    return { state, events };
  }

  // Bosses change rhythm once their health drops past a threshold.
  const phaseAfter = patternFor(data, enemy.hp / enemy.maxHp).phase;
  if (data.phases && phaseAfter !== enemy.phase) {
    enemy.phase = phaseAfter;
    enemy.step = 0;
    const text = data.phases[phaseAfter].announce;
    if (text) {
      state.log.push(text);
      events.push({ type: 'phase', text });
    }
  }
  state.intent = nextIntent(state);
  events.push({ type: 'intent', intent: state.intent });
  state.phase = 'player';
  return { state, events };
}

/** True when the battle is over. */
const isOver = (s) => s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'retreat';

module.exports = {
  ENGINE_VERSION,
  createBattle,
  available,
  playerAct,
  enemyAct,
  isOver,
  enemyData,
  heroMaxHp,
  strikeDamage,
  INTENT_LABELS,
};
