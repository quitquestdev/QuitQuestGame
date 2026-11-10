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

export const metadata = {
  title: 'Quit Quest - Stop Smoking RPG',
  description: 'Turn your quit smoking journey into an epic RPG adventure!',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: palette.indigo900,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
