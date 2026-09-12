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
      className="print:h-auto print:p-0 print:[&_[data-slot=list-detail-detail-column]]:h-auto print:[&_[data-slot=list-detail-detail-column]]:overflow-visible print:[&_[data-slot=list-detail-list-column]]:hidden print:[&_[data-slot=list-detail-shell]]:h-auto print:[&_[data-slot=list-detail-shell]]:overflow-visible print:[&_[data-slot=list-detail-shell]>div]:block print:[&_[data-slot=list-detail-shell]>div]:h-auto print:[&_[data-slot=list-detail-shell]>div]:p-0"
      toolbar={<InvoicesToolbar status={status} showPrimary={!open} />}
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
