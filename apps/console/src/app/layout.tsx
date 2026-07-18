import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from '@876/ui/sonner'
import { ThemeProvider } from './providers'
import './globals.css'

const APP_NAME = 'console'
const APP_DESCRIPTION =
  'Operations and management console for the 876 platform.'

// `??` only falls back on null/undefined — an env var set to an empty string
// (as Railway does for an unset-but-declared variable) slips through and makes
// `new URL('')` throw at render, crashing every route. Trim + `||` so empty or
// whitespace-only values fall back to the local default.
const CONSOLE_URL =
  process.env.NEXT_PUBLIC_CONSOLE_URL?.trim() || 'http://localhost:3002'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(CONSOLE_URL),
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_DESCRIPTION,
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
