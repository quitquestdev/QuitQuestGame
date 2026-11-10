'use client';

/**
 * <WorldMap daysSmokeFree={45} onReadRegion={(region) => ...} />
 *
 * The island of the hero's journey. The smog-covered map is shown in full;
 * the restored (green) map is revealed below the hero's banner, so the land
 * already travelled visibly heals. The banner walks the road by day,
 * interpolated between the waypoints stored in the map's manifest meta.
 *
 * Everything comes from the manifest (map_world_smog, map_world_clear,
 * map_marker), so a repainted map with new waypoints needs no code change.
 */
import React from 'react';
import Sprite from './Sprite';
import Button from './ui/Button';
import { useSpriteRegistry } from '../lib/sprites/SpriteProvider';

const SCALE = 2;

/** Hero position on the road for a given day, in native map pixels. */
export function positionForDay(waypoints, day) {
  if (!waypoints || !waypoints.length) return { x: 0, y: 0 };
  if (day <= waypoints[0].day) return { x: waypoints[0].x, y: waypoints[0].y };
  for (let i = 0; i + 1 < waypoints.length; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (day <= b.day) {
      const t = (day - a.day) / (b.day - a.day);
      return { x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) };
    }
  }
  const last = waypoints[waypoints.length - 1];
  return { x: last.x, y: last.y };
}

export function regionForDay(regions, day) {
  if (!regions || !regions.length) return null;
  return regions.find((r) => day <= r.to) || regions[regions.length - 1];
}

export default function WorldMap({ daysSmokeFree, onReadRegion }) {
  const registry = useSpriteRegistry();
  const clear = registry.resolve('map_world_clear');
  const marker = registry.resolve('map_marker');
  const meta = clear.meta || {};
  const regions = meta.regions || [];
  const width = (meta.width || clear.frameWidth) * SCALE;
  const height = (meta.height || clear.frameHeight) * SCALE;

  const pos = positionForDay(meta.waypoints, daysSmokeFree);
  const waypoints = meta.waypoints || [];
  const journeyDone = waypoints.length > 0 && daysSmokeFree >= waypoints[waypoints.length - 1].day;
  // Reveal everything below the banner; once the road ends, all of it.
  const revealTop = journeyDone ? 0 : pos.y * SCALE;
  const here = regionForDay(regions, Math.max(1, daysSmokeFree));
  const anchorX = marker.meta?.anchorX ?? 0;
  const anchorY = marker.meta?.anchorY ?? marker.frameHeight - 1;

  return (
    <div className="space-y-4">
      <p className="type-body text-bone text-center">
        Day {daysSmokeFree}: {here ? <>you are in <span className="text-brass-300">{here.name}</span>.</> : 'your journey begins.'}
      </p>

      <div className="flex justify-center">
        <div
          className="relative qq-inset p-0"
          style={{ width, height }}
          role="img"
          aria-label={`World map. You are on day ${daysSmokeFree}${here ? `, in ${here.name}` : ''}. Land you have travelled is restored to green.`}
        >
          <Sprite id="map_world_smog" scale={SCALE} className="absolute inset-0" />
          {/* Restored land below the hero: whole native pixels, so the edge stays crisp */}
          <Sprite
            id="map_world_clear"
            scale={SCALE}
            className="absolute inset-0"
            style={{ clipPath: `inset(${revealTop}px 0 0 0)` }}
          />
          <Sprite
            id="map_marker"
            scale={SCALE}
            className="absolute"
            style={{ left: (pos.x - anchorX) * SCALE, top: (pos.y - anchorY) * SCALE }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {regions.map((r) => {
          const explored = daysSmokeFree > r.to;
          const current = here && here.id === r.id;
          const reached = daysSmokeFree >= r.from;
          return (
            <li key={r.id} className="flex items-center gap-3">
              <span
                className={`qq-chip shrink-0 text-center px-2 py-1 text-base ${explored ? 'qq-chip--moss' : current ? 'qq-chip--brass' : 'qq-chip--locked'}`}
              >
                {explored ? 'Restored' : current ? 'Here' : 'Shrouded'}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`type-subheading ${reached ? 'text-bone' : 'text-stone-400'}`}>{r.name}</p>
                <p className="qq-label">Days {r.from}-{r.to}</p>
              </div>
              {reached && onReadRegion && (
                <Button size="sm" onClick={() => onReadRegion(r)} aria-label={`Read the story of ${r.name}`}>
                  Read
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
