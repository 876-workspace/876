'use client'

import { ThemeProvider as BaseThemeProvider } from '@876/ui/theme'
import type { ReactNode } from 'react'

import type { AnalyticsGroup, AnalyticsUser } from '@876/analytics'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function ThemeProvider({
  children,
  forcedTheme,
  analyticsUser,
  analyticsGroups,
}: {
  children: ReactNode
  forcedTheme?: 'light'
  analyticsUser: AnalyticsUser | null
  analyticsGroups?: readonly AnalyticsGroup[]
}) {
  return (
    <AnalyticsProvider user={analyticsUser} groups={analyticsGroups}>
      <BaseThemeProvider forcedTheme={forcedTheme}>
        {children}
      </BaseThemeProvider>
    </AnalyticsProvider>
  )
}
