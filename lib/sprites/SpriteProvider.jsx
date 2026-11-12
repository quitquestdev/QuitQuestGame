'use client';

/**
 * React binding for the sprite registry.
 *
 * The app uses one shared registry built from the default manifest. Skin packs
 * are layered on top with `registry.setSkins([...])` (or `useSkinPacks`), and
 * every <Sprite> re-renders with the new art. No component code changes.
 */
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { createSpriteRegistry, validateManifest } from './registry';
import defaultManifest from '../../public/assets/sprites/manifest.json';

export const defaultRegistry = createSpriteRegistry(defaultManifest);

const RegistryContext = createContext(defaultRegistry);

export function SpriteProvider({ registry = defaultRegistry, children }) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}

/** The active registry. Re-renders the caller when skin packs change. */
export function useSpriteRegistry() {
  const registry = useContext(RegistryContext);
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => registry.subscribe(bump), [registry]);
  return registry;
}

/**
 * Fetch a skin-pack manifest by URL. Resolves to the manifest, or null if it
 * cannot be loaded or is invalid. A bad pack never breaks the app: it just
 * isn't applied, and the default art stays in place.
 */
export async function loadSkinManifest(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    const problems = validateManifest(manifest);
    if (problems.length) throw new Error(problems.join('; '));
    return manifest;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[sprites] skin pack ${url} not applied: ${err.message}`);
    }
    return null;
  }
}
