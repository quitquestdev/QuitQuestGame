/**
 * AdMob for the iOS and Android apps: consent first, then (only if allowed)
 * the SDK. Modules are passed in, so this file has no native dependency and
 * the tests drive it with fakes. In the mobile app:
 *
 *   import mobileAds, { AdsConsent, AdsConsentStatus, MaxAdContentRating,
 *     InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
 *   import * as Tracking from 'expo-tracking-transparency';
 *   const ads = createAdMob({ mobileAds, AdsConsent, AdsConsentStatus,
 *     MaxAdContentRating, InterstitialAd, Tracking, platform: Platform.OS,
 *     units: adUnits({ dev: __DEV__, platform: Platform.OS }) });
 *
 * Order, as Google and Apple require:
 *   1. Google's User Messaging Platform (UMP) consent form, shown only where
 *      it is required (EEA, UK, Switzerland and other regulated regions).
 *   2. On iOS, the App Tracking Transparency prompt, only if the system has
 *      not asked yet. Declining still allows non-personalized ads.
 *   3. Only then: request configuration (conservative content rating) and
 *      SDK initialization. The caller also checks canInitializeAds() first,
 *      so a Premium player never initializes the SDK at all.
 */
const { env } = require('../monetization/env');

/** Google's published test ad units. Used in every development build. */
const TEST_UNITS = Object.freeze({
  ios: { banner: 'ca-app-pub-3940256099942544/2934735716', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
  android: { banner: 'ca-app-pub-3940256099942544/6300978111', interstitial: 'ca-app-pub-3940256099942544/1033173712' },
});

/** Ad unit IDs: test units in development, production units from the environment. */
function adUnits({ dev, platform }) {
  if (dev) return TEST_UNITS[platform] || TEST_UNITS.android;
  const u = env.ads.units;
  return platform === 'ios' ? { banner: u.iosBanner, interstitial: u.iosInterstitial } : { banner: u.androidBanner, interstitial: u.androidInterstitial };
}

function createAdMob({ mobileAds, AdsConsent, AdsConsentStatus = {}, MaxAdContentRating = {}, InterstitialAd, Tracking, platform, units }) {
  let initialized = false;
  let personalized = false;

  /**
   * Run the consent flow. Never throws.
   * Returns { status: 'obtained' | 'not_required' | 'denied' | 'unknown', personalized }.
   */
  async function gatherConsent() {
    let status = 'unknown';
    let canRequest = false;
    try {
      const info = await AdsConsent.requestInfoUpdate();
      if (info && info.status === AdsConsentStatus.REQUIRED) {
        const after = await AdsConsent.loadAndShowConsentFormIfRequired();
        canRequest = !!(after && after.canRequestAds);
        status = canRequest ? 'obtained' : 'denied';
      } else {
        canRequest = !!(info && info.canRequestAds);
        status = info && info.status === AdsConsentStatus.NOT_REQUIRED ? 'not_required' : canRequest ? 'obtained' : 'unknown';
      }
    } catch (e) {
      // UMP could not be reached. Fall back to what it remembered, if anything.
      try {
        const info = await AdsConsent.getConsentInfo();
        canRequest = !!(info && info.canRequestAds);
        status = canRequest ? 'obtained' : 'unknown';
      } catch (e2) {
        status = 'unknown';
      }
    }
    if (!canRequest) return { status, personalized: false };

    let tracking = true;
    if (platform === 'ios' && Tracking) {
      try {
        const current = await Tracking.getTrackingPermissionsAsync();
        const result = current.status === 'undetermined' ? await Tracking.requestTrackingPermissionsAsync() : current;
        tracking = result.status === 'granted';
      } catch (e) {
        tracking = false;
      }
    }
    personalized = tracking;
    return { status, personalized };
  }

  /** Initialize the SDK. Call only after canInitializeAds() says yes. */
  async function initialize() {
    if (initialized) return true;
    try {
      await mobileAds().setRequestConfiguration({
        // Conservative: general audiences only.
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await mobileAds().initialize();
      initialized = true;
    } catch (e) {
      initialized = false;
    }
    return initialized;
  }

  /** Options for every ad request. */
  const requestOptions = () => ({ requestNonPersonalizedAdsOnly: !personalized });

  /** Load and show one interstitial. Resolves true if one was shown. */
  function showInterstitial() {
    if (!initialized || !InterstitialAd || !units.interstitial) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        const ad = InterstitialAd.createForAdRequest(units.interstitial, requestOptions());
        const offLoaded = ad.addAdEventListener('loaded', () => {
          offLoaded();
          ad.show().then(() => resolve(true), () => resolve(false));
        });
        const offError = ad.addAdEventListener('error', () => {
          offError();
          resolve(false);
        });
        ad.load();
      } catch (e) {
        resolve(false);
      }
    });
  }

  return {
    supported: true,
    gatherConsent,
    initialize,
    requestOptions,
    showInterstitial,
    units,
    isInitialized: () => initialized,
  };
}

module.exports = { createAdMob, adUnits, TEST_UNITS };
