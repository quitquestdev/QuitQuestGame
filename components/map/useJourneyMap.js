'use client';

/**
 * State shared by both world map views (the road and the overhead map):
 * Reduced Effects, the time of day, and the one-time region reveals.
 * Positions are journey x values (lib/journey/layout.js), which both views
 * understand, so the reveal rules are identical in each.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { timeOfDayFor } from './MapParticles';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The player's Reduced Effects setting, or the system's reduce-motion preference. */
export function useReducedEffects(setting) {
  const [osReduced, setOsReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setOsReduced(mq.matches);
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return !!setting || osReduced;
}

/** Light follows the device clock; checked again every ten minutes. */
export function useTimeOfDay() {
  const [timeOfDay, setTimeOfDay] = useState(() => timeOfDayFor());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(timeOfDayFor()), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return timeOfDay;
}

/**
 * Which regions are clear, and which one is being revealed right now.
 *
 * journeyState (saved with progress): { revealsSeen: [regionId], lastDay }
 * frontierX: how far the knight has got (journey x); a region only reveals
 * once the knight arrives in it.
 */
export function useRegionReveals({ journey, journeyState, onJourneyStateChange, reducedEffects, frontierX }) {
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

  // Queue reveals for reached regions that are still hidden, in road order.
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

  const revealRegion = revealing ? journey.regions.find((r) => r.id === revealing) : null;
  // A saved reveal never clears land the knight has not reached (e.g. after a quit date is moved later).
  const reachedClear = new Set(journey.regions.filter((r) => r.reached && clearIds.has(r.id)).map((r) => r.id));
  return { clearIds: reachedClear, revealing, revealRegion, finishReveal };
}
