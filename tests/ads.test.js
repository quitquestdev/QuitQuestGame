/**
 * Ad placement and consent-order tests: `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { canInitializeAds, bannerAllowed, interstitialAllowed, BANNER_SCREENS } = require('../lib/ads/policy');
const { createAdMob, adUnits, TEST_UNITS } = require('../lib/ads/admob');

const ok = { platformSupportsAds: true, adsEnabled: true, entitlementsReady: true, isPremium: false, consentStatus: 'obtained' };

test('the SDK never initializes before entitlements and consent are known, or for Premium', () => {
  assert.equal(canInitializeAds(ok).ok, true);
  assert.equal(canInitializeAds({ ...ok, consentStatus: 'not_required' }).ok, true);
  assert.equal(canInitializeAds({ ...ok, entitlementsReady: false }).reason, 'entitlements_unknown');
  assert.equal(canInitializeAds({ ...ok, isPremium: true }).reason, 'premium');
  assert.equal(canInitializeAds({ ...ok, consentStatus: 'unknown' }).reason, 'consent');
  assert.equal(canInitializeAds({ ...ok, consentStatus: 'denied' }).reason, 'consent');
  assert.equal(canInitializeAds({ ...ok, adsEnabled: false }).reason, 'disabled');
  assert.equal(canInitializeAds({ ...ok, platformSupportsAds: false }).reason, 'platform');
});

const shown = { initialized: true, isPremium: false, firstSession: false, inCravingFlow: false };

test('banners only on low-stakes screens', () => {
  for (const screen of BANNER_SCREENS) assert.equal(bannerAllowed({ ...shown, screen }).ok, true, screen);
  for (const screen of ['battle', 'craving', 'onboarding', 'setup', 'premium', 'achievements', 'profile', 'story']) {
    assert.equal(bannerAllowed({ ...shown, screen }).ok, false, screen);
  }
});

test('no banner for Premium, in a craving flow, in the first session, or before the SDK is ready', () => {
  assert.equal(bannerAllowed({ ...shown, screen: 'dashboard', isPremium: true }).reason, 'premium');
  assert.equal(bannerAllowed({ ...shown, screen: 'dashboard', inCravingFlow: true }).reason, 'craving_flow');
  assert.equal(bannerAllowed({ ...shown, screen: 'dashboard', firstSession: true }).reason, 'first_session');
  assert.equal(bannerAllowed({ ...shown, screen: 'dashboard', initialized: false }).reason, 'not_initialized');
});

const pause = { interstitialsEnabled: true, initialized: true, isPremium: false, firstSession: false, moment: 'story_closed', shownThisSession: false, lastBattleResult: 'win', inCravingFlow: false };

test('interstitials are off unless their flag is on', () => {
  assert.equal(interstitialAllowed({ ...pause, interstitialsEnabled: false }).reason, 'flag_off');
  assert.equal(interstitialAllowed(pause).ok, true);
});

test('interstitials: natural pauses only, once per session, never after a loss or in a craving flow', () => {
  assert.equal(interstitialAllowed({ ...pause, moment: 'battle_start' }).reason, 'not_a_natural_pause');
  assert.equal(interstitialAllowed({ ...pause, shownThisSession: true }).reason, 'once_per_session');
  assert.equal(interstitialAllowed({ ...pause, lastBattleResult: 'loss' }).reason, 'after_loss');
  assert.equal(interstitialAllowed({ ...pause, inCravingFlow: true }).reason, 'craving_flow');
  assert.equal(interstitialAllowed({ ...pause, isPremium: true }).reason, 'premium');
  assert.equal(interstitialAllowed({ ...pause, firstSession: true }).reason, 'first_session');
});

test('development builds always use Google test ad units', () => {
  assert.deepEqual(adUnits({ dev: true, platform: 'ios' }), TEST_UNITS.ios);
  assert.deepEqual(adUnits({ dev: true, platform: 'android' }), TEST_UNITS.android);
});

function fakes({ status = 'REQUIRED', afterForm = true, att = 'undetermined', attAnswer = 'granted', umpThrows = false } = {}) {
  const log = [];
  const S = { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED', OBTAINED: 'OBTAINED' };
  const AdsConsent = {
    requestInfoUpdate: async () => {
      log.push('ump.update');
      if (umpThrows) throw new Error('offline');
      return { status: S[status], canRequestAds: status !== 'REQUIRED' };
    },
    loadAndShowConsentFormIfRequired: async () => {
      log.push('ump.form');
      return { canRequestAds: afterForm };
    },
    getConsentInfo: async () => ({ canRequestAds: false }),
  };
  const Tracking = {
    getTrackingPermissionsAsync: async () => ({ status: att }),
    requestTrackingPermissionsAsync: async () => {
      log.push('att.prompt');
      return { status: attAnswer };
    },
  };
  const sdk = {
    setRequestConfiguration: async (c) => log.push(['config', c.maxAdContentRating]),
    initialize: async () => log.push('init'),
  };
  return { log, S, AdsConsent, Tracking, mobileAds: () => sdk };
}

test('consent order: UMP form, then the ATT prompt, and nothing initializes during consent', async () => {
  const f = fakes();
  const ads = createAdMob({ ...f, AdsConsentStatus: f.S, MaxAdContentRating: { G: 'G' }, platform: 'ios', units: TEST_UNITS.ios });
  const c = await ads.gatherConsent();
  assert.deepEqual(f.log, ['ump.update', 'ump.form', 'att.prompt']);
  assert.deepEqual(c, { status: 'obtained', personalized: true });
  assert.equal(ads.isInitialized(), false);
  await ads.initialize();
  assert.deepEqual(f.log.slice(3), [['config', 'G'], 'init']);
});

test('consent declined in the UMP form: no ATT prompt, no ads', async () => {
  const f = fakes({ afterForm: false });
  const ads = createAdMob({ ...f, AdsConsentStatus: f.S, platform: 'ios', units: TEST_UNITS.ios });
  const c = await ads.gatherConsent();
  assert.equal(c.status, 'denied');
  assert.ok(!f.log.includes('att.prompt'));
});

test('ATT declined: ads stay non-personalized', async () => {
  const f = fakes({ status: 'NOT_REQUIRED', attAnswer: 'denied' });
  const ads = createAdMob({ ...f, AdsConsentStatus: f.S, platform: 'ios', units: TEST_UNITS.ios });
  const c = await ads.gatherConsent();
  assert.deepEqual(c, { status: 'not_required', personalized: false });
  assert.deepEqual(ads.requestOptions(), { requestNonPersonalizedAdsOnly: true });
});

test('Android never shows the ATT prompt; UMP failures fall back safely', async () => {
  const f = fakes({ status: 'NOT_REQUIRED' });
  const ads = createAdMob({ ...f, AdsConsentStatus: f.S, platform: 'android', units: TEST_UNITS.android });
  await ads.gatherConsent();
  assert.ok(!f.log.includes('att.prompt'));
  const g = fakes({ umpThrows: true });
  const ads2 = createAdMob({ ...g, AdsConsentStatus: g.S, platform: 'android', units: TEST_UNITS.android });
  assert.deepEqual(await ads2.gatherConsent(), { status: 'unknown', personalized: false });
});

test('battle, Urge Mode and result screens hard-block every ad', () => {
  assert.equal(bannerAllowed({ ...shown, screen: 'dashboard', hardBlocked: true }).reason, 'hard_block');
  assert.equal(bannerAllowed({ ...shown, screen: 'worldMap', hardBlocked: true }).ok, false);
  for (const screen of ['urge', 'battle_result']) assert.equal(bannerAllowed({ ...shown, screen }).ok, false, screen);
  assert.equal(interstitialAllowed({ ...pause, hardBlocked: true }).reason, 'hard_block');
});
