'use client';

/**
 * <BattleScene scene="forest" height={200} />
 *
 * Stacks a scene's parallax layers from the manifest (entries whose
 * meta.scene matches, ordered by meta.layer) as tiled backgrounds at a
 * whole-number scale, anchored to the bottom. With `drift`, each layer
 * slides slowly by its meta.parallax factor in whole native pixels, so the
 * art never smears. Reduced motion holds it still.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export default function BattleScene({ scene, height = 200, scale = 2, drift = true, className = '', children }) {
  const registry = useSpriteRegistry();
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  const layers = useMemo(
    () =>
      registry
        .listIds()
        .map((id) => registry.resolve(id))
        .filter((s) => s.meta && s.meta.scene === scene && !s.missing)
        .sort((a, b) => (a.meta.layer ?? 0) - (b.meta.layer ?? 0)),
    [registry, scene], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!drift || reduced) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 120);
    return () => clearInterval(t);
  }, [drift, reduced]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height }}>
      {layers.map((layer) => {
        const x = -Math.round(tick * (layer.meta.parallax || 0)) * scale;
        return (
          <div
            key={layer.id}
            className="sprite absolute inset-0"
            data-sprite-id={layer.id}
            aria-hidden="true"
            style={{
              display: 'block',
              backgroundImage: `url(${layer.frames[0]})`,
              backgroundRepeat: 'repeat-x',
              backgroundSize: `${layer.frameWidth * scale}px ${layer.frameHeight * scale}px`,
              backgroundPosition: `${x}px bottom`,
            }}
          />
        );
      })}
      {children}
    </div>
  );
}
