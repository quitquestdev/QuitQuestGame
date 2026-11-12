/**
 * The web build has no store: Premium is bought in the iOS and Android apps.
 * This adapter reports that, so the Premium screen shows a short note instead
 * of a purchase button, and nothing breaks.
 */
const { PURCHASE_ERRORS } = require('../config');

const unsupported = () => {
  const e = new Error('Purchases are not available on the web');
  e.code = PURCHASE_ERRORS.UNSUPPORTED;
  return Promise.reject(e);
};

function createWebAdapter() {
  return {
    available: false,
    unavailableReason: 'web',
    configure: async () => {},
    getEntitlements: async () => ({ active: {} }),
    getProducts: async () => [],
    purchase: unsupported,
    restore: unsupported,
  };
}

module.exports = { createWebAdapter };
