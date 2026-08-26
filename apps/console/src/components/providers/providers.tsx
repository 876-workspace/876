'use client'

import { ThemeProvider as BaseThemeProvider } from '@876/ui/theme'
import type { ReactNode } from 'react'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <BaseThemeProvider>{children}</BaseThemeProvider>
    </AnalyticsProvider>
  )
}
