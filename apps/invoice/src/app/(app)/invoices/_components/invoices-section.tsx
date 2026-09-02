'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { useListDetailRoute } from '@876/ui/list-detail-shell'

import { InvoicesToolbar } from './invoices-toolbar'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function InvoicesSection({
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
      toolbar={<InvoicesToolbar status={status} showPrimary={!open} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
