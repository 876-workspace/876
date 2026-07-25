'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
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
