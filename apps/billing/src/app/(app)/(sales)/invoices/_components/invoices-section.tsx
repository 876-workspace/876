'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function InvoicesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status
  )
    ? status
    : 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Invoices"
          status={selectedStatus}
          options={INVOICE_STATUS_OPTIONS}
          primary={{
            label: 'New',
            href: '/invoices/new',
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
