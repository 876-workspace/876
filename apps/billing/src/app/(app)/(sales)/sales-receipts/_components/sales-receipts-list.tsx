'use client'

import type { ComponentProps, ReactNode } from 'react'
import { SalesReceiptsList as SharedSalesReceiptsList } from '@876/billing-ui/sales-receipts-list'
import { Badge } from '@876/ui/badge'

import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

type SalesReceiptRow = ComponentProps<
  typeof SharedSalesReceiptsList
>['receipts'][number]

export function SalesReceiptsList({
  receipts,
  emptyState,
}: {
  receipts: SalesReceiptRow[]
  emptyState?: ReactNode
}) {
  return (
    <SharedSalesReceiptsList
      receipts={receipts}
      baseHref="/sales-receipts"
      formatAmount={formatMoney}
      formatDate={(timestamp) => formatDate(timestamp)}
      renderStatus={(status) => (
        <Badge variant={documentStatusVariant(status)}>
          <span className="capitalize">{status.toLowerCase()}</span>
        </Badge>
      )}
      emptyState={emptyState}
    />
  )
}
