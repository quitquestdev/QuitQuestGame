/**
 * Decode sprites ahead of time, while the browser is idle, so a screen that
 * uses large art (the world map's layers) opens without a decode hitch.
 * Safe to call more than once; failures are ignored (the Sprite component
 * still loads the image normally).
 */
const done = new Set();

export function preloadSprites(registry, ids) {
  if (typeof window === 'undefined') return;
  const run = () => {
    for (const id of ids) {
      for (const anim of registry.listAnimations(id)) {
        for (const src of registry.resolve(id, anim).frames) {
          if (done.has(src)) continue;
          done.add(src);
          const img = new window.Image();
          img.src = src;
          img.decode?.().catch(() => {});
        }
      }
    }
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1200);
}
