/**
 * RevenueCat adapter for the iOS and Android apps (react-native-purchases).
 *
 * The SDK is passed in rather than imported, so this file has no native
 * dependency: the web build never loads it, and the unit tests drive it with
 * a fake SDK. In the mobile app:
 *
 *   import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
 *   import { Platform } from 'react-native';
 *   const adapter = createRevenueCatAdapter({
 *     Purchases,
 *     PURCHASES_ERROR_CODE,
 *     apiKey: Platform.OS === 'ios' ? env.revenueCat.iosKey : env.revenueCat.androidKey,
 *   });
 *
 * The RevenueCat app user ID is the Firebase uid (passed to configure), so a
 * purchase follows the account to every device the player signs in on.
 */
const { OFFERING_ID, PURCHASE_ERRORS } = require('../config');

function fail(code, cause) {
  const e = new Error(code);
  e.code = code;
  e.cause = cause;
  return e;
}

/** RevenueCat CustomerInfo -> adapter Info. */
function infoFrom(customerInfo) {
  const active = {};
  const ents = (customerInfo && customerInfo.entitlements && customerInfo.entitlements.active) || {};
  for (const [id, e] of Object.entries(ents)) {
    active[id] = { productId: e.productIdentifier || null, since: e.latestPurchaseDate || e.originalPurchaseDate || null };
  }
  return { active };
}

function createRevenueCatAdapter({ Purchases, PURCHASES_ERROR_CODE = {}, apiKey, offeringId = OFFERING_ID }) {
  const C = PURCHASES_ERROR_CODE;
  let configured = false;
  let signedIn = false;

  /** SDK error -> one of PURCHASE_ERRORS. */
  function mapError(err) {
    if (!err) return fail(PURCHASE_ERRORS.UNKNOWN);
    if (err.userCancelled || err.code === C.PURCHASE_CANCELLED_ERROR) return fail(PURCHASE_ERRORS.CANCELLED, err);
    switch (err.code) {
      case C.PAYMENT_PENDING_ERROR:
        return fail(PURCHASE_ERRORS.PENDING, err);
      case C.NETWORK_ERROR:
      case C.OFFLINE_CONNECTION_ERROR:
        return fail(PURCHASE_ERRORS.NETWORK, err);
      case C.PURCHASE_NOT_ALLOWED_ERROR:
        return fail(PURCHASE_ERRORS.NOT_ALLOWED, err);
      case C.STORE_PROBLEM_ERROR:
      case C.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      case C.CONFIGURATION_ERROR:
        return fail(PURCHASE_ERRORS.STORE_UNAVAILABLE, err);
      default:
        return fail(PURCHASE_ERRORS.UNKNOWN, err);
    }
  }
  const guard = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      throw err && Object.values(PURCHASE_ERRORS).includes(err.code) && err.message === err.code ? err : mapError(err);
    }
  };

  async function currentPackages() {
    const offerings = await Purchases.getOfferings();
    const offering = (offerings && offerings.all && offerings.all[offeringId]) || (offerings && offerings.current);
    return (offering && offering.availablePackages) || [];
  }

  return {
    available: !!apiKey,
    unavailableReason: apiKey ? null : 'not_configured',

    configure: (userId) =>
      guard(async () => {
        if (!apiKey) throw fail(PURCHASE_ERRORS.STORE_UNAVAILABLE);
        if (!configured) {
          Purchases.configure({ apiKey, appUserID: userId || undefined });
          configured = true;
          signedIn = !!userId;
          return;
        }
        if (userId) {
          await Purchases.logIn(userId);
          signedIn = true;
        } else if (signedIn) {
          await Purchases.logOut();
          signedIn = false;
        }
      }),

    getEntitlements: () => guard(async () => infoFrom(await Purchases.getCustomerInfo())),

    getProducts: (ids) =>
      guard(async () => {
        const out = [];
        for (const pkg of await currentPackages()) {
          const p = pkg.product;
          if (p && ids.includes(p.identifier)) out.push({ id: p.identifier, priceString: p.priceString, title: p.title });
        }
        return out;
      }),

    purchase: (productId) =>
      guard(async () => {
        const pkg = (await currentPackages()).find((k) => k.product && k.product.identifier === productId);
        if (!pkg) throw fail(PURCHASE_ERRORS.STORE_UNAVAILABLE);
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return infoFrom(customerInfo);
      }),

    restore: () => guard(async () => infoFrom(await Purchases.restorePurchases())),

    onUpdate(listener) {
      Purchases.addCustomerInfoUpdateListener((info) => listener(infoFrom(info)));
    },
  };
}

module.exports = { createRevenueCatAdapter, infoFrom };
