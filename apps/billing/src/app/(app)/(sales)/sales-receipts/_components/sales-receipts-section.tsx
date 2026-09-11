'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  SALES_RECEIPT_STATUS_OPTIONS,
  resolveSalesReceiptStatus,
} from '@876/billing-ui/document-status'
import { ListDetailSection } from '@876/ui/list-detail-section'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

const TAKEOVER_SEGMENTS = ['new'] as const

export function SalesReceiptsSection({
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
          title="Sales Receipts"
          status={resolveSalesReceiptStatus(status)}
          options={SALES_RECEIPT_STATUS_OPTIONS}
          primary={{
            label: 'New',
            href: '/sales-receipts/new',
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
