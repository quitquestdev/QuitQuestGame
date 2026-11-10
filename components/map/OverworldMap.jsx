'use client';

/**
 * <OverworldMap journey={layout} heroClass="warrior" ... />
 *
 * The world seen from above: the whole land, the road from the Ashen Wastes
 * to the fortress and on down the coast, with the knight standing where the
 * player is today. Land not yet reached lies in shadow; the first time the
 * knight arrives in a region, its shadow draws back.
 *
 * Presentation only. It renders a layout built by lib/journey/layout.js and
 * projects its road positions onto the map with lib/journey/overworld.js.
 *
 * Scale is a whole number (1x, 2x or 3x); the camera is a point in native
 * map pixels. Drags move the world on the DOM directly; React re-renders
 * only when the view settles.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Sprite from '../Sprite';
import Button from '../ui/Button';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';
import OW from '../../lib/journey/overworld';
import { landmarkKind, placeLabel } from './places';
import PlaceDetail from './PlaceDetail';
import { useReducedEffects, useTimeOfDay, useRegionReveals } from './useJourneyMap';

const { MAP_W, MAP_H } = OW;
const ZOOMS = [1, 2, 3];
const MIN_HIT = 24; // CSS pixels: smallest tap target for a place
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Where a journey x stands on the map, in whole native pixels. */
const at = (jx) => {
  const p = OW.pointForJourneyX(jx);
  return { x: Math.round(p.x), y: Math.round(p.y), nx: p.nx, ny: p.ny };
};

export default function OverworldMap({
  journey,
  heroClass = 'warrior',
  onReadRegion,
  onOpenStory,
  onFight,
  journeyState = {},
  onJourneyStateChange,
  reducedEffects: reducedSetting = false,
}) {
  const registry = useSpriteRegistry();
  const reducedEffects = useReducedEffects(reducedSetting);
  const timeOfDay = useTimeOfDay();

  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 }); // CSS pixels
  const [z, setZ] = useState(2);
  const zRef = useRef(2);
  zRef.current = z;

  // ---- The knight -------------------------------------------------------
  const [walkFrom] = useState(() =>
    typeof journeyState.lastDay === 'number' && journeyState.lastDay < journey.day && !reducedEffects
      ? journey.dayToX(journeyState.lastDay)
      : null,
  );
  const knightJx = useRef(walkFrom ?? journey.playerX);
  const knightRef = useRef(null);
  const [walking, setWalking] = useState(false);
  const [frontierX, setFrontierX] = useState(knightJx.current);
  const followRef = useRef(true);
  const [lookedAround, setLookedAround] = useState(false);

  const { clearIds, revealing, revealRegion, finishReveal } = useRegionReveals({ journey, journeyState, onJourneyStateChange, reducedEffects, frontierX });

  // ---- Camera ------------------------------------------------------------
  const start = at(knightJx.current);
  const camRef = useRef({ x: start.x, y: start.y });
  const [settled, setSettled] = useState({ x: start.x, y: start.y });

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      setSize({ w, h: clamp(Math.round(w * 0.8), 180, 420) });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  // Start closer in on roomy screens, wider on very narrow ones (e.g. 200% zoom).
  const sizedOnce = useRef(false);
  useLayoutEffect(() => {
    if (!size.w || sizedOnce.current) return;
    sizedOnce.current = true;
    setZ(size.w < 240 ? 1 : 2);
  }, [size.w]);

  const clampCam = useCallback(
    (c, zoom = zRef.current) => {
      const halfW = size.w / (2 * zoom);
      const halfH = size.h / (2 * zoom);
      return {
        x: MAP_W * zoom <= size.w ? MAP_W / 2 : clamp(c.x, halfW, MAP_W - halfW),
        y: MAP_H * zoom <= size.h ? MAP_H / 2 : clamp(c.y, halfH, MAP_H - halfH),
      };
    },
    [size],
  );

  const apply = useCallback(
    (c) => {
      const el = worldRef.current;
      if (!el) return;
      const zoom = zRef.current;
      const tx = Math.round(size.w / 2 - Math.round(c.x) * zoom);
      const ty = Math.round(size.h / 2 - Math.round(c.y) * zoom);
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    },
    [size],
  );

  const settle = useCallback(() => {
    apply(camRef.current);
    setSettled({ x: Math.round(camRef.current.x), y: Math.round(camRef.current.y) });
  }, [apply]);

  // Keep the view valid when the size or zoom changes.
  useLayoutEffect(() => {
    if (!size.w) return;
    camRef.current = clampCam(camRef.current, z);
    settle();
  }, [size, z]); // eslint-disable-line react-hooks/exhaustive-deps

  const tween = useRef(null);
  const panTo = useCallback(
    (target, { follow = false } = {}) => {
      followRef.current = follow;
      setLookedAround(!follow);
      cancelAnimationFrame(tween.current);
      const to = clampCam(target);
      if (reducedEffects) {
        camRef.current = to;
        settle();
        return;
      }
      const from = { ...camRef.current };
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 320);
        const e = 1 - (1 - p) * (1 - p);
        camRef.current = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
        apply(camRef.current);
        if (p < 1) tween.current = requestAnimationFrame(step);
        else settle();
      };
      tween.current = requestAnimationFrame(step);
    },
    [apply, clampCam, reducedEffects, settle],
  );

  /** Zoom one step, keeping the map point under (fx, fy) (CSS px in the viewport) still. */
  const zoomBy = useCallback(
    (dir, fx = size.w / 2, fy = size.h / 2) => {
      const i = ZOOMS.indexOf(zRef.current);
      const next = ZOOMS[clamp(i + dir, 0, ZOOMS.length - 1)];
      if (next === zRef.current) return;
      const old = zRef.current;
      const c = camRef.current;
      const px = c.x + (fx - size.w / 2) / old;
      const py = c.y + (fy - size.h / 2) / old;
      camRef.current = clampCam({ x: px - (fx - size.w / 2) / next, y: py - (fy - size.h / 2) / next }, next);
      zRef.current = next;
      setZ(next);
    },
    [size, clampCam],
  );

  const placeKnight = (jx) => {
    knightJx.current = jx;
    const p = at(jx);
    if (knightRef.current) {
      knightRef.current.style.left = `${(p.x - 4) * zRef.current}px`;
      knightRef.current.style.top = `${(p.y - 12) * zRef.current}px`;
    }
    return p;
  };

  // ---- The walk ----------------------------------------------------------
  const walkedRef = useRef(false);
  useEffect(() => {
    if (!size.w || walkedRef.current) return undefined;
    walkedRef.current = true;
    if (walkFrom === null) {
      if (journeyState.lastDay !== journey.day) onJourneyStateChange?.({ lastDay: journey.day });
      return undefined;
    }
    const from = walkFrom;
    const to = journey.playerX;
    const dur = clamp(Math.abs(to - from) * 12, 900, 4500);
    let raf;
    let region = journey.regionAtX(from).id;
    const t0 = performance.now() + 600;
    setWalking(true);
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const jx = from + (to - from) * p;
      const pt = placeKnight(jx);
      if (followRef.current) {
        camRef.current = clampCam(pt);
        apply(camRef.current);
      }
      const r = journey.regionAtX(jx);
      if (r.id !== region) {
        region = r.id;
        setFrontierX(jx);
      }
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setFrontierX(to);
        setWalking(false);
        settle();
        onJourneyStateChange?.({ lastDay: journey.day });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size.w]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Input -------------------------------------------------------------
  const pointers = useRef(new Map());
  const drag = useRef(null);
  const pinch = useRef(null);
  const localPoint = (e) => {
    const r = viewportRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const stopFollowing = () => {
    followRef.current = false;
    setLookedAround(true);
    cancelAnimationFrame(tween.current);
  };
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
      drag.current = null;
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, cam: { ...camRef.current }, moved: 0, id: e.pointerId };
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / pinch.current.dist;
      if (ratio > 1.35 || ratio < 0.74) {
        const r = viewportRef.current.getBoundingClientRect();
        stopFollowing();
        zoomBy(ratio > 1 ? 1 : -1, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        pinch.current = { dist };
      }
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    if (d.moved > 4 && !d.captured) {
      viewportRef.current.setPointerCapture?.(e.pointerId);
      d.captured = true;
      stopFollowing();
    }
    if (!d.captured) return;
    camRef.current = clampCam({ x: d.cam.x - dx / zRef.current, y: d.cam.y - dy / zRef.current });
    apply(camRef.current);
  };
  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = d.captured ? { ...d, ended: true } : null;
    if (d.captured) settle();
    setTimeout(() => {
      if (drag.current && drag.current.ended) drag.current = null;
    }, 0);
  };
  // Trackpad pinches arrive as ctrl + wheel; plain wheel scrolls the page as usual.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const p = localPoint(e);
      stopFollowing();
      zoomBy(e.deltaY < 0 ? 1 : -1, p.x, p.y);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const onKeyDown = (e) => {
    const step = Math.round(size.w / zRef.current / 3);
    const c = camRef.current;
    if (e.key === 'ArrowLeft') panTo({ x: c.x - step, y: c.y });
    else if (e.key === 'ArrowRight') panTo({ x: c.x + step, y: c.y });
    else if (e.key === 'ArrowUp') panTo({ x: c.x, y: c.y - step });
    else if (e.key === 'ArrowDown') panTo({ x: c.x, y: c.y + step });
    else if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-' || e.key === '_') zoomBy(-1);
    else if (e.key === 'Home') panTo(at(knightJx.current), { follow: true });
    else return;
    e.preventDefault();
  };

  // ---- Places -------------------------------------------------------------
  const [selected, setSelected] = useState(null);
  const places = useMemo(() => {
    const list = [];
    const taken = []; // feet of places already set down, and the knight's road
    const free = (x, y) => taken.every((t) => Math.abs(t.x - x) >= 8 || Math.abs(t.y - y) >= 9);
    /** Stand a place beside the road at journey x: try each side, then a little further out. */
    const setDown = (jx, off, prefer) => {
      const p = at(jx);
      const tries = [off, -off, off + 6, -(off + 6), off + 12, -(off + 12)].map((o) => o * prefer);
      for (const o of tries) {
        const x = Math.round(p.x + p.nx * o);
        const y = Math.round(p.y + p.ny * o) + 4;
        if (free(x, y)) {
          taken.push({ x, y });
          return { x, y };
        }
      }
      const x = Math.round(p.x + p.nx * off * prefer);
      const y = Math.round(p.y + p.ny * off * prefer) + 4;
      taken.push({ x, y });
      return { x, y };
    };
    for (const e of journey.encounters) {
      if (!e.boss) continue;
      const p = at(journey.fortressX);
      taken.push({ x: p.x, y: p.y + 4 }, { x: p.x - 8, y: p.y + 4 }, { x: p.x + 8, y: p.y + 4 });
      list.push({ type: 'fortress', id: e.id, x: p.x, y: p.y + 4, w: 24, h: 24, data: e, active: e.unlocked });
    }
    // Milestones first so they get the best spots; they alternate sides of the road.
    journey.landmarks.forEach((m, i) => {
      const { x, y } = setDown(m.x, 6, i % 2 ? 1 : -1);
      list.push({ type: 'landmark', id: m.id, x, y: y + 1, w: 9, h: 11, data: m, kind: landmarkKind(m), active: m.unlocked });
    });
    for (const e of journey.encounters) {
      if (e.boss) continue;
      const { x, y } = setDown(e.x, 10, 1);
      list.push({ type: 'camp', id: e.id, x, y, w: 9, h: 9, data: e, active: e.unlocked });
    }
    for (const st of journey.stories) {
      const { x, y } = setDown(st.x, 7, -1);
      list.push({ type: 'story', id: `story_${st.day}`, x, y, w: 7, h: 9, data: st, active: st.unlocked });
    }
    // Further south draws in front, as on the map art.
    return list.sort((a, b) => a.y - b.y);
  }, [journey]);

  const spriteFor = (p) => {
    if (p.type === 'landmark') return { id: `overworld_lm_${p.kind}`, animation: p.active ? 'lit' : 'locked' };
    if (p.type === 'story') return { id: 'overworld_story', animation: p.active ? 'unlocked' : 'locked' };
    if (p.type === 'camp') return { id: 'overworld_camp', animation: p.active ? 'idle' : 'locked' };
    return { id: 'overworld_fortress', animation: 'idle' };
  };

  // Only animate what is (nearly) on screen.
  const halfW = size.w / (2 * z) + 16;
  const halfH = size.h / (2 * z) + 16;
  const onScreen = (x, y) => Math.abs(x - settled.x) <= halfW && Math.abs(y - settled.y) <= halfH;

  const shadows = useMemo(
    () =>
      journey.regions.map((r) => {
        const s = registry.resolve(`overworld_shadow_${r.id}`);
        return { id: r.id, x: s.meta?.x ?? 0, y: s.meta?.y ?? 0 };
      }),
    [journey.regions, registry],
  );

  const renderPlace = (p) => {
    const sp = spriteFor(p);
    const isSel = selectedPlace === p;
    const bw = Math.max(p.w * S, MIN_HIT);
    const bh = Math.max(p.h * S, MIN_HIT);
    // (x, y) is the foot of the place; the button centres the sprite.
    const left = (p.x - Math.floor(p.w / 2)) * S - (bw - p.w * S) / 2;
    const top = (p.y - p.h) * S - (bh - p.h * S) / 2;
    return (
      <button
        key={`${p.type}_${p.id}`}
        type="button"
        className={`absolute qq-place flex items-center justify-center ${isSel ? 'is-selected' : ''}`}
        style={{ left, top, width: bw, height: bh }}
        aria-label={placeLabel(p)}
        aria-pressed={isSel}
        onClick={() => setSelected(isSel ? null : { type: p.type, id: p.id })}
        onFocus={() => {
          if (!onScreen(p.x, p.y)) panTo({ x: p.x, y: p.y });
        }}
      >
        <Sprite id={sp.id} animation={sp.animation} scale={S} playing={!reducedEffects && onScreen(p.x, p.y)} className="block" />
      </button>
    );
  };

  const selectedPlace = selected ? places.find((p) => p.type === selected.type && p.id === selected.id) : null;
  const here = journey.currentRegion;
  // While the camera follows the knight the label names the knight's region; once the
  // player looks around it names the land in the middle of the view.
  const viewRegion = lookedAround
    ? journey.regions.find((r) => r.id === OW.regionAtPoint(settled.x, settled.y)) || here
    : journey.regions.find((r) => r.id === journey.regionAtX(frontierX).id) || here;
  const knightPt = at(knightJx.current);
  const awayFromKnight = Math.hypot(settled.x - clampCam(knightPt).x, settled.y - clampCam(knightPt).y) * z > Math.min(size.w, size.h) * 0.3;
  const S = z;

  return (
    <div className="space-y-4">
      <p className="type-body text-bone text-center">
        Day {journey.day}: you are in <span className="text-brass-300">{here.name}</span>.
      </p>

      <div
        ref={viewportRef}
        className="qq-journey qq-overworld relative overflow-hidden qq-inset p-0 mx-auto select-none"
        style={{ height: size.h || 240, touchAction: 'none' }}
        role="region"
        aria-label={`World map, seen from above. You are on day ${journey.day} in ${here.name}. Drag or use the arrow keys to look around, plus and minus to zoom.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        {size.w > 0 && (
          <>
            <div ref={worldRef} className="absolute top-0 left-0 will-change-transform" style={{ width: MAP_W * S, height: MAP_H * S }}>
              <Sprite id="overworld_terrain" scale={S} className="block absolute top-0 left-0" />
              <Sprite id="overworld_sea" scale={S} playing={!reducedEffects} className="block absolute top-0 left-0 pointer-events-none" />

              {/* Story signposts lie under the shadow: a region's chapters are found by arriving.
                  Zoomed all the way out they are left off, so the whole-land view stays readable. */}
              {z > 1 && places.filter((p) => p.type === 'story').map(renderPlace)}

              {/* Land not yet reached lies in shadow. */}
              {shadows.map((sh) => {
                if (clearIds.has(sh.id) && sh.id !== revealing) return null;
                const lifting = sh.id === revealing;
                return (
                  <Sprite
                    key={`${sh.id}${lifting ? '-lift' : ''}`}
                    id={`overworld_shadow_${sh.id}`}
                    animation={lifting ? 'lift' : 'idle'}
                    scale={S}
                    onAnimationEnd={lifting ? finishReveal : undefined}
                    className="block absolute pointer-events-none"
                    style={{ left: sh.x * S, top: sh.y * S }}
                    aria-hidden="true"
                  />
                );
              })}

              {places.filter((p) => p.type !== 'story').map(renderPlace)}

              <div
                ref={knightRef}
                className="absolute pointer-events-none"
                style={{ left: (knightPt.x - 4) * S, top: (knightPt.y - 12) * S }}
                aria-hidden="true"
              >
                <Sprite id={`overworld_knight_${heroClass}`} animation={walking ? 'walk' : 'idle'} scale={S} className="block" />
              </div>

              {!reducedEffects && (
                <>
                  <div className="qq-cloud" style={{ '--qq-from': `${-40 * S}px`, '--qq-to': `${(MAP_W + 4) * S}px`, '--qq-steps': MAP_W + 44, top: 34 * S, animationDuration: '160s' }} aria-hidden="true">
                    <Sprite id="overworld_cloud" scale={S} className="block" />
                  </div>
                  <div className="qq-cloud" style={{ '--qq-from': `${-40 * S}px`, '--qq-to': `${(MAP_W + 4) * S}px`, '--qq-steps': MAP_W + 44, top: 150 * S, animationDuration: '220s', animationDelay: '-120s' }} aria-hidden="true">
                    <Sprite id="overworld_cloud" scale={S} className="block" />
                  </div>
                </>
              )}
            </div>

            {timeOfDay !== 'day' && <div className={`qq-light qq-light--${timeOfDay}`} data-time={timeOfDay} aria-hidden="true" />}

            <span className="absolute top-2 left-2 qq-chip qq-chip--brass px-2 py-0.5 text-sm pointer-events-none">
              {!lookedAround || clearIds.has(viewRegion.id) || viewRegion.id === revealing ? viewRegion.name : 'In shadow'}
            </span>

            {revealRegion && (
              <div className="absolute inset-x-2 top-1/3 text-center pointer-events-none animate-fade-in" role="status">
                <p className="type-heading text-bone qq-reveal-title">{revealRegion.name}</p>
                <p className="type-caption text-bone qq-reveal-title">{revealRegion.blurb}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={() => zoomBy(-1)} disabled={z === ZOOMS[0]} aria-label="Zoom out">
          Wider
        </Button>
        {awayFromKnight && (
          <Button size="sm" onClick={() => panTo(at(knightJx.current), { follow: true })}>
            <Sprite id="icon_helmet" scale={1} />Return to knight
          </Button>
        )}
        <Button size="sm" onClick={() => zoomBy(1)} disabled={z === ZOOMS[ZOOMS.length - 1]} aria-label="Zoom in">
          Closer
        </Button>
      </div>
      <p className="qq-label text-center">Drag to look around, pinch or use the buttons to zoom. Tap a landmark, signpost or camp. Zoom in to see story signposts.</p>

      {selectedPlace && (
        <PlaceDetail place={selectedPlace} day={journey.day} onClose={() => setSelected(null)} onOpenStory={onOpenStory} onFight={onFight} />
      )}

      <ul className="space-y-2">
        {journey.regions.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`qq-chip shrink-0 text-center px-2 py-1 text-base ${r.restored ? 'qq-chip--moss' : r.current ? 'qq-chip--brass' : 'qq-chip--locked'}`}>
              {r.restored ? 'Restored' : r.current ? 'Here' : 'Shrouded'}
            </span>
            <div className="min-w-0 flex-1 basis-32">
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
