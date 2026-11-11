/**
 * Haptics: named pulses for key moments, behind one small interface.
 *
 * Web: the Vibration API (Android browsers; iPhone browsers have none, so it
 * quietly does nothing). Mobile build: swap the `vibrate` function for
 * expo-haptics (impactAsync / notificationAsync) using the same names.
 * Every pattern is short and gentle; the breathing pulses are a single tick.
 */
const PATTERNS = {
  tap: [6],
  hit: [14],
  hurt: [22],
  big: [30, 40, 30],
  heal: [8, 50, 8],
  inhale: [16],
  exhale: [8],
  victory: [20, 70, 20, 70, 40],
};

function createHaptics({ enabled = true, vibrate = null } = {}) {
  let on = enabled;
  const fn =
    vibrate ||
    ((pattern) => {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    });
  return {
    get enabled() {
      return on;
    },
    setEnabled(value) {
      on = !!value;
    },
    pulse(name) {
      if (!on || !PATTERNS[name]) return false;
      try {
        fn(PATTERNS[name]);
      } catch (e) {
        return false;
      }
      return true;
    },
  };
}

module.exports = { createHaptics, PATTERNS };
