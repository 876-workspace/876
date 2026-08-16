import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from '@876/ui/sonner'

import { ThemeProvider } from '@/components/providers/providers'

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
