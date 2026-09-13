'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  INVOICE_STATUS_OPTIONS,
  resolveInvoiceStatus,
} from '@876/billing-ui/document-status'
import { ListDetailSection } from '@876/ui/list-detail-section'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function InvoicesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'
  const selectedStatus = resolveInvoiceStatus(status)

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Invoices"
          status={selectedStatus}
          options={INVOICE_STATUS_OPTIONS}
          primary={{
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
