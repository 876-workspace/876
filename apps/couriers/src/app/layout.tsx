import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import type { ReactNode } from 'react'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { ThemeProvider } from './providers'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// `??` only falls back on null/undefined — an env var set to an empty string
// (as Railway does for an unset-but-declared variable) slips through and makes
// `new URL('')` throw at render, crashing every route. Trim + `||` so empty or
// whitespace-only values fall back to the local default.
const COURIERS_URL =
  process.env.NEXT_PUBLIC_COURIERS_URL?.trim() || 'http://localhost:3003'

export const metadata: Metadata = {
  metadataBase: new URL(COURIERS_URL),
  applicationName: '876 Couriers',
  title: { default: '876 Couriers', template: '%s | 876 Couriers' },
  description: 'Courier management powered by 876.',
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '876 Couriers',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/pwa/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f4f82',
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  const sessionUser = isSignedSession(session) ? session.user : null
  const analyticsGroups = sessionUser?.orgId
    ? [
        {
          type: 'organization',
          key: sessionUser.orgId,
          properties: { app_name: 'couriers' },
        },
      ]
    : []

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <Script id="register-serwist" strategy="beforeInteractive">
          {`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' });
window.addEventListener('online', () => window.location.reload());`}
        </Script>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          analyticsUser={sessionUser}
          analyticsGroups={analyticsGroups}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
