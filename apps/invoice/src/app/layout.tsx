import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from '@876/ui/sonner'
import { ServiceWorkerRegistration } from '@876/ui/service-worker-registration'

import { LinkProvider } from '@/components/providers/link-provider'
import { PwaProvider } from '@/components/providers/pwa-provider'
import { ThemeProvider } from '@876/ui/theme'
import { ThemeScript } from '@876/ui/theme-script'

import './globals.css'

const INVOICE_URL =
  process.env.NEXT_PUBLIC_INVOICE_URL?.trim() || 'http://localhost:3006'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(INVOICE_URL),
  applicationName: '876 Invoice',
  title: { default: '876 Invoice', template: `%s | 876 Invoice` },
  description: 'Invoicing for 876 — powered by shared Billing finance.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '876 Invoice',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/pwa/apple-touch-icon.png',
  },
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
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <LinkProvider>
            <PwaProvider>
              <ServiceWorkerRegistration />
              {children}
            </PwaProvider>
          </LinkProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
