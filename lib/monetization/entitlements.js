/**
 * The entitlement store: the single source of truth for what the player has
 * unlocked. Screens never call this directly; they use the React provider
 * (components/premium/EntitlementProvider.jsx), which wraps one store.
 *
 * The store talks to a billing ADAPTER (RevenueCat on iOS and Android, an
 * "unavailable" adapter on the web, a mock in development). Adapters share
 * one small interface, documented in ./adapters/README.md.
 *
 * Rules it keeps:
 * - The last known entitlements are cached on the device, so Premium works
 *   offline and appears instantly on launch.
 * - A failed check (offline, store down) never removes an entitlement. Only
 *   a successful answer from the store can change it.
 * - Errors become codes from config.PURCHASE_ERRORS; raw errors never leave
 *   this module.
 *
 * Plain CommonJS, no React, so it runs in the Node test runner.
 */
const { ENTITLEMENTS, PAYWALL_PRODUCTS, PRODUCT_ENTITLEMENTS, PURCHASE_ERRORS } = require('./config');

const KNOWN_CODES = new Set(Object.values(PURCHASE_ERRORS));
const codeOf = (err) => (err && KNOWN_CODES.has(err.code) ? err.code : PURCHASE_ERRORS.UNKNOWN);

/** Shape the adapter's answer into { [entitlementId]: { productId, since } }. */
function normalise(info) {
  const out = {};
  const active = (info && info.active) || {};
  for (const [id, e] of Object.entries(active)) {
    if (e) out[id] = { productId: e.productId || null, since: e.since || null };
  }
  // An adapter may report only products; map them through the config.
  for (const productId of (info && info.products) || []) {
    const id = PRODUCT_ENTITLEMENTS[productId];
    if (id && !out[id]) out[id] = { productId, since: null };
  }
  return out;
}

/**
 * createEntitlementStore({ adapter, cache, now })
 *   adapter  billing adapter (see ./adapters)
 *   cache    { load(userKey) -> data|null, save(userKey, data) } (sync or async)
 *   now      clock, for tests
 */
function createEntitlementStore({ adapter, cache, now = () => Date.now() }) {
  let state = {
    status: 'idle', // 'idle' | 'loading' | 'ready'
    userKey: null,
    entitlements: {}, // { premium: { productId, since, source: 'store' | 'cache' } }
    products: {}, // { [productId]: { id, priceString, title } } (from the store, localized)
    available: !!adapter.available,
    unavailableReason: adapter.available ? null : adapter.unavailableReason || 'unsupported',
    offline: false, // the last check failed; showing cached entitlements
    pending: false, // a purchase is waiting for approval
    purchasing: false,
    restoring: false,
    lastCheckedAt: null,
    lastError: null, // a PURCHASE_ERRORS code, or null
  };
  const listeners = new Set();
  let subscribed = false;
  const set = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l(state));
  };

  const keyFor = (userId) => (userId ? `user:${userId}` : 'anonymous');

  async function persist() {
    try {
      const data = { entitlements: {}, pending: state.pending, checkedAt: state.lastCheckedAt };
      for (const [id, e] of Object.entries(state.entitlements)) data.entitlements[id] = { productId: e.productId, since: e.since };
      await cache.save(state.userKey, data);
    } catch (e) {
      // A full or unavailable cache only costs offline support.
    }
  }

  /** Take a successful answer from the store. */
  async function apply(info) {
    const fresh = normalise(info);
    const entitlements = {};
    for (const [id, e] of Object.entries(fresh)) entitlements[id] = { ...e, source: 'store' };
    const pending = state.pending && !entitlements[ENTITLEMENTS.PREMIUM];
    set({ entitlements, offline: false, pending, lastCheckedAt: now(), lastError: null, status: 'ready' });
    await persist();
  }

  async function loadCache(userKey) {
    try {
      const data = await cache.load(userKey);
      if (!data) return {};
      const out = {};
      for (const [id, e] of Object.entries(data.entitlements || {})) out[id] = { ...e, source: 'cache' };
      if (data.pending) set({ pending: true });
      return out;
    } catch (e) {
      return {};
    }
  }

  /** Ask the store what is unlocked. Failures keep what we already know. */
  async function refresh() {
    try {
      const info = await adapter.getEntitlements();
      await apply(info);
      return { ok: true };
    } catch (err) {
      set({ offline: true, lastError: codeOf(err), status: 'ready' });
      return { ok: false, code: codeOf(err) };
    }
  }

  async function loadProducts() {
    try {
      const list = await adapter.getProducts(PAYWALL_PRODUCTS);
      const products = {};
      for (const p of list || []) if (p && p.id && p.priceString) products[p.id] = { id: p.id, priceString: p.priceString, title: p.title || '' };
      set({ products });
    } catch (err) {
      set({ products: {} }); // the paywall shows "price unavailable" and disables buying
    }
  }

  /**
   * Start (or switch user). Cached entitlements apply at once, then the store
   * is asked. `userId` is the signed-in account ID (Firebase uid in the
   * mobile apps), so purchases follow the account across devices.
   */
  async function init(userId = null) {
    const userKey = keyFor(userId);
    set({ status: 'loading', userKey, entitlements: {}, pending: false, offline: false });
    const cached = await loadCache(userKey);
    if (Object.keys(cached).length) set({ entitlements: cached, status: 'ready' });
    try {
      await adapter.configure(userId);
    } catch (err) {
      set({ offline: true, lastError: codeOf(err), status: 'ready' });
      return;
    }
    if (adapter.onUpdate && !subscribed) {
      subscribed = true;
      // Purchases that finish later (approved Ask to Buy, a refund) arrive here.
      adapter.onUpdate((info) => {
        apply(info);
      });
    }
    await refresh();
    if (state.available) await loadProducts();
  }

  async function purchase(productId) {
    if (!state.available) return { ok: false, code: PURCHASE_ERRORS.UNSUPPORTED };
    if (state.purchasing) return { ok: false, code: PURCHASE_ERRORS.UNKNOWN };
    set({ purchasing: true, lastError: null });
    try {
      const info = await adapter.purchase(productId);
      await apply(info);
      const id = PRODUCT_ENTITLEMENTS[productId];
      return { ok: !!state.entitlements[id] };
    } catch (err) {
      const code = codeOf(err);
      if (code === PURCHASE_ERRORS.PENDING) {
        set({ pending: true });
        await persist();
      }
      set({ lastError: code === PURCHASE_ERRORS.CANCELLED ? null : code });
      return { ok: false, code };
    } finally {
      set({ purchasing: false });
    }
  }

  /** Restore purchases (Apple requires a button for this). */
  async function restore() {
    if (!state.available) return { ok: false, code: PURCHASE_ERRORS.UNSUPPORTED };
    set({ restoring: true, lastError: null });
    try {
      const info = await adapter.restore();
      await apply(info);
      return { ok: true, restored: !!state.entitlements[ENTITLEMENTS.PREMIUM] };
    } catch (err) {
      set({ lastError: codeOf(err) });
      return { ok: false, code: codeOf(err) };
    } finally {
      set({ restoring: false });
    }
  }

  return {
    init,
    refresh,
    purchase,
    restore,
    loadProducts,
    getState: () => state,
    hasEntitlement: (id) => !!state.entitlements[id],
    isPremium: () => !!state.entitlements[ENTITLEMENTS.PREMIUM],
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Cache in any key-value storage with getItem/setItem (localStorage, AsyncStorage). */
function storageCache(storage, prefix = 'qq.entitlements.v1') {
  return {
    async load(userKey) {
      const raw = await storage.getItem(`${prefix}:${userKey}`);
      return raw ? JSON.parse(raw) : null;
    },
    async save(userKey, data) {
      await storage.setItem(`${prefix}:${userKey}`, JSON.stringify(data));
    },
  };
}

/** A cache that keeps nothing (tests, or storage unavailable). */
const memoryCache = () => {
  const m = new Map();
  return { load: (k) => m.get(k) || null, save: (k, d) => void m.set(k, JSON.parse(JSON.stringify(d))) };
};

module.exports = { createEntitlementStore, storageCache, memoryCache, normalise };
