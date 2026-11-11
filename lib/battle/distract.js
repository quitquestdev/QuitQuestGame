/**
 * Distract: a short tap-pattern challenge. The pattern lights up one tile at
 * a time; the player taps the tiles in the same order within a few seconds.
 * Pure logic; the timer and the tiles live in the screen.
 */

/** A deterministic pattern for a seed (no immediate repeats). */
function makePattern(seed, length = 4, tiles = 4) {
  let x = (seed >>> 0) || 1;
  const rand = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  const out = [];
  for (let i = 0; i < length; i++) {
    let v = Math.floor(rand() * tiles);
    if (i > 0 && v === out[i - 1]) v = (v + 1) % tiles;
    out.push(v);
  }
  return out;
}

/** Start: { pattern, pos: 0, done: false, success: false }. */
const startDistract = (pattern) => ({ pattern, pos: 0, done: false, success: false, mistakes: 0 });

/** A tap. One wrong tap is forgiven (the round continues); a second ends it. */
function tapDistract(state, tile) {
  if (state.done) return state;
  if (tile === state.pattern[state.pos]) {
    const pos = state.pos + 1;
    return pos >= state.pattern.length ? { ...state, pos, done: true, success: true } : { ...state, pos };
  }
  const mistakes = state.mistakes + 1;
  return mistakes >= 2 ? { ...state, mistakes, done: true, success: false } : { ...state, mistakes };
}

/** Time ran out. */
const timeoutDistract = (state) => (state.done ? state : { ...state, done: true, success: false });

module.exports = { makePattern, startDistract, tapDistract, timeoutDistract };
