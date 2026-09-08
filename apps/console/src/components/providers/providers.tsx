'use client'

import { BillingUiLinkProvider } from '@876/billing-ui/link'
import { ThemeProvider as BaseThemeProvider } from '@876/ui/theme'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <BaseThemeProvider>
        <BillingUiLinkProvider component={Link}>
          {children}
        </BillingUiLinkProvider>
      </BaseThemeProvider>
    </AnalyticsProvider>
  )
}
