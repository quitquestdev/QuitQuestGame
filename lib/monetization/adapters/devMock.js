/**
 * DEV ONLY: a pretend store for testing Premium locked and unlocked without
 * real purchases. It is loaded only when the QQ_DEV_TOOLS build flag is
 * 'true' (local development and preview deployments). Production builds set
 * the flag to 'false', so the bundler drops this file entirely.
 *
 * Scenarios (chosen from the developer panel on the Hero tab):
 *   locked             store works; Premium not bought yet; buying succeeds
 *   unlocked           Premium owned
 *   pending            buying ends in "waiting for approval"
 *   failing            every store call fails with a network error
 *   offline            checks fail, as when the device is offline (cache is used)
 *   store_unavailable  the store is down
 */
const { ENTITLEMENTS, PRODUCTS, PURCHASE_ERRORS } = require('../config');

const SCENARIOS = ['locked', 'unlocked', 'pending', 'failing', 'offline', 'store_unavailable'];
const OWNED_KEY = 'qq.devMock.owned';

function createDevMockAdapter({ scenario = 'locked', storage = null, delay = 400 } = {}) {
  const wait = () => new Promise((r) => setTimeout(r, delay));
  const err = (code) => Object.assign(new Error(code), { code });
  const owned = () => scenario === 'unlocked' || (storage && storage.getItem(OWNED_KEY) === 'true');
  const info = () => (owned() ? { active: { [ENTITLEMENTS.PREMIUM]: { productId: PRODUCTS.PREMIUM_LIFETIME, since: null } } } : { active: {} });
  const failure = () => {
    if (scenario === 'failing' || scenario === 'offline') return err(PURCHASE_ERRORS.NETWORK);
    if (scenario === 'store_unavailable') return err(PURCHASE_ERRORS.STORE_UNAVAILABLE);
    return null;
  };
  let listener = null;

  return {
    available: true,
    devMock: true,
    configure: async () => {},
    async getEntitlements() {
      await wait();
      const f = failure();
      if (f) throw f;
      return info();
    },
    async getProducts(ids) {
      await wait();
      if (scenario === 'failing' || scenario === 'store_unavailable') throw failure();
      return ids.map((id) => ({ id, priceString: '$4.99 (test)', title: 'Quit Quest Premium (test)' }));
    },
    async purchase() {
      await wait();
      const f = failure();
      if (f) throw f;
      if (scenario === 'pending') {
        // Approve it a few seconds later, the way Ask to Buy would.
        setTimeout(() => {
          if (storage) storage.setItem(OWNED_KEY, 'true');
          if (listener) listener(info());
        }, 4000);
        throw err(PURCHASE_ERRORS.PENDING);
      }
      if (storage) storage.setItem(OWNED_KEY, 'true');
      return info();
    },
    async restore() {
      await wait();
      const f = failure();
      if (f) throw f;
      return info();
    },
    onUpdate(fn) {
      listener = fn;
    },
  };
}

/** Forget a mock purchase (the developer panel's "reset"). */
const resetDevMock = (storage) => storage && storage.removeItem(OWNED_KEY);

module.exports = { createDevMockAdapter, resetDevMock, SCENARIOS };
