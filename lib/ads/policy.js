/**
 * Ad placement rules. Pure functions with no SDK, so they are unit tested and
 * shared by every platform. The ads provider asks these before it loads,
 * shows or even initializes anything.
 *
 * Banners: one, only on low-stakes screens (BANNER_SCREENS). Never in a
 * craving battle or craving flow, onboarding, the Premium screen, or the
 * player's first session. Never for Premium players.
 *
 * Hard block: while any battle, Urge Mode or battle result is on screen, the
 * provider sets `hardBlocked` and every request is refused before any other
 * rule is checked.
 *
 * Interstitials: built, but behind their own flag (off by default). When on:
 * only at a natural pause, at most once per session, never after a loss and
 * never during a craving flow.
 */

/** Screens where a single banner may appear. */
const BANNER_SCREENS = Object.freeze(['dashboard', 'stats', 'shop', 'worldMap']);

/** Screens that never show any ad, whatever else is true. */
const AD_FREE_SCREENS = Object.freeze(['battle', 'craving', 'urge', 'battle_result', 'onboarding', 'setup', 'premium']);

/** Moments that count as a natural pause for an interstitial. */
const NATURAL_PAUSES = Object.freeze(['story_closed', 'world_map_closed', 'achievements_closed']);

/** Consent states that allow ad requests (from the consent flow). */
const CONSENT_OK = Object.freeze(['obtained', 'not_required']);

/**
 * May the ads SDK be initialized at all? Nothing ad-related loads until
 * consent is handled AND the player is confirmed not Premium.
 */
function canInitializeAds({ platformSupportsAds, adsEnabled, entitlementsReady, isPremium, consentStatus }) {
  if (!platformSupportsAds) return { ok: false, reason: 'platform' };
  if (!adsEnabled) return { ok: false, reason: 'disabled' };
  if (!entitlementsReady) return { ok: false, reason: 'entitlements_unknown' };
  if (isPremium) return { ok: false, reason: 'premium' };
  if (!CONSENT_OK.includes(consentStatus)) return { ok: false, reason: 'consent' };
  return { ok: true };
}

function bannerAllowed({ screen, initialized, isPremium, firstSession, inCravingFlow, hardBlocked = false }) {
  if (hardBlocked) return { ok: false, reason: 'hard_block' };
  if (isPremium) return { ok: false, reason: 'premium' };
  if (AD_FREE_SCREENS.includes(screen)) return { ok: false, reason: 'ad_free_screen' };
  if (!BANNER_SCREENS.includes(screen)) return { ok: false, reason: 'not_a_banner_screen' };
  if (inCravingFlow) return { ok: false, reason: 'craving_flow' };
  if (firstSession) return { ok: false, reason: 'first_session' };
  if (!initialized) return { ok: false, reason: 'not_initialized' };
  return { ok: true };
}

function interstitialAllowed({ interstitialsEnabled, initialized, isPremium, firstSession, moment, shownThisSession, lastBattleResult, inCravingFlow, hardBlocked = false }) {
  if (hardBlocked) return { ok: false, reason: 'hard_block' };
  if (!interstitialsEnabled) return { ok: false, reason: 'flag_off' };
  if (isPremium) return { ok: false, reason: 'premium' };
  if (firstSession) return { ok: false, reason: 'first_session' };
  if (inCravingFlow) return { ok: false, reason: 'craving_flow' };
  if (!NATURAL_PAUSES.includes(moment)) return { ok: false, reason: 'not_a_natural_pause' };
  if (lastBattleResult === 'loss') return { ok: false, reason: 'after_loss' };
  if (shownThisSession) return { ok: false, reason: 'once_per_session' };
  if (!initialized) return { ok: false, reason: 'not_initialized' };
  return { ok: true };
}

module.exports = { BANNER_SCREENS, AD_FREE_SCREENS, NATURAL_PAUSES, CONSENT_OK, canInitializeAds, bannerAllowed, interstitialAllowed };
