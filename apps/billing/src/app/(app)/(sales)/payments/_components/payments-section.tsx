'use client'

import type { ReactNode } from 'react'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { useListDetailRoute } from '@876/ui/list-detail-shell'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
]

/**
 * Segments that own the whole content area instead of opening beside the list.
 * They keep the `/payments` prefix so the sidebar stays on Payments Received,
 * but the toolbar and list stand down.
 */
const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function PaymentsSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const { open } = useListDetailRoute(TAKEOVER_SEGMENTS)

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Payments Received"
          status="all"
          options={PAYMENT_STATUS_OPTIONS}
          primary={
            open
              ? undefined
              : {
                  label: 'New',
                  href: '/payments/new',
                  permission: 'payments:write',
                }
          }
        />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
