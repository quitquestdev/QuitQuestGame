/**
 * Entitlement module tests: `npm test` (Node's built-in test runner).
 * Covers unlocked, locked, offline-cached, pending and failed states, plus the
 * RevenueCat adapter's mapping (driven by a fake SDK).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEntitlementStore, memoryCache, normalise } = require('../lib/monetization/entitlements');
const { createRevenueCatAdapter } = require('../lib/monetization/adapters/revenuecat');
const { createWebAdapter } = require('../lib/monetization/adapters/web');
const { ENTITLEMENTS, PRODUCTS, PURCHASE_ERRORS } = require('../lib/monetization/config');

const PREMIUM = { active: { premium: { productId: PRODUCTS.PREMIUM_LIFETIME, since: '2027-04-01' } } };
const NONE = { active: {} };
const err = (code) => Object.assign(new Error(code), { code });

/** A scriptable adapter: each method returns or throws what the test says. */
function fakeAdapter(script = {}) {
  let listener = null;
  const call = async (name, ...args) => {
    const v = script[name];
    if (typeof v === 'function') return v(...args);
    if (v instanceof Error) throw v;
    return v;
  };
  return {
    available: script.available !== false,
    configure: (id) => call('configure', id),
    getEntitlements: () => call('getEntitlements'),
    getProducts: (ids) => call('getProducts', ids),
    purchase: (id) => call('purchase', id),
    restore: () => call('restore'),
    onUpdate: (fn) => (listener = fn),
    emit: (info) => listener && listener(info),
    script,
  };
}

const products = [{ id: PRODUCTS.PREMIUM_LIFETIME, priceString: '€5,49', title: 'Premium' }];

test('locked: a player without a purchase has no Premium', async () => {
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: NONE, getProducts: products }), cache: memoryCache() });
  await store.init('uid-1');
  assert.equal(store.isPremium(), false);
  assert.equal(store.hasEntitlement(ENTITLEMENTS.PREMIUM), false);
  assert.equal(store.getState().status, 'ready');
});

test('unlocked: the store reports Premium, and it is cached for next launch', async () => {
  const cache = memoryCache();
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: PREMIUM, getProducts: products }), cache });
  await store.init('uid-1');
  assert.equal(store.isPremium(), true);
  assert.equal(store.getState().entitlements.premium.source, 'store');
  assert.deepEqual(Object.keys(cache.load('user:uid-1').entitlements), ['premium']);
});

test('prices come from the store, localized, never from the app', async () => {
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: NONE, getProducts: products }), cache: memoryCache() });
  await store.init('uid-1');
  assert.equal(store.getState().products[PRODUCTS.PREMIUM_LIFETIME].priceString, '€5,49');
});

test('offline-cached: Premium from the cache survives a failed check', async () => {
  const cache = memoryCache();
  cache.save('user:uid-1', { entitlements: { premium: { productId: PRODUCTS.PREMIUM_LIFETIME } } });
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: err(PURCHASE_ERRORS.NETWORK), getProducts: err(PURCHASE_ERRORS.NETWORK) }), cache });
  await store.init('uid-1');
  assert.equal(store.isPremium(), true);
  assert.equal(store.getState().offline, true);
  assert.equal(store.getState().entitlements.premium.source, 'cache');
  assert.deepEqual(store.getState().products, {});
});

test('a failed refresh never locks out a paying player', async () => {
  const adapter = fakeAdapter({ getEntitlements: PREMIUM, getProducts: products });
  const store = createEntitlementStore({ adapter, cache: memoryCache() });
  await store.init('uid-1');
  adapter.script.getEntitlements = err(PURCHASE_ERRORS.STORE_UNAVAILABLE);
  const r = await store.refresh();
  assert.equal(r.ok, false);
  assert.equal(store.isPremium(), true);
  adapter.script.getEntitlements = new Error('something strange');
  await store.refresh();
  assert.equal(store.isPremium(), true);
  assert.equal(store.getState().lastError, PURCHASE_ERRORS.UNKNOWN);
});

test('a successful answer from the store is authoritative (e.g. a refund)', async () => {
  const adapter = fakeAdapter({ getEntitlements: PREMIUM, getProducts: products });
  const store = createEntitlementStore({ adapter, cache: memoryCache() });
  await store.init('uid-1');
  adapter.emit(NONE);
  await new Promise((r) => setImmediate(r));
  assert.equal(store.isPremium(), false);
});

test('purchase: success unlocks at once, without a restart', async () => {
  const adapter = fakeAdapter({ getEntitlements: NONE, getProducts: products, purchase: PREMIUM });
  const store = createEntitlementStore({ adapter, cache: memoryCache() });
  await store.init('uid-1');
  const seen = [];
  store.subscribe((s) => seen.push(!!s.entitlements.premium));
  const r = await store.purchase(PRODUCTS.PREMIUM_LIFETIME);
  assert.deepEqual(r, { ok: true });
  assert.equal(store.isPremium(), true);
  assert.ok(seen.includes(true));
});

test('pending: the purchase waits for approval, then unlocks when it clears', async () => {
  const cache = memoryCache();
  const adapter = fakeAdapter({ getEntitlements: NONE, getProducts: products, purchase: err(PURCHASE_ERRORS.PENDING) });
  const store = createEntitlementStore({ adapter, cache });
  await store.init('uid-1');
  const r = await store.purchase(PRODUCTS.PREMIUM_LIFETIME);
  assert.equal(r.code, PURCHASE_ERRORS.PENDING);
  assert.equal(store.isPremium(), false);
  assert.equal(store.getState().pending, true);
  assert.equal(cache.load('user:uid-1').pending, true, 'pending is remembered across launches');
  adapter.emit(PREMIUM); // approved later
  await new Promise((r2) => setImmediate(r2));
  assert.equal(store.isPremium(), true);
  assert.equal(store.getState().pending, false);
});

test('cancelled purchases are silent', async () => {
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: NONE, getProducts: products, purchase: err(PURCHASE_ERRORS.CANCELLED) }), cache: memoryCache() });
  await store.init('uid-1');
  const r = await store.purchase(PRODUCTS.PREMIUM_LIFETIME);
  assert.equal(r.code, PURCHASE_ERRORS.CANCELLED);
  assert.equal(store.getState().lastError, null);
  assert.equal(store.getState().purchasing, false);
});

test('failed purchases report a code, never a raw error', async () => {
  const store = createEntitlementStore({ adapter: fakeAdapter({ getEntitlements: NONE, getProducts: products, purchase: new TypeError('x is undefined') }), cache: memoryCache() });
  await store.init('uid-1');
  const r = await store.purchase(PRODUCTS.PREMIUM_LIFETIME);
  assert.deepEqual(r, { ok: false, code: PURCHASE_ERRORS.UNKNOWN });
  assert.equal(store.getState().lastError, PURCHASE_ERRORS.UNKNOWN);
});

test('restore: finds an earlier purchase, or reports nothing to restore', async () => {
  const adapter = fakeAdapter({ getEntitlements: NONE, getProducts: products, restore: PREMIUM });
  const store = createEntitlementStore({ adapter, cache: memoryCache() });
  await store.init('uid-1');
  assert.deepEqual(await store.restore(), { ok: true, restored: true });
  adapter.script.restore = NONE;
  assert.deepEqual(await store.restore(), { ok: true, restored: false });
  adapter.script.restore = err(PURCHASE_ERRORS.NETWORK);
  const r = await store.restore();
  assert.equal(r.code, PURCHASE_ERRORS.NETWORK);
});

test('a failed SDK setup leaves cached Premium in place', async () => {
  const cache = memoryCache();
  cache.save('user:uid-1', { entitlements: { premium: { productId: PRODUCTS.PREMIUM_LIFETIME } } });
  const store = createEntitlementStore({ adapter: fakeAdapter({ configure: err(PURCHASE_ERRORS.STORE_UNAVAILABLE) }), cache });
  await store.init('uid-1');
  assert.equal(store.isPremium(), true);
});

test('entitlements are per account: another user on the device does not inherit them', async () => {
  const cache = memoryCache();
  const adapter = fakeAdapter({ getEntitlements: PREMIUM, getProducts: products });
  const store = createEntitlementStore({ adapter, cache });
  await store.init('uid-1');
  adapter.script.getEntitlements = err(PURCHASE_ERRORS.NETWORK);
  await store.init('uid-2');
  assert.equal(store.isPremium(), false);
});

test('web: purchases are unavailable and nothing breaks', async () => {
  const store = createEntitlementStore({ adapter: createWebAdapter(), cache: memoryCache() });
  await store.init(null);
  assert.equal(store.isPremium(), false);
  assert.equal(store.getState().available, false);
  assert.equal(store.getState().unavailableReason, 'web');
  assert.equal((await store.purchase(PRODUCTS.PREMIUM_LIFETIME)).code, PURCHASE_ERRORS.UNSUPPORTED);
  assert.equal((await store.restore()).code, PURCHASE_ERRORS.UNSUPPORTED);
});

test('products map to entitlements through the config (room for a subscription)', () => {
  assert.deepEqual(Object.keys(normalise({ products: [PRODUCTS.PREMIUM_LIFETIME] })), ['premium']);
  assert.deepEqual(normalise({ products: ['some_unknown_product'] }), {});
});

// ---------------------------------------------------------------- RevenueCat adapter

function fakePurchases() {
  const calls = [];
  const C = { PURCHASE_CANCELLED_ERROR: '1', PAYMENT_PENDING_ERROR: '20', NETWORK_ERROR: '10', STORE_PROBLEM_ERROR: '2', PURCHASE_NOT_ALLOWED_ERROR: '3', OFFLINE_CONNECTION_ERROR: '35' };
  const pkg = { identifier: '$rc_lifetime', product: { identifier: PRODUCTS.PREMIUM_LIFETIME, priceString: '£4.99', title: 'Premium' } };
  const customer = (active) => ({ entitlements: { active: active ? { premium: { productIdentifier: PRODUCTS.PREMIUM_LIFETIME, latestPurchaseDate: '2027-04-02' } } : {} } });
  const P = {
    owned: false,
    purchaseError: null,
    configure: (o) => calls.push(['configure', o]),
    logIn: async (id) => calls.push(['logIn', id]),
    logOut: async () => calls.push(['logOut']),
    getCustomerInfo: async () => customer(P.owned),
    getOfferings: async () => ({ current: { availablePackages: [pkg] }, all: { default: { availablePackages: [pkg] } } }),
    purchasePackage: async (p) => {
      calls.push(['purchasePackage', p.identifier]);
      if (P.purchaseError) throw P.purchaseError;
      P.owned = true;
      return { customerInfo: customer(true) };
    },
    restorePurchases: async () => customer(P.owned),
    addCustomerInfoUpdateListener: () => {},
  };
  return { P, C, calls };
}

test('RevenueCat: the app user ID is the account ID, and switching accounts logs in', async () => {
  const { P, C, calls } = fakePurchases();
  const store = createEntitlementStore({ adapter: createRevenueCatAdapter({ Purchases: P, PURCHASES_ERROR_CODE: C, apiKey: 'appl_test' }), cache: memoryCache() });
  await store.init('firebase-uid-1');
  assert.deepEqual(calls[0], ['configure', { apiKey: 'appl_test', appUserID: 'firebase-uid-1' }]);
  await store.init('firebase-uid-2');
  assert.deepEqual(calls.find((c) => c[0] === 'logIn'), ['logIn', 'firebase-uid-2']);
});

test('RevenueCat: price, purchase and entitlement mapping', async () => {
  const { P, C } = fakePurchases();
  const store = createEntitlementStore({ adapter: createRevenueCatAdapter({ Purchases: P, PURCHASES_ERROR_CODE: C, apiKey: 'goog_test' }), cache: memoryCache() });
  await store.init('uid');
  assert.equal(store.getState().products[PRODUCTS.PREMIUM_LIFETIME].priceString, '£4.99');
  assert.equal(store.isPremium(), false);
  assert.deepEqual(await store.purchase(PRODUCTS.PREMIUM_LIFETIME), { ok: true });
  assert.equal(store.isPremium(), true);
});

test('RevenueCat: SDK errors become friendly codes', async () => {
  const cases = [
    [{ userCancelled: true }, PURCHASE_ERRORS.CANCELLED],
    [{ code: '20' }, PURCHASE_ERRORS.PENDING],
    [{ code: '10' }, PURCHASE_ERRORS.NETWORK],
    [{ code: '35' }, PURCHASE_ERRORS.NETWORK],
    [{ code: '3' }, PURCHASE_ERRORS.NOT_ALLOWED],
    [{ code: '2' }, PURCHASE_ERRORS.STORE_UNAVAILABLE],
    [{ code: '999' }, PURCHASE_ERRORS.UNKNOWN],
  ];
  for (const [sdkError, expected] of cases) {
    const { P, C } = fakePurchases();
    P.purchaseError = Object.assign(new Error('sdk'), sdkError);
    const store = createEntitlementStore({ adapter: createRevenueCatAdapter({ Purchases: P, PURCHASES_ERROR_CODE: C, apiKey: 'k' }), cache: memoryCache() });
    await store.init('uid');
    const r = await store.purchase(PRODUCTS.PREMIUM_LIFETIME);
    assert.equal(r.code, expected, JSON.stringify(sdkError));
  }
});

test('RevenueCat: a missing API key means purchases are unavailable, not a crash', async () => {
  const { P, C } = fakePurchases();
  const store = createEntitlementStore({ adapter: createRevenueCatAdapter({ Purchases: P, PURCHASES_ERROR_CODE: C, apiKey: '' }), cache: memoryCache() });
  await store.init('uid');
  assert.equal(store.getState().available, false);
  assert.equal(store.isPremium(), false);
});
