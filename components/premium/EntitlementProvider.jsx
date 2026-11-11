'use client';

/**
 * <EntitlementProvider userId={...}> and useEntitlements()
 *
 * The only way the app asks what the player has unlocked:
 *
 *   const { isPremium, hasEntitlement } = useEntitlements();
 *   if (hasEntitlement('premium')) ...
 *
 * Screens never talk to RevenueCat, the stores or an adapter. They read this
 * hook, and the Premium screen calls `purchase` and `restore` from it.
 *
 * The provider owns one entitlement store (lib/monetization/entitlements.js).
 * It refreshes on launch and whenever the app returns to the foreground.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createEntitlementStore, storageCache, memoryCache } from '../../lib/monetization/entitlements';
import { ENTITLEMENTS, PAYWALL_PRODUCTS, PURCHASE_MESSAGES } from '../../lib/monetization/config';
import { createPlatformAdapter } from '../../lib/monetization/platformAdapter';

const EntitlementContext = createContext(null);

const DEV_SCENARIO_KEY = 'qq.devMock.scenario';

function safeStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const k = '__qq_probe';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

/**
 * DEV ONLY: the purchase mock, if the developer panel turned it on. The
 * require sits inside a branch the bundler can see is dead when the build
 * flag is 'false', so production bundles do not include the mock.
 */
function devAdapter(storage) {
  if (process.env.QQ_DEV_TOOLS === 'true') {
    const scenario = storage && storage.getItem(DEV_SCENARIO_KEY);
    if (scenario) {
      // eslint-disable-next-line global-require
      const { createDevMockAdapter } = require('../../lib/monetization/adapters/devMock');
      return createDevMockAdapter({ scenario, storage });
    }
  }
  return null;
}

export function EntitlementProvider({ userId = null, children }) {
  const [store] = useState(() => {
    const storage = safeStorage();
    const adapter = devAdapter(storage) || createPlatformAdapter();
    return createEntitlementStore({ adapter, cache: storage ? storageCache(storage) : memoryCache() });
  });
  const [state, setState] = useState(store.getState());

  useEffect(() => store.subscribe(setState), [store]);
  useEffect(() => {
    store.init(userId);
  }, [store, userId]);

  // Refresh when the app comes back to the foreground.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') store.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [store]);

  const hasEntitlement = useCallback((id) => !!state.entitlements[id], [state.entitlements]);
  const value = useMemo(
    () => ({
      ready: state.status === 'ready',
      isPremium: !!state.entitlements[ENTITLEMENTS.PREMIUM],
      hasEntitlement,
      purchasesAvailable: state.available,
      unavailableReason: state.unavailableReason,
      // Localized prices from the store, never hardcoded.
      offers: PAYWALL_PRODUCTS.map((id) => state.products[id]).filter(Boolean),
      pending: state.pending,
      offline: state.offline,
      purchasing: state.purchasing,
      restoring: state.restoring,
      errorMessage: state.lastError ? PURCHASE_MESSAGES[state.lastError] || PURCHASE_MESSAGES.unknown : '',
      purchase: (productId) => store.purchase(productId),
      restore: () => store.restore(),
      refresh: () => store.refresh(),
      reloadOffers: () => store.loadProducts(),
    }),
    [state, hasEntitlement, store],
  );

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

/** What the player has unlocked. Works outside a provider too (everything locked). */
export function useEntitlements() {
  return useContext(EntitlementContext) || LOCKED;
}

const LOCKED = {
  ready: true,
  isPremium: false,
  hasEntitlement: () => false,
  purchasesAvailable: false,
  unavailableReason: 'no_provider',
  offers: [],
  pending: false,
  offline: false,
  purchasing: false,
  restoring: false,
  errorMessage: '',
  purchase: async () => ({ ok: false, code: 'unsupported' }),
  restore: async () => ({ ok: false, code: 'unsupported' }),
  refresh: async () => {},
  reloadOffers: async () => {},
};

/**
 * DEV ONLY helpers for the developer panel. In production builds the flag is
 * inlined as 'false' and only the no-op object below remains.
 */
export const devMockControls =
  process.env.QQ_DEV_TOOLS !== 'true'
    ? { enabled: false, scenario: null, set() {}, resetPurchase() {} }
    : {
        enabled: true,
        get scenario() {
          const s = safeStorage();
          return s ? s.getItem(DEV_SCENARIO_KEY) : null;
        },
        set(scenario) {
          const s = safeStorage();
          if (!s) return;
          if (scenario) s.setItem(DEV_SCENARIO_KEY, scenario);
          else s.removeItem(DEV_SCENARIO_KEY);
        },
        resetPurchase() {
          const s = safeStorage();
          if (!s) return;
          s.removeItem('qq.devMock.owned');
          Object.keys(s).filter((k) => k.startsWith('qq.entitlements.v1')).forEach((k) => s.removeItem(k));
        },
      };
