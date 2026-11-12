/**
 * Products and entitlements: the one place their identifiers live.
 *
 * The app only ever asks about ENTITLEMENTS (what the player has unlocked),
 * never about products (what they bought). A product grants an entitlement,
 * so the same entitlement can come from more than one product.
 *
 * Adding a subscription later:
 *   1. Create the subscription in App Store Connect and Google Play Console.
 *   2. In RevenueCat, attach it to the existing `premium` entitlement and add
 *      it to the offering.
 *   3. Add its identifier to PRODUCTS and PRODUCT_ENTITLEMENTS below (mapped to
 *      ENTITLEMENTS.PREMIUM) and to PAYWALL_PRODUCTS if the paywall should
 *      offer it.
 * No feature screen changes: they all ask `hasEntitlement('premium')`.
 *
 * Plain CommonJS with no imports so the web app, a React Native build and the
 * Node test runner can all share it.
 */

/** Entitlement identifiers. Must match the entitlement IDs in RevenueCat. */
const ENTITLEMENTS = Object.freeze({
  PREMIUM: 'premium',
});

/**
 * Store product identifiers. Use the same identifier in App Store Connect and
 * Google Play Console. Premium is a one-time, non-consumable purchase.
 */
const PRODUCTS = Object.freeze({
  PREMIUM_LIFETIME: 'qq_premium_lifetime',
});

/** Which entitlement each product grants. */
const PRODUCT_ENTITLEMENTS = Object.freeze({
  [PRODUCTS.PREMIUM_LIFETIME]: ENTITLEMENTS.PREMIUM,
});

/** Products the Premium screen offers, in display order. */
const PAYWALL_PRODUCTS = Object.freeze([PRODUCTS.PREMIUM_LIFETIME]);

/** The RevenueCat offering the paywall reads packages from. */
const OFFERING_ID = 'default';

/** Error codes the entitlement layer reports. Never shown to players as-is. */
const PURCHASE_ERRORS = Object.freeze({
  CANCELLED: 'cancelled', // the player backed out: say nothing
  PENDING: 'pending', // waiting on approval (Ask to Buy) or a slow payment method
  NETWORK: 'network',
  STORE_UNAVAILABLE: 'store_unavailable',
  NOT_ALLOWED: 'not_allowed', // purchases disabled on this device
  UNSUPPORTED: 'unsupported', // this platform has no store (the web)
  UNKNOWN: 'unknown',
});

/** Friendly copy for each error. Screens show these, never raw errors. */
const PURCHASE_MESSAGES = Object.freeze({
  cancelled: '',
  pending: 'Your purchase is waiting for approval. Premium unlocks as soon as it goes through.',
  network: "We couldn't reach the store. Check your connection and try again.",
  store_unavailable: "The store isn't available right now. Please try again later.",
  not_allowed: 'Purchases are turned off on this device. You can change this in your device settings.',
  unsupported: 'Premium is purchased in the Quit Quest apps for iOS and Android.',
  unknown: 'Something went wrong. Please try again later. If you were charged, Restore Purchases will unlock Premium.',
});

module.exports = { ENTITLEMENTS, PRODUCTS, PRODUCT_ENTITLEMENTS, PAYWALL_PRODUCTS, OFFERING_ID, PURCHASE_ERRORS, PURCHASE_MESSAGES };
