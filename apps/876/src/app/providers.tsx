'use client'

import type { ReactNode } from 'react'

import type { AnalyticsGroup, AnalyticsUser } from '@876/analytics'

import { AnalyticsProvider } from '@/lib/analytics/provider'

export function Providers({
  children,
  user,
  groups,
}: {
  children: ReactNode
  user: AnalyticsUser | null
  groups?: readonly AnalyticsGroup[]
}) {
  return (
    <AnalyticsProvider user={user} groups={groups}>
      {children}
    </AnalyticsProvider>
  )
}
