'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  RECURRING_INVOICE_STATUS_OPTIONS,
  resolveRecurringInvoiceStatus,
} from '@876/billing-ui/document-status'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const TAKEOVER_SEGMENTS = ['new', 'edit'] as const

export function RecurringInvoicesSection({
  list,
  children,
}: {
  list: ReactNode
  children: ReactNode
}) {
  const status = useSearchParams().get('status') ?? 'all'

  return (
    <ListDetailSection
      toolbar={
        <StreamingResourceToolbar
          title="Recurring Invoices"
          status={resolveRecurringInvoiceStatus(status)}
          options={RECURRING_INVOICE_STATUS_OPTIONS}
          primary={{
            href: '/recurring-invoices/new',
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
