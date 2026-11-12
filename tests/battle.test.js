/**
 * Battle state machine tests: `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createBattle, available, playerAct, enemyAct, isOver, strikeDamage } = require('../lib/battle/engine');
const { ABILITIES } = require('../lib/battle/data/abilities');
const { ENEMIES } = require('../lib/battle/data/enemies');
const { battleRewards, rewardFactor } = require('../lib/battle/rewards');
const { scoreBreath, cueAt } = require('../lib/battle/breath');
const { createTouchBreathInput } = require('../lib/battle/breathInput');
const { makePattern, startDistract, tapDistract, timeoutDistract } = require('../lib/battle/distract');
const { pickEnemy, regionForDay } = require('../lib/battle/select');

const round = (s, action) => {
  const p = playerAct(s, action);
  if (p.state.phase !== 'enemy') return { state: p.state, events: p.events };
  const e = enemyAct(p.state);
  return { state: e.state, events: [...p.events, ...e.events] };
};

test('turn order: the player acts, then the enemy, then the player again', () => {
  let s = createBattle({ enemyId: 'smoke_wraith', level: 1 });
  assert.equal(s.phase, 'player');
  const p = playerAct(s, { type: 'strike' });
  assert.equal(p.state.phase, 'enemy');
  assert.equal(playerAct(p.state, { type: 'strike' }).rejected, 'not_your_turn');
  const e = enemyAct(p.state);
  assert.equal(e.state.phase, 'player');
  assert.equal(e.state.turn, 2);
});

test('the enemy does exactly what it telegraphed', () => {
  let s = createBattle({ enemyId: 'smoke_wraith', level: 1 }); // pattern: attack, taunt, attack, charge, heavy
  assert.equal(s.intent.type, 'attack');
  const hp = s.hero.hp;
  const r = round(s, { type: 'strike' });
  assert.equal(r.state.hero.hp, hp - s.intent.power);
  assert.equal(r.state.intent.type, 'taunt');
  const r2 = round(r.state, { type: 'strike' });
  assert.equal(r2.state.hero.hp, r.state.hero.hp, 'a taunt does no damage');
  assert.ok(r2.events.some((e) => e.type === 'taunt' && e.text));
});

test('damage is fixed by the data, with no hidden randomness', () => {
  const a = round(createBattle({ enemyId: 'stress_demon', level: 2 }), { type: 'strike' }).state;
  const b = round(createBattle({ enemyId: 'stress_demon', level: 2 }), { type: 'strike' }).state;
  assert.deepEqual(a, b);
  assert.equal(a.enemy.maxHp - a.enemy.hp, strikeDamage(2));
});

test('Delay blocks most of the telegraphed hit, then goes on cooldown', () => {
  const s = createBattle({ enemyId: 'smoke_wraith', level: 1 });
  const hit = s.intent.power;
  const r = round(s, { type: 'delay' });
  assert.equal(s.hero.hp - r.state.hero.hp, hit - Math.round(hit * ABILITIES.delay.reduce));
  assert.equal(r.state.hero.shield, 0, 'the shield lasts one enemy turn');
  assert.equal(available(r.state).delay.ok, false);
  assert.equal(available(r.state).delay.reason, 'cooldown');
});

test('a charge makes the next hit heavy; a stun breaks the charge', () => {
  let s = createBattle({ enemyId: 'stress_demon', level: 1 }); // charge, heavy, attack, attack, heal
  assert.equal(s.intent.type, 'charge');
  s = round(s, { type: 'strike' }).state;
  assert.equal(s.intent.type, 'heavy');
  const heavy = s.intent.power;
  // Stun: the heavy blow never lands, and the charge is gone.
  const stunned = playerAct(s, { type: 'distract', success: true });
  assert.equal(stunned.state.intent.type, 'stunned');
  const after = enemyAct(stunned.state).state;
  assert.equal(after.hero.hp, s.hero.hp, 'no damage while stunned');
  assert.equal(after.enemy.charged, false);
  // Without the stun, the heavy blow lands in full.
  const hit = round(s, { type: 'strike' }).state;
  assert.equal(s.hero.hp - hit.hero.hp, heavy);
});

test('Distract: a miss costs nothing but the turn', () => {
  const s = createBattle({ enemyId: 'smoke_wraith', level: 1 });
  const p = playerAct(s, { type: 'distract', success: false });
  assert.equal(p.state.enemy.hp, s.enemy.hp);
  assert.ok(p.events.some((e) => e.type === 'miss'));
  assert.equal(available(enemyAct(p.state).state).distract.ok, false);
});

test('Sip heals, is limited per battle, and never overheals', () => {
  let s = createBattle({ enemyId: 'boredom_slime', level: 1 });
  s.hero.hp = 40;
  const r = round(s, { type: 'sip' }).state;
  assert.ok(r.hero.hp > 40 - s.intent.power);
  assert.equal(r.hero.sipsLeft, ABILITIES.sip.uses - 1);
  const full = createBattle({ enemyId: 'boredom_slime', level: 1 });
  const p = playerAct(full, { type: 'sip' });
  assert.equal(p.state.hero.hp, full.hero.maxHp);
  let t = createBattle({ enemyId: 'smoke_wraith', level: 5 });
  for (let i = 0; i < 8 && t.hero.sipsLeft > 0; i++) t = round(t, { type: available(t).sip.ok ? 'sip' : 'strike' }).state;
  assert.equal(t.hero.sipsLeft, 0);
  assert.equal(available(t).sip.reason, 'no_uses');
});

test('Breathe: steadier breathing gives a stronger strike; skipping still gives a fair one', () => {
  const s = createBattle({ enemyId: 'boredom_slime', level: 1, heroClass: 'warrior' });
  const dmg = (score) => s.enemy.hp - playerAct(s, { type: 'breathe', score }).state.enemy.hp;
  assert.ok(dmg(1) > dmg(0.5));
  assert.ok(dmg(0.5) > dmg(0));
  assert.equal(dmg(undefined), dmg(ABILITIES.breathe.skipScore));
  assert.ok(dmg(0) > strikeDamage(1), 'even a rough breath beats a plain strike');
});

test('victory, defeat and retreat end the battle', () => {
  let s = createBattle({ enemyId: 'social_pressure_imp', level: 1 });
  s.enemy.hp = 3;
  const win = playerAct(s, { type: 'strike' });
  assert.equal(win.state.phase, 'victory');
  assert.ok(isOver(win.state));
  let d = createBattle({ enemyId: 'smoke_wraith', level: 1 });
  d.hero.hp = 1;
  const lose = round(d, { type: 'strike' });
  assert.equal(lose.state.phase, 'defeat');
  assert.ok(lose.events.some((e) => e.type === 'defeat'));
  assert.ok(!/fail|relapse|lost your/i.test(lose.state.log.join(' ')), 'defeat copy stays kind');
  const r = playerAct(createBattle({ enemyId: 'smoke_wraith' }), { type: 'retreat' });
  assert.equal(r.state.phase, 'retreat');
});

test('the boss changes rhythm below 60% health', () => {
  let s = createBattle({ enemyId: 'nicotine_lord', level: 1 });
  s.enemy.hp = Math.floor(s.enemy.maxHp * 0.55);
  const r = round(s, { type: 'strike' });
  assert.ok(r.events.some((e) => e.type === 'phase'));
  assert.equal(r.state.enemy.phase, 1);
  assert.equal(r.state.intent.type, 'charge');
});

test('fights take a sensible number of turns at every level', () => {
  // A simple sensible player: delay before heavy hits, sip when low, breathe when ready.
  for (const id of Object.keys(ENEMIES)) {
    for (const level of [1, 3, 5]) {
      let s = createBattle({ enemyId: id, level, heroClass: 'rogue' });
      let turns = 0;
      while (!isOver(s) && turns < 60) {
        const a = available(s);
        let action = { type: 'strike' };
        if (s.intent.type === 'heavy' && a.delay.ok) action = { type: 'delay' };
        else if (s.hero.hp < s.hero.maxHp * 0.4 && a.sip.ok) action = { type: 'sip' };
        else if (a.breathe.ok) action = { type: 'breathe', score: 0.8 };
        s = round(s, action).state;
        turns++;
      }
      const max = ENEMIES[id].boss ? 22 : 15;
      assert.equal(s.phase, 'victory', `${id} L${level} should be winnable`);
      assert.ok(turns >= 4 && turns <= max, `${id} L${level} took ${turns} turns`);
    }
  }
});

test('rewards: original XP formula, then diminishing returns, never zero', () => {
  let s = createBattle({ enemyId: 'smoke_wraith', level: 1 });
  s.enemy.hp = 1;
  s.combo = 2;
  s = playerAct(s, { type: 'strike' }).state;
  const now = Date.parse('2027-05-01T12:00:00Z');
  const base = ENEMIES.smoke_wraith.xp + 3 * 10;
  assert.equal(battleRewards(s, [], now).xp, base);
  assert.equal(battleRewards(s, [], now).perfect, true);
  const wins = (n, hoursAgo = 1) => Array.from({ length: n }, () => ({ at: new Date(now - hoursAgo * 3600e3).toISOString(), result: 'win' }));
  assert.equal(battleRewards(s, wins(3), now).factor, 0.5);
  assert.equal(battleRewards(s, wins(4), now).factor, 0.25);
  assert.equal(battleRewards(s, wins(20), now).factor, 0.1);
  assert.ok(battleRewards(s, wins(20), now).xp > 0);
  assert.equal(battleRewards(s, wins(10, 30), now).factor, 1, 'yesterday\'s wins do not count');
  assert.equal(battleRewards(s, [...wins(5).map((w) => ({ ...w, result: 'loss' }))], now).factor, 1, 'starting or losing battles never reduces rewards');
  assert.equal(rewardFactor([], now), 1);
  const lost = { ...s, phase: 'defeat' };
  assert.equal(battleRewards(lost, [], now).xp, 0);
});

test('breath scoring rewards rhythm, not speed or force', () => {
  const opts = { inhaleMs: 4000, exhaleMs: 6000, cycles: 2 };
  const steady = [{ t: 200, active: true }, { t: 4100, active: false }, { t: 10200, active: true }, { t: 14100, active: false }];
  assert.ok(scoreBreath(steady, opts) >= 0.95);
  assert.equal(scoreBreath([], opts), 0.5, 'never holding: same as skipping');
  assert.equal(scoreBreath([{ t: 0, active: true }], opts), 0.5, 'holding the whole time is not rewarded');
  const frantic = [];
  for (let t = 0; t < 20000; t += 400) frantic.push({ t, active: (t / 400) % 2 === 0 });
  assert.ok(scoreBreath(frantic, opts) < 0.3, 'rapid tapping scores low');
  const late = steady.map((s) => ({ ...s, t: s.t + 450 }));
  assert.ok(scoreBreath(late, opts) >= 0.9, 'reacting a little late is fine');
  assert.equal(cueAt(4500, opts).phase, 'exhale');
  assert.equal(cueAt(20000, opts).phase, 'done');
});

test('touch BreathInput produces samples for any scorer', () => {
  let t = 1000;
  const input = createTouchBreathInput({ now: () => t });
  const seen = [];
  input.subscribe((s) => seen.push(s));
  input.start();
  t = 1200; input.press();
  t = 1300; input.press(); // repeated press is ignored
  t = 5100; input.release();
  const samples = input.stop();
  assert.deepEqual(samples, [{ t: 200, active: true }, { t: 4100, active: false }]);
  assert.equal(seen.length, 2);
});

test('distract pattern: right taps succeed, one slip is forgiven, timeout ends it', () => {
  const pattern = makePattern(42, 4, 4);
  assert.equal(pattern.length, 4);
  assert.deepEqual(pattern, makePattern(42, 4, 4));
  let d = startDistract(pattern);
  d = tapDistract(d, (pattern[0] + 1) % 4);
  assert.equal(d.done, false);
  for (const p of pattern) d = tapDistract(d, p);
  assert.equal(d.success, true);
  assert.equal(timeoutDistract(startDistract(pattern)).success, false);
});

test('enemy choice: practice uses craving strength; Urge Mode uses the map region and never the boss', () => {
  const r = () => 0.99;
  assert.equal(pickEnemy({ mode: 'practice', tier: 'medium', rand: r }), 'stress_demon');
  assert.equal(regionForDay(2), 'ashen');
  assert.equal(regionForDay(45), 'fields');
  for (let d = 0; d < 400; d += 7) assert.notEqual(pickEnemy({ mode: 'urge', day: d, rand: Math.random }), 'nicotine_lord');
});
