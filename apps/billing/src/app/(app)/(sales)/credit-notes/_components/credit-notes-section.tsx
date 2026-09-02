'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

const CREDIT_NOTE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Credit Notes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Credit Notes' },
  { value: 'open', label: 'Open', headingLabel: 'Open Credit Notes' },
  { value: 'closed', label: 'Closed', headingLabel: 'Closed Credit Notes' },
  { value: 'void', label: 'Void', headingLabel: 'Void Credit Notes' },
]

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function CreditNotesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status')
  const validStatuses = ['draft', 'open', 'closed', 'void']
  const selectedStatus = validStatuses.includes(status ?? '') ? status! : 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Credit Notes"
          status={selectedStatus}
          options={CREDIT_NOTE_STATUS_OPTIONS}
          primary={{
            label: 'New',
            href: '/credit-notes/new',
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
