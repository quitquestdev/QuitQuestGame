# Monetization: Premium, ads and store compliance

Quit Quest is free. The quit tracker, craving battles, the 180-day story, the
world map, health milestones and achievements are never gated. **Premium** is
a single one-time, non-consumable purchase that adds:

- Advanced stats (Records screen)
- Savings projections (Records screen)
- Three knight skins (Hero tab)
- No ads

Purchases happen only through Apple In-App Purchase and Google Play Billing,
managed by RevenueCat. The web build sells nothing: it shows Premium features
as previews with a note that Premium is bought in the mobile apps.

## Architecture

```
screens ──> useEntitlements()  (components/premium/EntitlementProvider.jsx)
                 │
                 ▼
          entitlement store    (lib/monetization/entitlements.js)
           │            │
   device cache     billing adapter (lib/monetization/adapters/)
                     ├─ revenuecat.js   iOS + Android (react-native-purchases)
                     ├─ web.js          web: purchases unavailable
                     └─ devMock.js      DEV ONLY pretend store (stripped from production)

ads ──> AdsProvider / <AdSlot>  (components/ads/AdsProvider.jsx)
         ├─ policy.js   placement rules (pure, tested)
         └─ admob.js    consent (UMP, then ATT) and AdMob SDK (mobile only)
```

Rules the code enforces:

- **One entitlement module.** Screens call `useEntitlements()` and nothing
  else. No screen imports RevenueCat, an adapter or a store SDK.
- **One entitlement:** `premium` (`lib/monetization/config.js`).
- **Product IDs live in one file:** `lib/monetization/config.js`
  (`qq_premium_lifetime`).
- **Offline:** the last known entitlements are cached on the device, so
  Premium works offline and appears instantly on launch. The store refreshes
  them on launch and whenever the app returns to the foreground.
- **Never locked out:** a failed check (offline, store down, SDK error) never
  removes an entitlement. Only a successful answer from the store changes it
  (for example a refund).
- **No raw errors:** every failure becomes a code (`cancelled`, `pending`,
  `network`, `store_unavailable`, `not_allowed`, `unsupported`, `unknown`)
  with friendly copy. Cancelling says nothing; a pending purchase (Ask to Buy)
  unlocks by itself when approved.
- **Account-based:** the RevenueCat app user ID is the Firebase uid
  (`<EntitlementProvider userId={uid}>`), so Premium follows the account.

### The hook

```js
const {
  isPremium,            // boolean
  hasEntitlement,       // (id) => boolean, e.g. hasEntitlement('premium')
  ready,                // entitlements known (cached or fresh)
  purchasesAvailable,   // false on the web
  offers,               // [{ id, priceString, title }] from the store, localized
  purchase, restore,    // async, resolve to { ok, code? }
  pending, offline, purchasing, restoring, errorMessage,
} = useEntitlements();
```

Gate a feature with `<PremiumGate title summary preview onOpenPremium>` from
`components/premium/PremiumFeatures.jsx`: Premium players get the feature,
everyone else a locked preview with sample data.

### Adding a subscription later

1. Create the subscription in App Store Connect and Google Play Console.
2. In RevenueCat, attach it to the existing `premium` entitlement and add it
   to the `default` offering.
3. In `lib/monetization/config.js`, add its ID to `PRODUCTS` and
   `PRODUCT_ENTITLEMENTS` (mapped to `ENTITLEMENTS.PREMIUM`), and to
   `PAYWALL_PRODUCTS` if the Premium screen should offer it.

No feature screen changes: they all ask for the `premium` entitlement.

### Premium story content (hook only)

`lib/premium/story.js` holds `PREMIUM_CHAPTERS` (empty). The Story archive
already lists any side tale for the selected day, locked for free players.
Premium chapters are extras: they never replace or hold back a free chapter.

## Ads

Ads appear only in the mobile apps and never for Premium players.

| Rule | Where it is enforced |
|---|---|
| One banner, only on: dashboard, Records (stats), shop, world map | `BANNER_SCREENS` in `lib/ads/policy.js`; `<AdSlot>` is placed only there |
| Never in a craving battle or craving flow, onboarding, the Premium screen, or the first session | `AD_FREE_SCREENS`, `inCravingFlow`, `firstSession` |
| Interstitials off by default | `NEXT_PUBLIC_QQ_INTERSTITIALS_ENABLED=false` |
| If on: natural pauses only, at most once per session, never after a loss or in a craving flow | `interstitialAllowed()`; the only call site is leaving the Story tab |
| Nothing ad-related loads before consent, or for Premium | `canInitializeAds()`: entitlements known and not Premium, then UMP, then ATT, then SDK init |
| Test ad units in development | `adUnits({ dev: true })` always returns Google's test units |
| Conservative content rating | `maxAdContentRating: G` in `lib/ads/admob.js` |

With developer tools on (local dev and Vercel previews), each banner slot on
the web draws a dashed outline saying whether the mobile app would show a
banner there and why not. Nothing is ever loaded on the web.

### AdMob console settings (manual, best-effort)

Blocking is best-effort, so review ads yourself in the **Ad review center**
before launch and regularly after. In AdMob > Blocking controls, block at
least:

- Sensitive categories: alcohol, gambling and betting, dating, sexual and
  suggestive content, get-rich-quick, weight loss, cosmetic procedures,
  drugs and supplements, references to tobacco (also prohibited by Google
  policy, but block anything adjacent such as vaping).
- General categories that could undermine a quit attempt (energy drinks, bars
  and nightlife), if offered for your account.
- Set the app-level max ad content rating to **G** (matches the code).

## Environment variables

All are public values (they ship in the app) and none is secret, but none is
hardcoded. `.env.example` lists and explains each. The mobile build reads the
same names with `EXPO_PUBLIC_` instead of `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_QQ_REVENUECAT_IOS_KEY` | RevenueCat public SDK key, iOS |
| `NEXT_PUBLIC_QQ_REVENUECAT_ANDROID_KEY` | RevenueCat public SDK key, Android |
| `NEXT_PUBLIC_QQ_ADS_ENABLED` | Banner ads on or off (default on). Premium always removes ads |
| `NEXT_PUBLIC_QQ_INTERSTITIALS_ENABLED` | Interstitials (default off) |
| `NEXT_PUBLIC_QQ_ADMOB_IOS_BANNER_ID`, `..._ANDROID_BANNER_ID` | Production banner units |
| `NEXT_PUBLIC_QQ_ADMOB_IOS_INTERSTITIAL_ID`, `..._ANDROID_INTERSTITIAL_ID` | Production interstitial units |
| `NEXT_PUBLIC_QQ_PRIVACY_POLICY_URL`, `NEXT_PUBLIC_QQ_TERMS_URL` | Settings links (placeholders until hosted) |
| `QQ_DEV_TOOLS` | Build-time only. Forces developer tools on in a local production build. Always off on the production site |

## Testing purchases

### Without a store: the developer mock

On local dev (`npm run dev`) and Vercel preview deployments, the Hero tab has
**Developer tools (not in production builds)**. Pick a purchase-mock scenario:
`locked`, `unlocked`, `pending` (unlocks 4 seconds after "buying", like Ask to
Buy), `failing`, `offline` or `store_unavailable`. "Reset mock purchase" forgets
a mock purchase. The mock is compiled out of production builds: the build flag
is inlined as `'false'` and the bundler drops the module (check: the production
bundle contains no `$4.99 (test)` string).

### Unit tests

`npm test` runs the entitlement, ads and insights tests (Node's built-in test
runner, no extra dependencies): unlocked, locked, offline-cached, pending,
failed, cancelled and restore states; the RevenueCat adapter with a fake SDK;
ad placement rules and consent order.

### Apple (once the Expo app exists)

1. **Local, no network: StoreKit configuration file.** In Xcode (File > New >
   File > StoreKit Configuration File), add a non-consumable product with ID
   `qq_premium_lifetime` and a price. Select it in the scheme (Product > Scheme
   > Edit Scheme > Run > Options > StoreKit Configuration). Run a development
   build from Xcode; purchases, Ask to Buy (pending) and refunds can be
   simulated from Debug > StoreKit > Manage Transactions.
2. **Sandbox.** Create the product in App Store Connect (it must be at least
   "Ready to Submit" with a price), then create testers in App Store Connect >
   Users and Access > Sandbox. On the device, sign in under Settings > App
   Store > Sandbox Account. Sandbox purchases are free.
3. **TestFlight** uses the sandbox too; testers are not charged.

### Google Play (once the Expo app exists)

1. Upload a build to the **internal testing** track (billing only works for an
   app installed from Play, and the product must be **Active**).
2. Add tester Google accounts in Play Console > Settings > **License testing**.
   They can buy with test cards and are never charged.
3. Test pending purchases with the "Slow test card" option.

### RevenueCat

RevenueCat processes sandbox and StoreKit-configuration purchases the same as
real ones. Turn on **Sandbox data** in the dashboard to see them. Products are
matched by identifier, so the sandbox products must use the IDs in
`lib/monetization/config.js`. The `premium` entitlement and `default`
offering must exist in the RevenueCat project.

## The Expo port: what to connect

The web app runs everything above except real purchases and ads. In the Expo
app:

1. Install `react-native-purchases`, `react-native-google-mobile-ads` (with its
   config plugin and your AdMob **app** IDs) and `expo-tracking-transparency`
   (set `NSUserTrackingUsageDescription`; the plugin adds it).
2. Add `lib/monetization/platformAdapter.native.js` and
   `lib/ads/platformAds.native.js` as described in the comments of the web
   versions. Metro picks the `.native.js` files.
3. Pass the Firebase uid: `<EntitlementProvider userId={user?.uid ?? null}>`.
4. Refresh on foreground with `AppState` (the web uses `visibilitychange`).
5. Wire account deletion to `deleteFirebaseAccount()` in
   `lib/account/deleteAccount.js` and keep `USER_DATA_LAYOUT` in step with your
   Firestore structure.
6. Use development builds (EAS `development` profile), not Expo Go: both SDKs
   contain native code.

## Data inventory (for the store privacy forms)

The **web build** sends no personal data anywhere: progress, settings and the
battle log stay in the browser's local storage. There is no analytics SDK in
this codebase. Self-hosted fonts mean no font CDN requests.

The **mobile apps** will add these third parties. Confirm each against its
current documentation when you fill in the forms:

| SDK | Data | Purpose | Linked to user |
|---|---|---|---|
| Firebase Auth | Email address (or provider ID), user ID | Account | Yes |
| Firestore | Quit date, cigarettes per day, pack price, progress, battle log, settings. **Smoking habits are health-related data** | App functionality | Yes |
| RevenueCat | App user ID (Firebase uid), purchase history, device and OS info, IP address | Purchases | Yes |
| Google Mobile Ads (AdMob) | Device advertising ID (IDFA only with ATT permission; AAID on Android), IP address (coarse location), ad interactions, diagnostics | Advertising (non-personalized without consent) | Per Google's disclosures |

Store declarations this requires:

- **Google Play:** "Contains ads: Yes". Data safety form per the table above.
  Health apps declaration (the app supports quitting smoking). Target audience
  adults (18+) is recommended for a smoking-cessation app.
- **Apple:** App Privacy "nutrition label" per the table above, including
  "Identifiers > Device ID" for advertising and tracking if ATT is granted. Age
  rating questionnaire: answer the tobacco question honestly (the app
  references tobacco use; the result is likely 12+ or 17+). Ads content rating
  is set to G in code.
- **Stripe:** an earlier Expo prototype (a separate repository) mentions
  Stripe in its README and env template but has no Stripe code. Nothing here
  uses Stripe, and it must not be used for digital goods in the iOS and
  Android apps: store billing is the only payment path for Premium.
