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
import { landmarkKind, placeLabel } from './places';
import MapParticles from './MapParticles';
import PlaceDetail from './PlaceDetail';
import { useReducedEffects, useTimeOfDay, useRegionReveals } from './useJourneyMap';

// Living regions get swaying grass along the trail.
const GRASS_REGIONS = new Set(['fields', 'woods', 'heights', 'epilogue']);

// Pixel scale: 2x normally; 1x when the map is very narrow (e.g. at 200% browser
// zoom), which keeps the art the same physical size. Always a whole number.
const NARROW_CSS = 220;
const LAYERS = ['sky', 'far', 'mid', 'ground', 'fore'];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * journeyState (saved with progress): { revealsSeen: [regionId], lastDay }
 * onJourneyStateChange(patch) merges into it.
 */
export default function JourneyMap({
  journey,
  heroSpriteId,
  onReadRegion,
  onOpenStory,
  onFight,
  journeyState = {},
  onJourneyStateChange,
  reducedEffects: reducedSetting = false,
  compact = false, // Quest tab: no region list; a link to the full map instead
  celebrate = null, // { id, xp }: a short cheer over the knight after a won battle
  onOpenFull,
}) {
  const registry = useSpriteRegistry();
  const reducedEffects = useReducedEffects(reducedSetting);
  const timeOfDay = useTimeOfDay();

  // After a won battle: the knight cheers on the map and the XP floats up.
  const [cheer, setCheer] = useState(null);
  useEffect(() => {
    if (!celebrate) return undefined;
    setCheer(celebrate);
    const t = setTimeout(() => setCheer(null), 2800);
    return () => clearTimeout(t);
  }, [celebrate && celebrate.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const viewportRef = useRef(null);
  const layerRefs = useRef({});
  const camRef = useRef(journey.playerX);
  const [viewW, setViewW] = useState(0); // native pixels
  const [S, setS] = useState(2); // whole-number pixel scale
  const [settledCam, setSettledCam] = useState(journey.playerX);

  // ---- The knight -------------------------------------------------------
  // If the day has advanced since the map was last shown, the knight walks
  // from where it stood then (frozen at mount) to today's position.
  const [walkFrom] = useState(() =>
    typeof journeyState.lastDay === 'number' && journeyState.lastDay < journey.day && !reducedEffects
      ? journey.dayToX(journeyState.lastDay)
      : null,
  );
  const knightRef = useRef(null);
  const knightXRef = useRef(walkFrom ?? journey.playerX);
  const [heroAnim, setHeroAnim] = useState('idle');
  // How far the knight has got (native x); fog only lifts once it arrives.
  const [frontierX, setFrontierX] = useState(knightXRef.current);
  const followRef = useRef(true); // camera follows the knight until the player looks around
  const horizonRef = useRef(null);

  // ---- Fog of war and one-time reveals ---------------------------------
  const { clearIds, revealing, revealRegion, finishReveal } = useRegionReveals({ journey, journeyState, onJourneyStateChange, reducedEffects, frontierX });

  const firstFogged = journey.regions.find((r) => !clearIds.has(r.id) && r.id !== revealing);
  const fogStartX = firstFogged ? firstFogged.x0 : journey.width;

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
    const measure = () => {
      const scale = el.clientWidth < NARROW_CSS ? 1 : 2;
      setS(scale);
      setViewW(Math.min(J.MAX_VIEW_NATIVE, Math.floor(el.clientWidth / scale)));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const clampCam = useCallback((c) => clamp(c, viewW / 2, journey.width - viewW / 2), [viewW, journey.width]);

  /**
   * Move every layer for camera centre `cam` (whole native pixels).
   * With Reduced Effects, a live drag moves only the road; the background
   * layers stay still and catch up once the view settles (no parallax motion).
   */
  const apply = useCallback(
    (cam, { live = false } = {}) => {
      const c = Math.round(cam);
      for (const name of LAYERS) {
        const el = layerRefs.current[name];
        if (!el) continue;
        if (live && reducedEffects && name !== 'ground') continue;
        const { speed, pad } = layerInfo[name];
        const left = Math.round(viewW / 2 - speed * c - pad);
        el.style.transform = `translate3d(${left * S}px, 0, 0)`;
      }
      for (const name of ['path', 'fog']) {
        const el = layerRefs.current[name];
        if (el) el.style.transform = `translate3d(${Math.round(viewW / 2 - c) * S}px, 0, 0)`;
      }
      // The fortress stays on the horizon until the real one comes into view.
      const h = horizonRef.current;
      if (h) {
        const fortressOnScreen = viewW / 2 + (journey.fortressX - c) < viewW + 28;
        h.style.display = fortressOnScreen ? 'none' : 'block';
      }
    },
    [layerInfo, viewW, journey.fortressX, reducedEffects, S],
  );

  const placeKnight = (x) => {
    knightXRef.current = x;
    if (knightRef.current) knightRef.current.style.left = `${(Math.round(x) - 16) * S}px`;
  };

  const settle = useCallback(() => {
    apply(camRef.current); // bring any still layers up to date
    setSettledCam(Math.round(camRef.current));
  }, [apply]);

  // Centre on the knight when the size changes.
  useLayoutEffect(() => {
    if (!viewW) return;
    camRef.current = clampCam(knightXRef.current);
    apply(camRef.current);
    settle();
  }, [viewW, S]); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth camera moves (instant with Reduced Effects).
  const tween = useRef(null);
  const panTo = useCallback(
    (target, { follow = false } = {}) => {
      followRef.current = follow;
      cancelAnimationFrame(tween.current);
      const to = clampCam(target);
      if (reducedEffects) {
        camRef.current = to;
        apply(to);
        settle();
        return;
      }
      const from = camRef.current;
      const t0 = performance.now();
      const dur = 320;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - (1 - p) * (1 - p);
        camRef.current = from + (to - from) * e;
        apply(camRef.current);
        if (p < 1) tween.current = requestAnimationFrame(step);
        else settle();
      };
      tween.current = requestAnimationFrame(step);
    },
    [apply, clampCam, reducedEffects, settle],
  );


  // The walk: from the last day shown to today, the camera following along.
  // Runs once per visit (not again when the viewport resizes or rotates).
  const walkedRef = useRef(false);
  useEffect(() => {
    if (!viewW || walkedRef.current) return undefined;
    walkedRef.current = true;
    if (walkFrom === null) {
      if (journeyState.lastDay !== journey.day) onJourneyStateChange?.({ lastDay: journey.day });
      return undefined;
    }
    const start = walkFrom;
    const end = journey.playerX;
    const dur = clamp(Math.abs(end - start) * 12, 900, 4500);
    let raf;
    let region = journey.regionAtX(start).id;
    const t0 = performance.now() + 600; // a beat before setting off
    setHeroAnim('walk');
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const x = Math.round(start + (end - start) * p);
      placeKnight(x);
      if (followRef.current) {
        camRef.current = clampCam(x);
        apply(camRef.current);
      }
      const r = journey.regionAtX(x);
      if (r.id !== region) {
        region = r.id;
        setFrontierX(x);
      }
      if (p < 1) raf = requestAnimationFrame(step);
      else {
        setFrontierX(end);
        setHeroAnim('idle');
        settle();
        onJourneyStateChange?.({ lastDay: journey.day });
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [viewW]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    const stepPx = Math.round(viewW * 0.4);
    if (e.key === 'ArrowLeft') panTo(camRef.current - stepPx);
    else if (e.key === 'ArrowRight') panTo(camRef.current + stepPx);
    else if (e.key === 'Home') panTo(0);
    else if (e.key === 'End') panTo(journey.width);
    else return;
    e.preventDefault();
  };

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
      followRef.current = false;
      cancelAnimationFrame(tween.current);
    }
    if (!d.captured) return;
    camRef.current = clampCam(d.cam - dx / S);
    apply(camRef.current, { live: true });
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

  // ---- Places on the road ---------------------------------------------
  const [selected, setSelected] = useState(null); // { type, id }
  const places = useMemo(() => {
    const list = [];
    for (const m of journey.landmarks) {
      list.push({ type: 'landmark', id: m.id, x: m.x, w: 16, h: 24, data: m, kind: landmarkKind(m), active: m.unlocked });
    }
    const taken = list.map((p) => p.x);
    for (const e of journey.encounters) {
      if (e.boss) {
        list.push({ type: 'fortress', id: e.id, x: journey.fortressX, w: 64, h: 64, data: e, active: e.unlocked });
        continue;
      }
      const near = taken.some((x) => Math.abs(x - e.x) < 14);
      list.push({ type: 'camp', id: e.id, x: e.x + (near ? 16 : 0), w: 16, h: 16, data: e, active: e.unlocked });
    }
    for (const st of journey.stories) {
      // Signposts stand just behind any landmark on the same day.
      const near = taken.some((x) => Math.abs(x - st.x) < 12);
      list.push({ type: 'story', id: `story_${st.day}`, x: st.x - (near ? 11 : 0), w: 12, h: 16, data: st, active: st.unlocked });
    }
    // Draw smaller things last so they sit in front.
    return list.sort((a, b) => b.h - a.h || a.x - b.x);
  }, [journey]);

  const grass = useMemo(() => {
    const out = [];
    for (const r of journey.regions) {
      if (!GRASS_REGIONS.has(r.id)) continue;
      for (let x = r.x0 + 10; x < r.x1 - 6; x += 26) out.push(x + ((x * 7) % 9));
    }
    return out;
  }, [journey.regions]);

  // Only animate what is (nearly) on screen.
  const visibleLo = settledCam - viewW / 2 - 24;
  const visibleHi = settledCam + viewW / 2 + 24;
  const onScreen = (x) => x >= visibleLo && x <= visibleHi;
  // Decorative grass only exists within a screen of the view.
  const nearView = (x) => Math.abs(x - settledCam) <= viewW * 1.5;
  // Off-screen places mount a frame after the visible ones, so opening the
  // map does not do all its work in one frame.
  const [allPlaces, setAllPlaces] = useState(false);
  useEffect(() => {
    if (!viewW || allPlaces) return undefined;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAllPlaces(true)));
    return () => cancelAnimationFrame(id);
  }, [viewW, allPlaces]);

  const spriteFor = (p) => {
    if (p.type === 'landmark') return { id: `journey_lm_${p.kind}`, animation: p.active ? 'lit' : 'locked' };
    if (p.type === 'story') return { id: 'journey_story', animation: p.active ? 'unlocked' : 'locked' };
    if (p.type === 'camp') return { id: 'journey_camp', animation: p.active ? 'idle' : 'locked' };
    return { id: 'journey_fortress', animation: 'idle' };
  };

  const selectedPlace = selected ? places.find((p) => p.type === selected.type && p.id === selected.id) : null;

  const height = J.WORLD_HEIGHT * S;
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
        style={{ height, maxWidth: J.MAX_VIEW_NATIVE * S, touchAction: 'pan-y' }}
        role="region"
        aria-label={`World map. You are on day ${journey.day} in ${here.name}. Drag or use the arrow keys to look along the road.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {viewW > 0 && (
          <>
            {['sky', 'far', 'mid'].map((name) => (
              <div key={name} ref={(el) => (layerRefs.current[name] = el)} className="absolute top-0 left-0 will-change-transform" aria-hidden="true">
                <Sprite id={layerInfo[name].id} scale={S} className="block" />
              </div>
            ))}

            {/* The road: ground, props and the knight share the camera exactly. */}
            <div ref={(el) => (layerRefs.current.path = el)} className="absolute top-0 left-0 will-change-transform" style={{ width: journey.width * S, height }}>
              <Sprite id="journey_ground" scale={S} className="block absolute top-0 left-0" />
              {grass.filter(nearView).map((x) => (
                <div key={`g${x}`} className="absolute pointer-events-none" style={{ left: (x - 4) * S, top: (J.PROP_BASELINE + 1 - 8) * S }} aria-hidden="true">
                  <Sprite id="journey_grass" scale={S} playing={!reducedEffects && onScreen(x)} className="block" />
                </div>
              ))}
              {places.filter((p) => allPlaces || onScreen(p.x)).map((p) => {
                const sp = spriteFor(p);
                const isSel = selectedPlace === p;
                return (
                  <button
                    key={`${p.type}_${p.id}`}
                    type="button"
                    className={`absolute qq-place ${isSel ? 'is-selected' : ''}`}
                    style={{ left: (p.x - p.w / 2) * S, top: (J.PROP_BASELINE + 1 - p.h) * S, width: p.w * S, height: p.h * S }}
                    aria-label={placeLabel(p)}
                    aria-pressed={isSel}
                    onClick={() => setSelected(isSel ? null : { type: p.type, id: p.id })}
                    onFocus={() => {
                      if (!onScreen(p.x)) panTo(p.x);
                    }}
                  >
                    <Sprite id={sp.id} animation={sp.animation} scale={S} playing={!reducedEffects && onScreen(p.x)} className="block" />
                  </button>
                );
              })}
              <div
                ref={knightRef}
                className="absolute pointer-events-none"
                style={{ left: (Math.round(knightXRef.current) - 16) * S, top: (J.KNIGHT_BASELINE + 1 - 32) * S }}
                aria-hidden="true"
              >
                <Sprite id={heroSpriteId} animation={cheer && heroAnim === 'idle' ? 'victory' : heroAnim} scale={S} />
                {cheer && (
                  <span key={cheer.id} className={`qq-mapcheer ${reducedEffects ? 'is-still' : ''}`}>
                    {!reducedEffects && <Sprite id="icon_sparkle" scale={1} />}+{cheer.xp} XP
                  </span>
                )}
              </div>
            </div>

            <div ref={(el) => (layerRefs.current.fore = el)} className="absolute top-0 left-0 will-change-transform pointer-events-none" aria-hidden="true">
              <Sprite id={layerInfo.fore.id} scale={S} className="block" />
            </div>

            {/* Smog over land not yet reached, and the one-time reveal. */}
            <div ref={(el) => (layerRefs.current.fog = el)} className="absolute top-0 left-0 will-change-transform pointer-events-none" style={{ width: journey.width * S, height }} aria-hidden="true">
              {fogStartX < journey.width && (
                <>
                  <Sprite id="journey_fog" scale={S} className="block absolute top-0 left-0" style={{ clipPath: `inset(0 0 0 ${fogStartX * S}px)` }} />
                  {/* A thinner band in front of the edge so the smog dissolves instead of stopping in a line */}
                  <Sprite
                    id="journey_fog"
                    animation="lift"
                    frame={1}
                    scale={S}
                    className="block absolute top-0 left-0"
                    style={{ clipPath: `inset(0 ${(journey.width - fogStartX) * S}px 0 ${Math.max(0, fogStartX - 14) * S}px)` }}
                  />
                </>
              )}
              {revealRegion && (
                <Sprite
                  key={revealRegion.id}
                  id="journey_fog"
                  animation="lift"
                  scale={S}
                  onAnimationEnd={finishReveal}
                  className="block absolute top-0 left-0"
                  style={{ clipPath: `inset(0 ${(journey.width - revealRegion.x1) * S}px 0 ${revealRegion.x0 * S}px)` }}
                />
              )}
            </div>

            {timeOfDay !== 'day' && <div className={`qq-light qq-light--${timeOfDay}`} data-time={timeOfDay} aria-hidden="true" />}
            {!reducedEffects && <MapParticles regionId={viewRegion.id} timeOfDay={timeOfDay} />}

            {/* The destination, always on the horizon until it comes into view */}
            <div ref={horizonRef} className="absolute pointer-events-none" style={{ left: (viewW - 40) * S, top: 38 * S }} aria-hidden="true">
              <Sprite id="journey_fortress_far" scale={S} />
            </div>

            <span className="absolute top-2 left-2 qq-chip qq-chip--brass px-2 py-0.5 text-sm pointer-events-none">
              {viewRegion.name}
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
        <Button size="sm" onClick={() => panTo(camRef.current - viewW * 0.6)} aria-label="Look back along the road">
          <Sprite id="icon_arrow_left" scale={1} />Back
        </Button>
        {Math.abs(settledCam - clamp(knightXRef.current, viewW / 2, journey.width - viewW / 2)) > viewW * 0.3 && (
          <Button size="sm" onClick={() => panTo(knightXRef.current, { follow: true })}>
            <Sprite id="icon_helmet" scale={1} />Return to knight
          </Button>
        )}
        <Button size="sm" onClick={() => panTo(camRef.current + viewW * 0.6)} aria-label="Look ahead along the road">
          Ahead<Sprite id="icon_arrow_right" scale={1} />
        </Button>
      </div>
      <p className="qq-label text-center">Drag or use the arrows to look around. Tap a landmark, signpost or camp.</p>

      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          day={journey.day}
          onClose={() => setSelected(null)}
          onOpenStory={onOpenStory}
          onFight={onFight}
        />
      )}

      {compact && onOpenFull && (
        <div className="text-center">
          <Button size="sm" onClick={onOpenFull}>
            <Sprite id="icon_map" scale={1} />Regions &amp; full map
          </Button>
        </div>
      )}

      {!compact && (
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
      )}
    </div>
  );
}
