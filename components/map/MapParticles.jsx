'use client';

/**
 * Ambient particles over the world map, chosen by the region in view and
 * the real time of day. They follow recovery: ash and smoke early on, then
 * light motes, pollen, falling leaves and, at dusk and night in the living
 * land, fireflies.
 *
 * Each particle is a palette-coloured pixel block moved by a CSS animation
 * in stepped, whole-pixel jumps. The count is capped and the whole layer is
 * left out entirely with Reduced Effects or the system reduce-motion setting.
 */
import React from 'react';

export const MAX_PARTICLES = 16;

const BY_REGION = {
  ashen: ['ash', 'ash', 'smoke'],
  marsh: ['smoke', 'smoke', 'ash'],
  haze: ['mote', 'smoke', 'mote'],
  fields: ['pollen', 'pollen', 'mote'],
  woods: ['leaf', 'pollen', 'leaf'],
  heights: ['pollen', 'mote', 'pollen'],
  fortress: ['ash', 'ember', 'smoke'],
  epilogue: ['pollen', 'leaf', 'mote'],
};

// Fireflies only where the land is alive, and only after dark.
const FIREFLY_REGIONS = new Set(['woods', 'fields', 'heights', 'epilogue']);

/** Deterministic 0..1 per index, so particles do not reshuffle on re-render. */
const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export default function MapParticles({ regionId, timeOfDay, count = 12 }) {
  const kinds = [...(BY_REGION[regionId] || BY_REGION.ashen)];
  if (FIREFLY_REGIONS.has(regionId) && (timeOfDay === 'dusk' || timeOfDay === 'night')) kinds.push('firefly', 'firefly');
  const n = Math.min(MAX_PARTICLES, count);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" data-particles={regionId}>
      {Array.from({ length: n }, (_, i) => {
        const kind = kinds[i % kinds.length];
        const rising = kind === 'smoke' || kind === 'ember' || kind === 'pollen' || kind === 'mote';
        return (
          <span
            key={`${regionId}-${i}`}
            className={`qq-pt qq-pt--${kind}`}
            style={{
              left: `${Math.round(rand(i, 1) * 96)}%`,
              top: rising ? `${50 + Math.round(rand(i, 2) * 45)}%` : `${Math.round(rand(i, 2) * 40) - 10}%`,
              animationDelay: `${-(rand(i, 3) * 10).toFixed(2)}s`,
              animationDuration: `${(kind === 'firefly' ? 3 : 7) + Math.round(rand(i, 4) * 6)}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/** dawn 5-7, day 8-16, dusk 17-19, night 20-4, from the device clock. */
export function timeOfDayFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 8) return 'dawn';
  if (h >= 8 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
}
