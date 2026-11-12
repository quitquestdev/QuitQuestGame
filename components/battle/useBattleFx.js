'use client';

/**
 * Sound and haptics for battles, following the player's settings. Returns an
 * `fx` object the battle screen calls:
 *   fx.play(events)  map engine events to sounds and pulses
 *   fx.tap()         a UI tap
 *   fx.haptic(name)  e.g. 'inhale' / 'exhale' during breathing
 *   fx.sound(name)   e.g. 'charge'
 */
import { useEffect, useMemo } from 'react';
import { createSoundManager } from '../../lib/fx/sound';
import { createHaptics } from '../../lib/fx/haptics';
import soundManifest from '../../public/assets/sounds/manifest.json';

// One of each for the whole app, so sounds are decoded once.
let shared = null;
function getShared() {
  if (!shared) shared = { sound: createSoundManager({ manifest: soundManifest, enabled: false }), haptics: createHaptics({ enabled: true }) };
  return shared;
}

export default function useBattleFx({ sound = false, haptics = true } = {}) {
  const s = getShared();
  useEffect(() => {
    s.sound.setEnabled(sound);
    s.haptics.setEnabled(haptics);
  }, [s, sound, haptics]);

  return useMemo(
    () => ({
      play(events) {
        for (const e of events) {
          if (e.type === 'hit' && e.amount > 0) {
            s.sound.play('hit');
            s.haptics.pulse(e.big ? 'big' : e.target === 'hero' ? 'hurt' : 'hit');
          } else if (e.type === 'heal' && e.target === 'hero') {
            s.sound.play('heal');
            s.haptics.pulse('heal');
          } else if (e.type === 'victory') {
            setTimeout(() => s.sound.play('victory'), 500);
            s.haptics.pulse('victory');
          } else if (e.type === 'defeat') {
            setTimeout(() => s.sound.play('rest'), 400);
          }
        }
      },
      tap() {
        s.sound.play('tap');
        s.haptics.pulse('tap');
      },
      haptic: (name) => s.haptics.pulse(name),
      sound: (name) => s.sound.play(name),
    }),
    [s],
  );
}
