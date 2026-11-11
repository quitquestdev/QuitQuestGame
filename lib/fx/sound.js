/**
 * Sound manager: named events (hit, heal, charge, victory, tap, rest) mapped
 * to files in public/assets/sounds/manifest.json. Everything is optional:
 * with sound off, no AudioContext is created and nothing loads.
 *
 * Web: Web Audio, created on the first play after a user gesture. On iPhone
 * the ring/silent switch mutes Web Audio, so the device's silent mode is
 * respected. Mobile build: swap in an expo-av player with
 * playsInSilentModeIOS: false; the event names stay the same.
 */
function createSoundManager({ manifest, enabled = false, volume = 0.6 } = {}) {
  let on = enabled;
  let ctx = null;
  const buffers = {};
  const loading = {};

  const supported = () => typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);

  function context() {
    if (!ctx && supported()) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  }

  async function load(name) {
    const entry = manifest && manifest.sounds && manifest.sounds[name];
    if (!entry) return null;
    if (buffers[name]) return buffers[name];
    if (!loading[name]) {
      loading[name] = fetch(`${manifest.baseUrl}${entry.path}`)
        .then((r) => r.arrayBuffer())
        .then((data) => new Promise((resolve, reject) => context().decodeAudioData(data, resolve, reject)))
        .then((b) => (buffers[name] = b))
        .catch(() => null);
    }
    return loading[name];
  }

  return {
    get enabled() {
      return on;
    },
    setEnabled(value) {
      on = !!value;
      if (!on && ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
    },
    /** Play a named sound. Silent (and free) when sound is off or unsupported. */
    async play(name) {
      if (!on || !supported()) return false;
      const c = context();
      if (c.state === 'suspended') await c.resume().catch(() => {});
      const buffer = await load(name);
      if (!buffer || !on) return false;
      const src = c.createBufferSource();
      const gain = c.createGain();
      gain.gain.value = volume;
      src.buffer = buffer;
      src.connect(gain).connect(c.destination);
      src.start();
      return true;
    },
  };
}

module.exports = { createSoundManager };
