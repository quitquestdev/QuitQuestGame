import './globals.css'
// Self-hosted fonts (OFL-1.1). See theme/typography.js for how each is used.
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import '@fontsource/jersey-10/400.css'
import { palette } from '../theme/palette'

import { siteUrl, allowIndexing } from '../lib/site'

const description = 'A pixel-art RPG companion for quitting smoking: battle cravings, follow your recovery milestones and walk a 180-day story.'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Quit Quest: Stop Smoking RPG', template: '%s | Quit Quest' },
  description,
  applicationName: 'Quit Quest',
  // Icons come from app/icon.png and app/apple-icon.png, and the share image
  // from app/opengraph-image.png and app/twitter-image.png (npm run brand).
  openGraph: { type: 'website', siteName: 'Quit Quest', title: 'Quit Quest: Stop Smoking RPG', description },
  twitter: { card: 'summary_large_image', title: 'Quit Quest: Stop Smoking RPG', description },
  // Pre-launch: not indexed until NEXT_PUBLIC_QQ_ALLOW_INDEXING is 'true'.
  robots: allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Quit Quest', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: people must be able to zoom in.
  viewportFit: 'cover',
  themeColor: palette.indigo900,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
