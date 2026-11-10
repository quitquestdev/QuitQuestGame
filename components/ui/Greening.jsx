'use client';

/**
 * Streak greening: the world visibly regrows as the quit streak grows.
 *
 * Stage 0 (days 0-29) is plain brass; stages 1-3 (from day 30, 90 and 150)
 * swap in panel frames with more moss in the trim and raise a faint moss
 * glow behind the screen. Players can turn it off on the Hero tab.
 */
import React, { createContext, useContext } from 'react';

export const GREENING_STEPS = [30, 90, 150];

export function greeningStage(daysSmokeFree, enabled = true) {
  if (!enabled) return 0;
  return GREENING_STEPS.filter((d) => daysSmokeFree >= d).length;
}

const GreeningContext = createContext({ stage: 0 });

export function GreeningProvider({ stage = 0, children }) {
  return <GreeningContext.Provider value={{ stage }}>{children}</GreeningContext.Provider>;
}

export function useGreening() {
  return useContext(GreeningContext);
}
