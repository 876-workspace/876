import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { ServiceWorkerRegistration } from '@876/ui/service-worker-registration'
import { Toaster } from '@876/ui/sonner'
import { ThemeProvider } from '@876/ui/theme'
import { ThemeScript } from '@876/ui/theme-script'
import './globals.css'

const PROJECTS_URL =
  process.env.NEXT_PUBLIC_PROJECTS_URL?.trim() || 'http://localhost:3008'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(PROJECTS_URL),
  applicationName: '876 Projects',
  title: { default: '876 Projects', template: '%s | 876 Projects' },
  description: 'Project and issue tracking for 876 organizations.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '876 Projects',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/pwa/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegistration />
        <Toaster />
      </body>
    </html>
  )
}
