'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { WidgetsToolbar } from './widgets-toolbar'

/**
 * Routes that own the whole content area instead of opening beside the list —
 * the flag-registration form.
 */
const TAKEOVER_SEGMENTS = ['new'] as const

export function WidgetsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const requestedDistribution = useSearchParams().get('distribution')
  const distribution =
    requestedDistribution === 'shared' || requestedDistribution === 'host'
      ? requestedDistribution
      : 'all'

  return (
    <ListDetailSection
      toolbar={<WidgetsToolbar distribution={distribution} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
