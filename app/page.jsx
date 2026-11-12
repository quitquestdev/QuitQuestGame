'use client'

import QuitQuestRPG from '../components/QuitQuestRPG.jsx'
import { EntitlementProvider } from '../components/premium/EntitlementProvider'
import { AdsProvider } from '../components/ads/AdsProvider'

// The web build has no sign-in, so there is no account ID (userId null).
// The mobile apps pass the Firebase uid, so purchases follow the account.
export default function Home() {
  return (
    <main className="min-h-screen">
      <EntitlementProvider userId={null}>
        <AdsProvider>
          <QuitQuestRPG />
        </AdsProvider>
      </EntitlementProvider>
    </main>
  )
}
