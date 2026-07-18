import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from '@876/ui/sonner'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getFeatures } from '@/lib/features'
import { FocusRevalidate } from '@/components/focus-revalidate'

import { ThemeProvider } from './providers'
import './globals.css'

const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL?.trim() || 'http://localhost:3004'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(BILLING_URL),
  applicationName: '876 Billing',
  title: { default: '876 Billing', template: `%s | 876 Billing` },
  description: 'Subscription and catalogue management for 876 Billing.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  const sessionUser = isSignedSession(session) ? session.user : null
  const userId = sessionUser?.id
  const { uiFeatures } = await getFeatures({ userId })
  const analyticsGroups = sessionUser?.orgId
    ? [
        {
          type: 'organization',
          key: sessionUser.orgId,
          properties: { app_name: 'billing' },
        },
      ]
    : []

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          forcedTheme={uiFeatures.themeSwitcher ? undefined : 'light'}
          analyticsUser={sessionUser}
          analyticsGroups={analyticsGroups}
        >
          <FocusRevalidate />
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
