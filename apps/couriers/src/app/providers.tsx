'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import type { AnalyticsGroup, AnalyticsUser } from '@876/analytics'

import { AnalyticsProvider } from '@/lib/analytics/provider'

// Suppress next-themes script tag warning in React 19
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes(
        'Encountered a script tag while rendering React component'
      )
    ) {
      return
    }
    orig.apply(console, args)
  }
}

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
