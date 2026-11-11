# Billing adapters

The entitlement store (`../entitlements.js`) talks to the store only through an
adapter. Only the store imports an adapter, and no screen imports one.

| Adapter | Used on | File |
|---|---|---|
| RevenueCat | iOS and Android apps | `revenuecat.js` |
| Unavailable | Web | `web.js` |
| Mock | Development and preview builds only (never production) | `devMock.js` |

## Interface

```js
{
  available: boolean,              // can this platform buy anything?
  unavailableReason?: string,      // e.g. 'web', when available is false
  configure(userId|null): Promise, // set up the SDK; userId is the account ID
  getEntitlements(): Promise<Info>,
  getProducts(productIds): Promise<[{ id, priceString, title }]>, // localized store prices
  purchase(productId): Promise<Info>,
  restore(): Promise<Info>,
  onUpdate?(listener(Info)): void, // purchases that complete later, refunds
}

Info = { active: { [entitlementId]: { productId, since } }, products?: [productId] }
```

Adapters throw errors whose `code` is one of `PURCHASE_ERRORS` in
`../config.js`: `cancelled`, `pending`, `network`, `store_unavailable`,
`not_allowed`, `unsupported` or `unknown`. Anything else is treated as `unknown`.
