/**
 * Premium insights from data the app already keeps: the quit date, cost
 * inputs from setup, battle totals, activity counts and the battle log.
 * Pure functions, no React, so they are unit tested and shared by platforms.
 */

const DAY = 24 * 60 * 60 * 1000;
const CIGARETTES_PER_PACK = 20; // the same assumption as the dashboard

/** Whole days smoke-free, as the dashboard counts them. */
function daysSince(quitDate, now = Date.now()) {
  const t = new Date(quitDate).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor(Math.abs(now - t) / DAY));
}

/** Money and cigarettes per day, from the player's own setup answers. */
function dailyRates({ cigarettesPerDay = 0, pricePerPack = 0 }) {
  const cigs = Math.max(0, Number(cigarettesPerDay) || 0);
  const price = Math.max(0, Number(pricePerPack) || 0);
  return { cigarettes: cigs, money: (cigs / CIGARETTES_PER_PACK) * price };
}

const SAVINGS_MILESTONES = [
  { day: 7, label: '1 week' },
  { day: 30, label: '1 month' },
  { day: 90, label: '3 months' },
  { day: 180, label: '6 months' },
  { day: 365, label: '1 year' },
  { day: 365 * 5, label: '5 years' },
  { day: 365 * 10, label: '10 years' },
];

/**
 * Savings so far and projected: at each milestone, over the coming year and
 * over the first full year. Uses the cost inputs the player entered.
 */
function savingsProjection(userData, now = Date.now()) {
  const rate = dailyRates(userData);
  const days = daysSince(userData.quitDate, now);
  const round2 = (n) => Math.round(n * 100) / 100;
  const at = (d) => ({ money: round2(rate.money * d), cigarettes: Math.round(rate.cigarettes * d) });
  const next = SAVINGS_MILESTONES.find((m) => m.day > days) || null;
  return {
    days,
    perDay: { money: round2(rate.money), cigarettes: rate.cigarettes },
    perWeek: at(7),
    perMonth: at(30),
    sofar: at(days),
    nextYear: at(365), // the coming 12 months from today
    milestones: SAVINGS_MILESTONES.map((m) => ({ ...m, ...at(m.day), reached: days >= m.day, daysToGo: Math.max(0, m.day - days) })),
    next: next ? { ...next, ...at(next.day), daysToGo: next.day - days } : null,
  };
}

/** Start of the ISO-ish week (Monday) for a date, as a day number. */
function weekStart(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  return d.getTime() - dow * DAY;
}

/**
 * Advanced stats. `history.battles` is the battle log ({ at, tier, result,
 * enemyId }), recorded from the version that added it; the totals the app
 * kept before then still count in the headline numbers.
 */
function advancedStats(userData, { now = Date.now(), weeks = 8, perfectVictories = 0 } = {}) {
  const log = ((userData.history && userData.history.battles) || []).filter((b) => b && b.at);
  const results = { win: 0, loss: 0, fled: 0 };
  const byTier = {};
  for (const b of log) {
    results[b.result] = (results[b.result] || 0) + 1;
    const t = (byTier[b.tier || 'other'] = byTier[b.tier || 'other'] || { win: 0, loss: 0, fled: 0 });
    t[b.result] = (t[b.result] || 0) + 1;
  }
  const fought = results.win + results.loss + results.fled;

  // Cravings resisted (battles won) per week, oldest first.
  const thisWeek = weekStart(now);
  const weekly = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek - i * 7 * DAY;
    const count = log.filter((b) => b.result === 'win' && new Date(b.at).getTime() >= start && new Date(b.at).getTime() < start + 7 * DAY).length;
    weekly.push({ start, count, label: i === 0 ? 'This week' : `${i}w ago` });
  }

  const days = daysSince(userData.quitDate, now);
  const activities = Object.entries(userData.activities || {})
    .map(([key, count]) => ({ key, count: Number(count) || 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    streak: { current: days, longest: Math.max(days, Number(userData.longestStreak) || 0), weeks: Math.floor(days / 7) },
    totals: { battlesWon: Number(userData.battlesWon) || 0, cravingsResisted: Number(userData.cravingsDefeated) || 0, perfectVictories },
    logged: { fought, ...results, winRate: fought ? Math.round((results.win / fought) * 100) : null, since: log.length ? log[0].at : null },
    byTier,
    weekly,
    activities,
  };
}

/** Append a battle to the log (kept to the most recent 1000). */
function logBattle(history = {}, entry) {
  const battles = [...((history && history.battles) || []), entry].slice(-1000);
  return { ...history, battles };
}

module.exports = { savingsProjection, advancedStats, logBattle, dailyRates, daysSince, SAVINGS_MILESTONES, CIGARETTES_PER_PACK };
