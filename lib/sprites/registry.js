/**
 * Sprite registry: resolves a stable sprite ID to the frames to draw.
 *
 * Components never reference an image path. They ask for an ID, such as
 * `enemy_smoke_wraith`, and this registry decides which file to use:
 *
 *   1. skin-pack manifests, newest first (a later pack overrides an earlier one)
 *   2. the default manifest
 *   3. a visible "missing" placeholder, with a warning in development
 *
 * Resolution is per animation, so a skin pack may override only `idle` for an
 * ID and still inherit `attack` from the default art.
 *
 * Pure JS with no DOM and no React, shared by every renderer (web now, React
 * Native later).
 *
 * MANIFEST FORMAT (version 1)
 * {
 *   "id": "default",                 unique manifest id
 *   "name": "Quit Quest default art",
 *   "version": 1,
 *   "baseUrl": "/assets/sprites/",   every path below is relative to this
 *   "sprites": {
 *     "enemy_smoke_wraith": {
 *       "category": "enemies",       characters | enemies | icons | backgrounds | ui | placeholder
 *       "frameWidth": 32,            native size in pixels, never pre-scaled
 *       "frameHeight": 32,
 *       "placeholder": true,         still using placeholder art (release check lists these)
 *       "meta": { ... },             optional extras passed through as-is (parallax, nine-slice)
 *       "defaultAnimation": "idle",  optional, otherwise "idle" or the first animation
 *       "animations": {
 *         "idle": {
 *           "path": "enemies/smoke_wraith_idle_##.png",  ## becomes 01, 02, ...
 *           "frames": 4,
 *           "fps": 6,
 *           "loop": true             optional, default true
 *         }
 *       }
 *     }
 *   }
 * }
 */

const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';

const MISSING_SIZE = 16;

function warnOnce(seen, key, message) {
  if (!isDev || seen.has(key)) return;
  seen.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[sprites] ${message}`);
}

/** Expand `name_##.png` into one path per frame: name_01.png, name_02.png... */
export function expandFramePaths(path, frames) {
  if (!path.includes('##')) return Array.from({ length: frames }, () => path);
  return Array.from({ length: frames }, (_, i) => path.replace('##', String(i + 1).padStart(2, '0')));
}

function joinUrl(base, path) {
  if (/^(https?:|data:|\/)/.test(path)) return path;
  if (!base) return path;
  return base.endsWith('/') ? base + path : `${base}/${path}`;
}

/**
 * Check a manifest's structure. Returns a list of problems (empty when valid).
 * Never throws: a broken skin pack must not crash the app.
 */
export function validateManifest(manifest) {
  const problems = [];
  if (!manifest || typeof manifest !== 'object') return ['manifest is not an object'];
  if (!manifest.id) problems.push('manifest has no id');
  if (!manifest.sprites || typeof manifest.sprites !== 'object') {
    problems.push('manifest has no sprites object');
    return problems;
  }
  for (const [id, entry] of Object.entries(manifest.sprites)) {
    const where = `${manifest.id || '?'}:${id}`;
    if (!/^[a-z0-9_]+$/.test(id)) problems.push(`${where} id must be lowercase letters, digits and underscores`);
    for (const dim of ['frameWidth', 'frameHeight']) {
      if (!Number.isInteger(entry[dim]) || entry[dim] < 1) problems.push(`${where} ${dim} must be a positive integer`);
    }
    if (!entry.animations || !Object.keys(entry.animations).length) {
      problems.push(`${where} has no animations`);
      continue;
    }
    for (const [anim, a] of Object.entries(entry.animations)) {
      if (!a.path) problems.push(`${where}.${anim} has no path`);
      if (!Number.isInteger(a.frames) || a.frames < 1) problems.push(`${where}.${anim} frames must be a positive integer`);
      if (a.frames > 1 && !(a.fps > 0)) problems.push(`${where}.${anim} needs fps > 0 for ${a.frames} frames`);
      if (a.frames > 1 && a.path && !a.path.includes('##')) problems.push(`${where}.${anim} has ${a.frames} frames but no ## in its path`);
    }
  }
  return problems;
}

export function createSpriteRegistry(defaultManifest) {
  const warned = new Set();
  const listeners = new Set();
  let skins = [];
  let cache = new Map();

  const check = (manifest) => {
    for (const p of validateManifest(manifest)) warnOnce(warned, `invalid:${p}`, `invalid manifest: ${p}`);
  };
  check(defaultManifest);

  /** Lookup order: newest skin first, then the default manifest. */
  const chain = () => [...skins].reverse().concat([defaultManifest]);

  function build(manifest, id, entry, animName, source) {
    const a = entry.animations[animName];
    const frames = Math.max(1, a.frames | 0);
    return {
      id,
      animation: animName,
      source, // 'skin' | 'default'
      manifestId: manifest.id,
      frameWidth: entry.frameWidth,
      frameHeight: entry.frameHeight,
      frames: expandFramePaths(a.path, frames).map((p) => joinUrl(manifest.baseUrl, p)),
      fps: a.fps || 0,
      loop: a.loop !== false,
      placeholder: !!entry.placeholder,
      category: entry.category,
      meta: entry.meta || null, // free-form extras, e.g. parallax layer info or nine-slice size
      missing: false,
    };
  }

  function missing(id, animation) {
    return {
      id,
      animation,
      source: 'missing',
      manifestId: null,
      frameWidth: MISSING_SIZE,
      frameHeight: MISSING_SIZE,
      frames: [],
      fps: 0,
      loop: false,
      placeholder: true,
      category: null,
      meta: null,
      missing: true,
    };
  }

  /**
   * Resolve an ID (and optional animation) to drawable frames.
   * Always returns an object; `missing: true` means no art exists for the ID.
   */
  function resolve(id, animation) {
    const key = `${id}|${animation || ''}`;
    if (cache.has(key)) return cache.get(key);

    let result = null;
    const manifests = chain();

    // 1. Exact animation, first manifest that has it wins.
    if (animation) {
      for (const m of manifests) {
        const entry = m.sprites && m.sprites[id];
        if (entry && entry.animations && entry.animations[animation]) {
          result = build(m, id, entry, animation, m === defaultManifest ? 'default' : 'skin');
          break;
        }
      }
    }

    // 2. No such animation anywhere: use the ID's default animation.
    if (!result) {
      for (const m of manifests) {
        const entry = m.sprites && m.sprites[id];
        if (!entry || !entry.animations) continue;
        const names = Object.keys(entry.animations);
        const fallback = entry.defaultAnimation || (entry.animations.idle ? 'idle' : names[0]);
        if (!fallback) continue;
        if (animation) warnOnce(warned, `anim:${key}`, `"${id}" has no "${animation}" animation; using "${fallback}"`);
        result = build(m, id, entry, fallback, m === defaultManifest ? 'default' : 'skin');
        break;
      }
    }

    // 3. Nothing at all.
    if (!result) {
      warnOnce(warned, `missing:${id}`, `no sprite with id "${id}" in any manifest; showing placeholder`);
      result = missing(id, animation || 'idle');
    }

    cache.set(key, result);
    return result;
  }

  /** Replace the active skin packs (oldest first; later packs win). */
  function setSkins(manifests) {
    skins = (manifests || []).filter(Boolean);
    skins.forEach(check);
    cache = new Map();
    listeners.forEach((fn) => fn());
  }

  /** Every ID known to any active manifest, sorted. */
  function listIds() {
    const ids = new Set();
    for (const m of chain()) Object.keys(m.sprites || {}).forEach((id) => ids.add(id));
    return [...ids].sort();
  }

  /** Animation names available for an ID across all active manifests. */
  function listAnimations(id) {
    const names = new Set();
    for (const m of chain()) {
      const entry = m.sprites && m.sprites[id];
      if (entry && entry.animations) Object.keys(entry.animations).forEach((n) => names.add(n));
    }
    return [...names];
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    resolve,
    setSkins,
    getSkins: () => skins.slice(),
    listIds,
    listAnimations,
    subscribe,
    defaultManifest,
  };
}
