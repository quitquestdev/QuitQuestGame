'use client';

/**
 * <AdsProvider> and <AdSlot screen="dashboard" />
 *
 * Ads follow lib/ads/policy.js. In order:
 *   1. Wait until entitlements are known. A Premium player never gets past
 *      this step: no consent form, no SDK, no ads.
 *   2. Run the consent flow (UMP, then ATT on iOS).
 *   3. Initialize the SDK only if consent allows it.
 * Screens place <AdSlot> where a banner may go; the slot decides.
 *
 * On the web there are no ads. With developer tools on, each slot draws an
 * outline saying whether the mobile app would show a banner there and why.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useEntitlements } from '../premium/EntitlementProvider';
import { canInitializeAds, bannerAllowed, interstitialAllowed } from '../../lib/ads/policy';
import { createPlatformAds, Banner } from '../../lib/ads/platformAds';
import { env } from '../../lib/monetization/env';

const AdsContext = createContext(null);
const SESSIONS_KEY = 'qq.sessions';

/** Count launches; the first session never sees an ad. */
function countSession() {
  try {
    const n = Number(window.localStorage.getItem(SESSIONS_KEY) || 0) + 1;
    window.localStorage.setItem(SESSIONS_KEY, String(n));
    return n;
  } catch (e) {
    return 1; // unknown: count it as a first session (no ads)
  }
}

export function AdsProvider({ children }) {
  const { ready, isPremium } = useEntitlements();
  const [platform] = useState(() => createPlatformAds());
  const [sessionNumber] = useState(() => (typeof window === 'undefined' ? 1 : countSession()));
  const [consent, setConsent] = useState({ status: 'unknown', personalized: false });
  const [initialized, setInitialized] = useState(false);
  const interstitialShown = useRef(false);
  // Hard block: set by the game while a battle, Urge Mode or result is showing.
  const [hardBlocked, setHardBlock] = useState(false);
  const consentAsked = useRef(false);

  // Steps 1 and 2: consent, only for players confirmed not Premium.
  useEffect(() => {
    if (!platform.supported || !env.ads.enabled || !ready || isPremium || consentAsked.current) return;
    consentAsked.current = true;
    platform.gatherConsent().then(setConsent);
  }, [platform, ready, isPremium]);

  // Step 3: the SDK, only when everything allows it.
  useEffect(() => {
    const gate = canInitializeAds({
      platformSupportsAds: platform.supported,
      adsEnabled: env.ads.enabled,
      entitlementsReady: ready,
      isPremium,
      consentStatus: consent.status,
    });
    if (gate.ok && !initialized) platform.initialize().then(setInitialized);
  }, [platform, ready, isPremium, consent.status, initialized]);

  const firstSession = sessionNumber <= 1;

  const banner = useCallback(
    (screen, { inCravingFlow = false } = {}) => bannerAllowed({ screen, initialized, isPremium, firstSession, inCravingFlow, hardBlocked }),
    [initialized, isPremium, firstSession, hardBlocked],
  );

  /** Call at a natural pause. Shows at most one interstitial per session, and only if the flag is on. */
  const maybeInterstitial = useCallback(
    async (moment, { inCravingFlow = false, lastBattleResult = null } = {}) => {
      const rule = interstitialAllowed({
        interstitialsEnabled: env.ads.interstitialsEnabled,
        initialized,
        isPremium,
        firstSession,
        moment,
        shownThisSession: interstitialShown.current,
        lastBattleResult,
        inCravingFlow,
        hardBlocked,
      });
      if (!rule.ok) return false;
      interstitialShown.current = true;
      return platform.showInterstitial();
    },
    [initialized, isPremium, firstSession, platform, hardBlocked],
  );

  const value = useMemo(
    () => ({ supported: platform.supported, initialized, consent, firstSession, isPremium, banner, maybeInterstitial, platform, hardBlocked, setHardBlock }),
    [platform, initialized, consent, firstSession, isPremium, banner, maybeInterstitial, hardBlocked],
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export const useAds = () => useContext(AdsContext);

/** Where a banner may appear. Renders nothing unless every rule allows it. */
export function AdSlot({ screen, inCravingFlow = false }) {
  const ads = useAds();
  if (!ads) return null;
  const rule = ads.banner(screen, { inCravingFlow });
  if (ads.supported) {
    if (!rule.ok || !Banner) return null;
    return (
      <div className="flex justify-center" aria-label="Advertisement">
        <Banner unitId={ads.platform.units.banner} requestOptions={ads.platform.requestOptions()} />
      </div>
    );
  }
  // Web: no ads. Developer tools draw what the mobile app would do here.
  if (process.env.QQ_DEV_TOOLS === 'true') {
    const asMobile = bannerAllowed({ screen, initialized: true, isPremium: ads.isPremium, firstSession: ads.firstSession, inCravingFlow, hardBlocked: ads.hardBlocked });
    return (
      <div className="qq-ad-outline" data-ad-slot={screen} data-would-show={asMobile.ok ? 'yes' : 'no'}>
        DEV: banner slot ({screen}): {asMobile.ok ? 'the mobile app would show a banner here' : `hidden (${asMobile.reason.replace(/_/g, ' ')})`}
      </div>
    );
  }
  return null;
}
