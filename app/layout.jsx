import './globals.css'

export const metadata = {
  title: 'Quit Quest - Stop Smoking RPG',
  description: 'Turn your quit smoking journey into an epic RPG adventure!',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#1e293b',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
