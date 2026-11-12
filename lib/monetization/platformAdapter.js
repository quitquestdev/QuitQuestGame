/**
 * The billing adapter for this build.
 *
 * Web build: the "unavailable" adapter (Premium is bought in the mobile apps).
 *
 * Mobile build (Expo): replace this file's body with the RevenueCat adapter,
 * e.g. as platformAdapter.native.js, which Metro picks over this file:
 *
 *   import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
 *   import { Platform } from 'react-native';
 *   import { createRevenueCatAdapter } from './adapters/revenuecat';
 *   import { env } from './env';
 *   export const createPlatformAdapter = () => createRevenueCatAdapter({
 *     Purchases, PURCHASES_ERROR_CODE,
 *     apiKey: Platform.OS === 'ios' ? env.revenueCat.iosKey : env.revenueCat.androidKey,
 *   });
 */
const { createWebAdapter } = require('./adapters/web');

const createPlatformAdapter = () => createWebAdapter();

module.exports = { createPlatformAdapter };
