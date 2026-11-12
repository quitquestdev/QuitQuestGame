/**
 * Paced breathing: the cue and the score. No input code lives here.
 *
 * The cue alternates a gentle inhale (about 4 s) and a longer exhale (about
 * 6 s). The player holds during the inhale and lets go for the exhale.
 *
 * The score rewards RHYTHM and STEADINESS only: being in step with the cue
 * and not fidgeting. It never rewards force, speed or holding longer, and
 * the cue never asks anyone to hold their breath. A short grace period after
 * each switch means nobody has to react instantly.
 *
 * Input comes from any BreathInput (./breathInput.js) as samples
 * { t: ms since start, active: true while breathing in }.
 */

/** The cue at time t: { phase: 'inhale'|'exhale'|'done', cycle, progress 0..1 }. */
function cueAt(t, { inhaleMs, exhaleMs, cycles }) {
  const period = inhaleMs + exhaleMs;
  if (t >= period * cycles) return { phase: 'done', cycle: cycles, progress: 1 };
  const cycle = Math.floor(t / period);
  const within = t - cycle * period;
  return within < inhaleMs
    ? { phase: 'inhale', cycle, progress: within / inhaleMs }
    : { phase: 'exhale', cycle, progress: (within - inhaleMs) / exhaleMs };
}

/** Was the input active at time t? Samples are state changes in time order. */
function activeAt(samples, t) {
  let active = false;
  for (const s of samples) {
    if (s.t > t) break;
    active = !!s.active;
  }
  return active;
}

/**
 * Score a breathing round, 0..1.
 *   accuracy:   inhale and exhale count equally, so holding the whole time or
 *               never holding both score 0.5 (the same as skipping).
 *   steadiness: extra presses beyond one per breath lower the score, so
 *               rapid tapping never pays.
 */
function scoreBreath(samples, { inhaleMs, exhaleMs, cycles, graceMs = 600, stepMs = 50 }) {
  const total = (inhaleMs + exhaleMs) * cycles;
  let inGood = 0;
  let inAll = 0;
  let exGood = 0;
  let exAll = 0;
  for (let t = 0; t < total; t += stepMs) {
    const cue = cueAt(t, { inhaleMs, exhaleMs, cycles });
    const within = (t % (inhaleMs + exhaleMs)) - (cue.phase === 'exhale' ? inhaleMs : 0);
    if (within < graceMs) continue; // just after a switch: either state is fine
    const active = activeAt(samples, t);
    if (cue.phase === 'inhale') {
      inAll++;
      if (active) inGood++;
    } else {
      exAll++;
      if (!active) exGood++;
    }
  }
  const accuracy = 0.5 * (inAll ? inGood / inAll : 0) + 0.5 * (exAll ? exGood / exAll : 0);
  const presses = samples.filter((s) => s.active).length;
  const extra = Math.max(0, presses - cycles);
  const steadiness = 1 / (1 + 0.25 * extra);
  return Math.max(0, Math.min(1, Math.round(accuracy * steadiness * 100) / 100));
}

module.exports = { cueAt, scoreBreath, activeAt };
