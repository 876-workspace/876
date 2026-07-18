import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from '@876/ui/sonner'

import { ThemeProvider } from '@/components/providers/theme-provider'
import { UserStoreProvider } from '@/components/providers/user-store-provider'
import { AnalyticsProvider } from '@/lib/analytics/provider'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import type { SessionUser } from '@/types/auth'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// `??` only falls back on null/undefined — an env var set to an empty string
// (as Railway does for an unset-but-declared variable) slips through and makes
// `new URL('')` throw at render, crashing every route. Trim + `||` so empty or
// whitespace-only values fall back to the local default.
const ORG_URL =
  process.env.NEXT_PUBLIC_ORG_URL?.trim() || 'http://localhost:3001'

export const metadata: Metadata = {
  metadataBase: new URL(ORG_URL),
  title: {
    default: '876',
    template: '%s | 876',
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await getAuthSession()
  const initialUser: SessionUser | null = isSignedSession(session)
    ? (session.user as SessionUser)
    : null

  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AnalyticsProvider user={initialUser}>
          <ThemeProvider>
            <UserStoreProvider initialUser={initialUser}>
              {children}
              <Toaster />
            </UserStoreProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  )
}
