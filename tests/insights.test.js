const test = require('node:test');
const assert = require('node:assert/strict');
const { savingsProjection, advancedStats, logBattle } = require('../lib/premium/insights');
const { premiumChaptersFor } = require('../lib/premium/story');

const NOW = new Date('2027-04-15T12:00:00').getTime();
const ago = (d) => new Date(NOW - d * 864e5).toISOString();

test('savings use the player\'s own costs, now and projected', () => {
  const s = savingsProjection({ quitDate: ago(10), cigarettesPerDay: 20, pricePerPack: 10 }, NOW);
  assert.equal(s.days, 10);
  assert.deepEqual(s.perDay, { money: 10, cigarettes: 20 });
  assert.deepEqual(s.sofar, { money: 100, cigarettes: 200 });
  assert.deepEqual(s.nextYear, { money: 3650, cigarettes: 7300 });
  assert.equal(s.next.label, '1 month');
  assert.equal(s.next.daysToGo, 20);
  assert.equal(s.milestones.find((m) => m.label === '1 week').reached, true);
  assert.equal(s.milestones.find((m) => m.label === '1 year').money, 3650);
});

test('missing or odd cost inputs give zeros, not NaN', () => {
  const s = savingsProjection({ quitDate: 'not a date' }, NOW);
  assert.equal(s.days, 0);
  assert.deepEqual(s.sofar, { money: 0, cigarettes: 0 });
});

test('advanced stats from the battle log', () => {
  let history = {};
  history = logBattle(history, { at: ago(1), tier: 'mild', result: 'win' });
  history = logBattle(history, { at: ago(2), tier: 'strong', result: 'loss' });
  history = logBattle(history, { at: ago(9), tier: 'mild', result: 'win' });
  history = logBattle(history, { at: ago(9), tier: 'medium', result: 'fled' });
  const a = advancedStats({ quitDate: ago(40), longestStreak: 12, battlesWon: 7, cravingsDefeated: 7, history, activities: { walks: 3, waterDrinks: 9 } }, { now: NOW });
  assert.deepEqual(a.streak, { current: 40, longest: 40, weeks: 5 });
  assert.equal(a.logged.fought, 4);
  assert.equal(a.logged.winRate, 50);
  assert.deepEqual(a.byTier.mild, { win: 2, loss: 0, fled: 0 });
  assert.equal(a.weekly.length, 8);
  assert.equal(a.weekly.reduce((n, w) => n + w.count, 0), 2);
  assert.equal(a.activities[0].key, 'waterDrinks');
});

test('the battle log keeps the most recent 1000 entries', () => {
  let h = {};
  for (let i = 0; i < 1005; i++) h = logBattle(h, { at: ago(1), result: 'win', n: i });
  assert.equal(h.battles.length, 1000);
  assert.equal(h.battles[0].n, 5);
});

test('premium story hook: empty for now, never touches free chapters', () => {
  assert.deepEqual(premiumChaptersFor(45, true), []);
  assert.deepEqual(premiumChaptersFor(45, false), []);
});
