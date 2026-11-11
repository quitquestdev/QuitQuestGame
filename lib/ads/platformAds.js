/**
 * The ads integration for this build.
 *
 * Web build: no ads (supported: false). Nothing ad-related is ever loaded.
 *
 * Mobile build (Expo): replace with platformAds.native.js returning
 * createAdMob(...) from ./admob.js, plus the banner component:
 *
 *   import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
 *   export const Banner = ({ unitId, requestOptions }) =>
 *     <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={requestOptions} />;
 */
const createPlatformAds = () => ({ supported: false });

module.exports = { createPlatformAds, Banner: null };
