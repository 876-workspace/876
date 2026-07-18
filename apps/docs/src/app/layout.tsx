import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { LangProvider } from '@/components/lang-context'
import { AnalyticsProvider } from '@/lib/analytics/provider'
import './global.css'

export const metadata: Metadata = {
  title: {
    default: '876 SDK Documentation',
    template: '%s · 876 SDK',
  },
  description:
    'Official documentation for the 876 authentication & OAuth SDK — typed, request-only clients for first-party auth and OAuth provider flows.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <AnalyticsProvider>
          <RootProvider>
            <LangProvider>{children}</LangProvider>
          </RootProvider>
        </AnalyticsProvider>
      </body>
    </html>
  )
}
