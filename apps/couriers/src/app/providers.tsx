'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import type { AnalyticsGroup, AnalyticsUser } from '@876/analytics'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function ThemeProvider({
  children,
  analyticsUser,
  analyticsGroups,
}: {
  children: ReactNode
  analyticsUser: AnalyticsUser | null
  analyticsGroups?: readonly AnalyticsGroup[]
}) {
  return (
    <AnalyticsProvider user={analyticsUser} groups={analyticsGroups}>
      <NextThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemeProvider>
    </AnalyticsProvider>
  )
}
