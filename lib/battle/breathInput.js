/**
 * BreathInput: where breathing samples come from. The breathing mechanic only
 * sees samples, never how they were read, so another source can be added
 * later without touching the scoring or the screen.
 *
 * interface BreathInput {
 *   kind: string                      e.g. 'touch'
 *   start(): void                     begin a round; t = 0 now
 *   stop(): Sample[]                  end the round; returns the samples
 *   subscribe(fn(Sample)): () => void listen to changes as they happen
 * }
 * Sample = { t: ms since start, active: boolean }  active = breathing in
 *
 * The touch implementation: the screen calls press() when the player holds
 * the button and release() when they let go.
 */
function createTouchBreathInput({ now = () => Date.now() } = {}) {
  let t0 = null;
  let samples = [];
  let active = false;
  const listeners = new Set();
  const emit = (s) => listeners.forEach((fn) => fn(s));
  const set = (value) => {
    if (t0 === null || value === active) return;
    active = value;
    const s = { t: now() - t0, active };
    samples.push(s);
    emit(s);
  };
  return {
    kind: 'touch',
    start() {
      t0 = now();
      samples = [];
      active = false;
    },
    stop() {
      const out = samples;
      t0 = null;
      active = false;
      return out;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    press: () => set(true),
    release: () => set(false),
    isActive: () => active,
  };
}

module.exports = { createTouchBreathInput };
