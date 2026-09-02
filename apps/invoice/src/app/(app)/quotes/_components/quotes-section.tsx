'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { useListDetailRoute } from '@876/ui/list-detail-shell'

import { QuotesToolbar } from './quotes-toolbar'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function QuotesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const { open } = useListDetailRoute(TAKEOVER_SEGMENTS)
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={<QuotesToolbar status={status} showPrimary={!open} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
