'use client';

/**
 * <JourneyMap journey={layout} heroSpriteId="hero_warrior" ... />
 *
 * One road from the start of the quit to the Nicotine Lord's fortress (day
 * 180) and a short epilogue beyond. Presentation only: it renders a layout
 * built by lib/journey/layout.js from whatever data the app passes in.
 *
 * Layers (all from the sprite manifest, drawn at 2x, nearest-neighbour):
 *   sky 0.25, far 0.5, mid 0.75, ground 1 (props + knight), fore 1.25
 * The camera is a centre x in native world pixels. During drags the layers
 * are moved directly on the DOM in whole pixels; React only re-renders when
 * the view settles.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Sprite from '../Sprite';
import Button from '../ui/Button';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';
import J from '../../lib/journey/regions';

const SCALE = 2;
const LAYERS = ['sky', 'far', 'mid', 'ground', 'fore'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function JourneyMap({ journey, heroSpriteId, onReadRegion }) {
  const registry = useSpriteRegistry();
  const viewportRef = useRef(null);
  const layerRefs = useRef({});
  const camRef = useRef(journey.playerX);
  const [viewW, setViewW] = useState(0); // native pixels
  const [settledCam, setSettledCam] = useState(journey.playerX);

  const layerInfo = useMemo(
    () =>
      Object.fromEntries(
        LAYERS.map((name) => {
          const s = registry.resolve(`journey_${name}`);
          return [name, { id: `journey_${name}`, speed: s.meta?.speed ?? J.LAYER_SPEEDS[name], pad: s.meta?.pad ?? 0 }];
        }),
      ),
    [registry],
  );

  // Measure the viewport (native pixels, capped so layers always cover it).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => setViewW(Math.min(J.MAX_VIEW_NATIVE, Math.floor(el.clientWidth / SCALE)));
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const clampCam = useCallback((c) => clamp(c, viewW / 2, journey.width - viewW / 2), [viewW, journey.width]);

  /** Move every layer for camera centre `cam` (whole native pixels). */
  const apply = useCallback(
    (cam) => {
      const c = Math.round(cam);
      for (const name of LAYERS) {
        const el = layerRefs.current[name];
        if (!el) continue;
        const { speed, pad } = layerInfo[name];
        const left = Math.round(viewW / 2 - speed * c - pad);
        el.style.transform = `translate3d(${left * SCALE}px, 0, 0)`;
      }
      const path = layerRefs.current.path;
      if (path) path.style.transform = `translate3d(${Math.round(viewW / 2 - c) * SCALE}px, 0, 0)`;
    },
    [layerInfo, viewW],
  );

  const settle = useCallback(() => setSettledCam(Math.round(camRef.current)), []);

  // Centre on the knight when the size or the knight's position changes.
  useLayoutEffect(() => {
    if (!viewW) return;
    camRef.current = clampCam(journey.playerX);
    apply(camRef.current);
    settle();
  }, [viewW, journey.playerX, clampCam, apply, settle]);

  // Drag to look around.
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    drag.current = { x: e.clientX, cam: camRef.current, moved: 0, id: e.pointerId };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 4 && !d.captured) {
      viewportRef.current.setPointerCapture?.(e.pointerId);
      d.captured = true;
    }
    if (!d.captured) return;
    camRef.current = clampCam(d.cam - dx / SCALE);
    apply(camRef.current);
  };
  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = d.captured ? { ...d, ended: true } : null;
    if (d.captured) settle();
    // Let a drag that ended over a button not count as a tap.
    setTimeout(() => {
      if (drag.current && drag.current.ended) drag.current = null;
    }, 0);
  };

  const height = J.WORLD_HEIGHT * SCALE;
  const here = journey.currentRegion;
  const viewRegion = journey.regionAtX(settledCam);

  return (
    <div className="space-y-4">
      <p className="type-body text-bone text-center">
        Day {journey.day}: you are in <span className="text-brass-300">{here.name}</span>.
      </p>

      <div
        ref={viewportRef}
        className="qq-journey relative overflow-hidden qq-inset p-0 mx-auto select-none"
        style={{ height, maxWidth: J.MAX_VIEW_NATIVE * SCALE, touchAction: 'pan-y' }}
        role="region"
        aria-label={`World map. You are on day ${journey.day} in ${here.name}. Drag to look along the road.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {viewW > 0 && (
          <>
            {['sky', 'far', 'mid'].map((name) => (
              <div key={name} ref={(el) => (layerRefs.current[name] = el)} className="absolute top-0 left-0 will-change-transform" aria-hidden="true">
                <Sprite id={layerInfo[name].id} scale={SCALE} className="block" />
              </div>
            ))}

            {/* The road: ground, props and the knight share the camera exactly. */}
            <div ref={(el) => (layerRefs.current.path = el)} className="absolute top-0 left-0 will-change-transform" style={{ width: journey.width * SCALE, height }}>
              <Sprite id="journey_ground" scale={SCALE} className="block absolute top-0 left-0" />
              <div
                className="absolute"
                style={{ left: (journey.playerX - 16) * SCALE, top: (J.KNIGHT_BASELINE + 1 - 32) * SCALE }}
                aria-hidden="true"
              >
                <Sprite id={heroSpriteId} animation="idle" scale={SCALE} />
              </div>
            </div>

            <div ref={(el) => (layerRefs.current.fore = el)} className="absolute top-0 left-0 will-change-transform pointer-events-none" aria-hidden="true">
              <Sprite id={layerInfo.fore.id} scale={SCALE} className="block" />
            </div>

            <span className="absolute top-2 left-2 qq-chip qq-chip--brass px-2 py-0.5 text-sm pointer-events-none">
              {viewRegion.name}
            </span>
          </>
        )}
      </div>

      <p className="qq-label text-center">Drag the map to look along the road</p>

      <ul className="space-y-2">
        {journey.regions.map((r) => (
          <li key={r.id} className="flex items-center gap-3">
            <span className={`qq-chip shrink-0 text-center px-2 py-1 text-base ${r.restored ? 'qq-chip--moss' : r.current ? 'qq-chip--brass' : 'qq-chip--locked'}`}>
              {r.restored ? 'Restored' : r.current ? 'Here' : 'Shrouded'}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`type-subheading ${r.reached ? 'text-bone' : 'text-stone-400'}`}>{r.name}</p>
              <p className="qq-label">{r.from === r.to ? `Day ${r.from}` : `Days ${Math.max(1, r.from)}-${r.to}`}</p>
            </div>
            {r.reached && onReadRegion && (
              <Button size="sm" onClick={() => onReadRegion(r)} aria-label={`Read the story of ${r.name}`}>
                Read
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
