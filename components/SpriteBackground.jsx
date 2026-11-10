'use client';

/**
 * <SpriteBackground id="bg_forest_trees" scale={2} />
 *
 * Fills its box with a manifest sprite tiled horizontally, anchored to the
 * bottom, at a whole-number scale with nearest-neighbour rendering. Like
 * <Sprite>, it takes an ID, never a path, so skin packs can replace it.
 */
import React from 'react';
import { useSpriteRegistry } from '../lib/sprites/SpriteProvider';

export default function SpriteBackground({ id, scale = 1, offsetX = 0, className = '', style, children }) {
  const registry = useSpriteRegistry();
  const sprite = registry.resolve(id);
  const s = Math.max(1, Math.round(Number(scale)) || 1);
  const image = sprite.missing ? 'none' : `url(${sprite.frames[0]})`;
  return (
    <div
      className={`sprite ${className}`}
      data-sprite-id={id}
      style={{
        backgroundImage: image,
        backgroundRepeat: 'repeat-x',
        backgroundSize: `${sprite.frameWidth * s}px ${sprite.frameHeight * s}px`,
        backgroundPosition: `${Math.round(offsetX)}px bottom`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
