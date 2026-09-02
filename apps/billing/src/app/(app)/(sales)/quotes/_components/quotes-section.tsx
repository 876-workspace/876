'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const QUOTE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Quotes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Quotes' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Quotes' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Quotes' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Quotes' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Quotes' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Quotes' },
]

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function QuotesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status)
    ? status
    : 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Quotes"
          status={selectedStatus}
          options={QUOTE_STATUS_OPTIONS}
          primary={{
            label: 'New',
            href: '/quotes/new',
            permission: 'sales:write',
          }}
        />
      }
      list={list}
      takeoverSegments={TAKEOVER_SEGMENTS}
    >
      {children}
    </ListDetailSection>
  )
}
