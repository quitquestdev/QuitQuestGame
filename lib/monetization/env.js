/**
 * Monetization settings from environment configuration.
 *
 * Every value is public (they ship inside the app). Even so, none is written
 * in code: they come from the environment so they can differ per build. See
 * `.env.example` for each variable and what it is for.
 *
 * Each value is read under two names: NEXT_PUBLIC_* (the web build) and
 * EXPO_PUBLIC_* (the mobile build). Bundlers only inline variables that are
 * written out literally, so every name appears in full below.
 */
const read = (a, b) => {
  const v = a !== undefined && a !== '' ? a : b;
  return v === undefined ? '' : String(v).trim();
};
const flag = (v, fallback) => (v === '' ? fallback : v === 'true' || v === '1');

const env = {
  revenueCat: {
    iosKey: read(process.env.NEXT_PUBLIC_QQ_REVENUECAT_IOS_KEY, process.env.EXPO_PUBLIC_QQ_REVENUECAT_IOS_KEY),
    androidKey: read(process.env.NEXT_PUBLIC_QQ_REVENUECAT_ANDROID_KEY, process.env.EXPO_PUBLIC_QQ_REVENUECAT_ANDROID_KEY),
  },
  ads: {
    // Ads are on by default in the mobile apps (Premium removes them).
    enabled: flag(read(process.env.NEXT_PUBLIC_QQ_ADS_ENABLED, process.env.EXPO_PUBLIC_QQ_ADS_ENABLED), true),
    // Interstitials are built but stay off unless this is set to true.
    interstitialsEnabled: flag(read(process.env.NEXT_PUBLIC_QQ_INTERSTITIALS_ENABLED, process.env.EXPO_PUBLIC_QQ_INTERSTITIALS_ENABLED), false),
    // Production ad unit IDs. Development builds always use Google's test units.
    units: {
      iosBanner: read(process.env.NEXT_PUBLIC_QQ_ADMOB_IOS_BANNER_ID, process.env.EXPO_PUBLIC_QQ_ADMOB_IOS_BANNER_ID),
      androidBanner: read(process.env.NEXT_PUBLIC_QQ_ADMOB_ANDROID_BANNER_ID, process.env.EXPO_PUBLIC_QQ_ADMOB_ANDROID_BANNER_ID),
      iosInterstitial: read(process.env.NEXT_PUBLIC_QQ_ADMOB_IOS_INTERSTITIAL_ID, process.env.EXPO_PUBLIC_QQ_ADMOB_IOS_INTERSTITIAL_ID),
      androidInterstitial: read(process.env.NEXT_PUBLIC_QQ_ADMOB_ANDROID_INTERSTITIAL_ID, process.env.EXPO_PUBLIC_QQ_ADMOB_ANDROID_INTERSTITIAL_ID),
    },
  },
  legal: {
    privacyPolicyUrl: read(process.env.NEXT_PUBLIC_QQ_PRIVACY_POLICY_URL, process.env.EXPO_PUBLIC_QQ_PRIVACY_POLICY_URL),
    termsUrl: read(process.env.NEXT_PUBLIC_QQ_TERMS_URL, process.env.EXPO_PUBLIC_QQ_TERMS_URL),
  },
  // Developer tools (purchase mock, ad slot outlines). Set at build time by
  // next.config.js and always false in production deployments.
  devTools: process.env.QQ_DEV_TOOLS === 'true',
};

module.exports = { env };
