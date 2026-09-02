'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const ESTIMATE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Estimates' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Estimates' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Estimates' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Estimates' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Estimates' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Estimates' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Estimates' },
]

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function EstimatesSection({
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
          title="Estimates"
          status={selectedStatus}
          options={ESTIMATE_STATUS_OPTIONS}
          primary={{
            label: 'New',
            href: '/estimates/new',
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
