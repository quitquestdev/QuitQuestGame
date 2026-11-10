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
import { landmarkKind, LANDMARK_NAMES, durationLabel, TIER_LABELS } from './places';
import MapParticles, { timeOfDayFor } from './MapParticles';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Living regions get swaying grass along the trail.
const GRASS_REGIONS = new Set(['fields', 'woods', 'heights', 'epilogue']);

const SCALE = 2;
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
}) {
  const registry = useSpriteRegistry();
  // Reduced Effects: the player's setting, or the system's reduce-motion preference.
  const [osReduced, setOsReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOsReduced(mq.matches);
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  const reducedEffects = reducedSetting || osReduced;

  // Light follows the device clock; checked again every ten minutes.
  const [timeOfDay, setTimeOfDay] = useState(() => timeOfDayFor());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(timeOfDayFor()), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const viewportRef = useRef(null);
  const layerRefs = useRef({});
  const camRef = useRef(journey.playerX);
  const [viewW, setViewW] = useState(0); // native pixels
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
  // Regions shown clear: those whose reveal has played (now or before).
  const [clearIds, setClearIds] = useState(() => {
    const seen = new Set(journeyState.revealsSeen || []);
    // First visit: land already crossed before the map existed is clear;
    // only the current region gets its reveal.
    if (!journeyState.revealsSeen) journey.regions.filter((r) => r.reached && !r.current).forEach((r) => seen.add(r.id));
    return seen;
  });
  const [revealing, setRevealing] = useState(null); // region id being revealed
  const stateRef = useRef(journeyState);
  stateRef.current = journeyState;

  const markSeen = useCallback(
    (ids) => {
      setClearIds((prev) => new Set([...prev, ...ids]));
      const seen = new Set([...(stateRef.current.revealsSeen || []), ...ids]);
      onJourneyStateChange?.({ revealsSeen: [...seen] });
    },
    [onJourneyStateChange],
  );

  // First visit: save the regions cleared without a reveal, so they stay clear.
  useEffect(() => {
    if (!journeyState.revealsSeen) {
      const silent = journey.regions.filter((r) => r.reached && !r.current).map((r) => r.id);
      onJourneyStateChange?.({ revealsSeen: silent });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Queue reveals for reached regions that are still fogged, in road order.
  const pending = journey.regions.filter((r) => r.reached && !clearIds.has(r.id) && r.x0 <= frontierX).map((r) => r.id);
  const pendingKey = pending.join(',');
  useEffect(() => {
    if (revealing || !pending.length) return undefined;
    if (reducedEffects) {
      markSeen(pending); // no animation, but still only "new" once
      return undefined;
    }
    const t = setTimeout(() => setRevealing(pending[0]), 500);
    return () => clearTimeout(t);
  }, [pendingKey, revealing, reducedEffects]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishReveal = useCallback(() => {
    const id = revealing;
    setTimeout(() => {
      setRevealing(null);
      if (id) markSeen([id]);
    }, 900); // let the title card linger a moment
  }, [revealing, markSeen]);

  const firstFogged = journey.regions.find((r) => !clearIds.has(r.id) && r.id !== revealing);
  const fogStartX = firstFogged ? firstFogged.x0 : journey.width;
  const revealRegion = revealing ? journey.regions.find((r) => r.id === revealing) : null;

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
      for (const name of ['path', 'fog']) {
        const el = layerRefs.current[name];
        if (el) el.style.transform = `translate3d(${Math.round(viewW / 2 - c) * SCALE}px, 0, 0)`;
      }
      // The fortress stays on the horizon until the real one comes into view.
      const h = horizonRef.current;
      if (h) {
        const fortressOnScreen = viewW / 2 + (journey.fortressX - c) < viewW + 28;
        h.style.display = fortressOnScreen ? 'none' : 'block';
      }
    },
    [layerInfo, viewW, journey.fortressX],
  );

  const placeKnight = (x) => {
    knightXRef.current = x;
    if (knightRef.current) knightRef.current.style.left = `${(Math.round(x) - 16) * SCALE}px`;
  };

  const settle = useCallback(() => setSettledCam(Math.round(camRef.current)), []);

  // Centre on the knight when the size changes.
  useLayoutEffect(() => {
    if (!viewW) return;
    camRef.current = clampCam(knightXRef.current);
    apply(camRef.current);
    settle();
  }, [viewW]); // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => {
    if (!viewW) return undefined;
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

  const spriteFor = (p) => {
    if (p.type === 'landmark') return { id: `journey_lm_${p.kind}`, animation: p.active ? 'lit' : 'locked' };
    if (p.type === 'story') return { id: 'journey_story', animation: p.active ? 'unlocked' : 'locked' };
    if (p.type === 'camp') return { id: 'journey_camp', animation: p.active ? 'idle' : 'locked' };
    return { id: 'journey_fortress', animation: 'idle' };
  };

  const labelFor = (p) => {
    if (p.type === 'landmark') return p.active ? `${p.data.title}, reached` : `Locked landmark, ${durationLabel(p.data.day)}`;
    if (p.type === 'story') return p.active ? `Story, day ${p.data.day}: ${p.data.title}` : `Locked story, day ${p.data.day}`;
    if (p.type === 'camp') return `${TIER_LABELS[p.data.tier]} camp`;
    return "The Nicotine Lord's fortress";
  };

  const selectedPlace = selected ? places.find((p) => p.type === selected.type && p.id === selected.id) : null;

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
                <Sprite id={layerInfo[name].id} scale={SCALE} className="block" />
              </div>
            ))}

            {/* The road: ground, props and the knight share the camera exactly. */}
            <div ref={(el) => (layerRefs.current.path = el)} className="absolute top-0 left-0 will-change-transform" style={{ width: journey.width * SCALE, height }}>
              <Sprite id="journey_ground" scale={SCALE} className="block absolute top-0 left-0" />
              {grass.map((x) => (
                <div key={`g${x}`} className="absolute pointer-events-none" style={{ left: (x - 4) * SCALE, top: (J.PROP_BASELINE + 1 - 8) * SCALE }} aria-hidden="true">
                  <Sprite id="journey_grass" scale={SCALE} playing={!reducedEffects && onScreen(x)} className="block" />
                </div>
              ))}
              {places.map((p) => {
                const sp = spriteFor(p);
                const isSel = selectedPlace === p;
                return (
                  <button
                    key={`${p.type}_${p.id}`}
                    type="button"
                    className={`absolute qq-place ${isSel ? 'is-selected' : ''}`}
                    style={{ left: (p.x - p.w / 2) * SCALE, top: (J.PROP_BASELINE + 1 - p.h) * SCALE, width: p.w * SCALE, height: p.h * SCALE }}
                    aria-label={labelFor(p)}
                    aria-pressed={isSel}
                    onClick={() => setSelected(isSel ? null : { type: p.type, id: p.id })}
                    onFocus={() => {
                      if (!onScreen(p.x)) panTo(p.x);
                    }}
                  >
                    <Sprite id={sp.id} animation={sp.animation} scale={SCALE} playing={!reducedEffects && onScreen(p.x)} className="block" />
                  </button>
                );
              })}
              <div
                ref={knightRef}
                className="absolute pointer-events-none"
                style={{ left: (Math.round(knightXRef.current) - 16) * SCALE, top: (J.KNIGHT_BASELINE + 1 - 32) * SCALE }}
                aria-hidden="true"
              >
                <Sprite id={heroSpriteId} animation={heroAnim} scale={SCALE} />
              </div>
            </div>

            <div ref={(el) => (layerRefs.current.fore = el)} className="absolute top-0 left-0 will-change-transform pointer-events-none" aria-hidden="true">
              <Sprite id={layerInfo.fore.id} scale={SCALE} className="block" />
            </div>

            {/* Smog over land not yet reached, and the one-time reveal. */}
            <div ref={(el) => (layerRefs.current.fog = el)} className="absolute top-0 left-0 will-change-transform pointer-events-none" style={{ width: journey.width * SCALE, height }} aria-hidden="true">
              {fogStartX < journey.width && (
                <>
                  <Sprite id="journey_fog" scale={SCALE} className="block absolute top-0 left-0" style={{ clipPath: `inset(0 0 0 ${fogStartX * SCALE}px)` }} />
                  {/* A thinner band in front of the edge so the smog dissolves instead of stopping in a line */}
                  <Sprite
                    id="journey_fog"
                    animation="lift"
                    frame={1}
                    scale={SCALE}
                    className="block absolute top-0 left-0"
                    style={{ clipPath: `inset(0 ${(journey.width - fogStartX) * SCALE}px 0 ${Math.max(0, fogStartX - 14) * SCALE}px)` }}
                  />
                </>
              )}
              {revealRegion && (
                <Sprite
                  key={revealRegion.id}
                  id="journey_fog"
                  animation="lift"
                  scale={SCALE}
                  onAnimationEnd={finishReveal}
                  className="block absolute top-0 left-0"
                  style={{ clipPath: `inset(0 ${(journey.width - revealRegion.x1) * SCALE}px 0 ${revealRegion.x0 * SCALE}px)` }}
                />
              )}
            </div>

            {timeOfDay !== 'day' && <div className={`qq-light qq-light--${timeOfDay}`} data-time={timeOfDay} aria-hidden="true" />}
            {!reducedEffects && <MapParticles regionId={viewRegion.id} timeOfDay={timeOfDay} />}

            {/* The destination, always on the horizon until it comes into view */}
            <div ref={horizonRef} className="absolute pointer-events-none" style={{ left: (viewW - 40) * SCALE, top: 38 * SCALE }} aria-hidden="true">
              <Sprite id="journey_fortress_far" scale={SCALE} />
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

function PlaceDetail({ place, day, onClose, onOpenStory, onFight }) {
  const { type, data, active } = place;
  let body;
  if (type === 'landmark') {
    body = active ? (
      <>
        <div className="flex items-center gap-3">
          <Sprite id={data.icon} scale={2} />
          <div className="min-w-0">
            <p className="type-subheading text-brass-300">{data.title}</p>
            <p className="qq-label text-moss-300">Reached at {durationLabel(data.day)} smoke-free</p>
          </div>
        </div>
        <p className="type-body text-bone">{data.description}</p>
        <p className="qq-label text-moss-300">+{data.experience} XP</p>
      </>
    ) : (
      <>
        <p className="type-subheading text-stone-400">A landmark lies ahead</p>
        <p className="type-body text-bone">
          Something stirs in {LANDMARK_NAMES[place.kind]} here. It lights up at {durationLabel(data.day)} smoke-free.
        </p>
      </>
    );
  } else if (type === 'story') {
    body = active ? (
      <>
        <p className="type-subheading text-brass-300">Day {data.day}: {data.title}</p>
        <Button size="sm" onClick={() => onOpenStory?.(data.day)}>Read this chapter</Button>
      </>
    ) : (
      <>
        <p className="type-subheading text-stone-400">A story waits here</p>
        <p className="type-body text-bone">It unlocks on day {data.day}.</p>
      </>
    );
  } else if (type === 'camp') {
    body = (
      <>
        <p className="type-subheading text-rust-300">{TIER_LABELS[data.tier]}</p>
        <p className="type-body text-bone">{data.enemies.join(', ')} {data.enemies.length === 1 ? 'roams' : 'roam'} this camp.</p>
        {active ? (
          <Button tone="moss" onClick={() => onFight?.(data)}>Fight a {data.tier} craving</Button>
        ) : (
          <p className="type-caption text-stone-400">The road reaches this camp on day {data.day}. You can fight any craving from the Quest tab at any time.</p>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="type-subheading text-rust-300">The Nicotine Lord's Fortress</p>
        {active ? (
          <>
            <p className="type-body text-bone">Six months free. The Nicotine Lord waits behind these walls.</p>
            <Button tone="moss" onClick={() => onFight?.(data)}>Challenge the Nicotine Lord</Button>
          </>
        ) : (
          <p className="type-body text-bone">
            The Nicotine Lord waits here at day 180. {Math.max(0, 180 - day)} day{180 - day === 1 ? '' : 's'} to go.
          </p>
        )}
      </>
    );
  }
  return (
    <div className="qq-inset space-y-2" role="dialog" aria-label="Place details">
      {body}
      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
