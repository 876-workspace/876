import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { Providers } from './providers'
import { SerwistProvider } from './serwist'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { UserStoreProvider } from '@/components/providers/user-store-provider'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import type { UserStoreSourceUser } from '@/stores/user'
import './globals.css'

const APP_NAME = '876'
const APP_DEFAULT_TITLE = '876'
const APP_TITLE_TEMPLATE = '%s | 876'
const APP_DESCRIPTION =
  'A Progressive Web App built with Next.js — fast, secure, and accessible.'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// `??` only falls back on null/undefined — an env var set to an empty string
// (as Railway does for an unset-but-declared variable) slips through and makes
// `new URL('')` throw at render, crashing every route. Trim + `||` so empty or
// whitespace-only values fall back to the local default.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
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
  // WorkOS `User` is structurally the store's `WorkosUser`; the store normalizes it.
  const initialUser: UserStoreSourceUser | null = isSignedSession(session)
    ? (session.user as UserStoreSourceUser)
    : null

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Providers user={initialUser}>
          <ThemeProvider>
            <UserStoreProvider initialUser={initialUser}>
              <SerwistProvider swUrl="/serwist/sw.js">
                {children}
              </SerwistProvider>
            </UserStoreProvider>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
