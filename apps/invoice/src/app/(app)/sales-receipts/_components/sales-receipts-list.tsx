'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

import { documentStatusVariant } from '@/lib/status'
import { SalesReceiptsTable } from './sales-receipts-table'

type SalesReceiptRow = ComponentProps<
  typeof SalesReceiptsTable
>['receipts'][number]

export function SalesReceiptsList({
  receipts,
  emptyState,
}: {
  receipts: SalesReceiptRow[]
  emptyState?: ReactNode
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status')
  const rows =
    status === 'paid' || status === 'void'
      ? receipts.filter((receipt) => receipt.status.toLowerCase() === status)
      : receipts

  if (!selectedId)
    return <SalesReceiptsTable receipts={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Sales Receipts</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No sales receipts yet</ListPaneEmpty>
        ) : (
          rows.map((receipt) => (
            <ListPaneItem
              key={receipt.id}
              href={
                query
                  ? `/sales-receipts/${receipt.id}?${query}`
                  : `/sales-receipts/${receipt.id}`
              }
              selected={receipt.id === selectedId}
              label={`View sales receipt ${receipt.number}`}
              title={receipt.number}
              subtitle={receipt.customer.name}
              trailing={
                <Badge variant={documentStatusVariant(receipt.status)}>
                  <span className="capitalize">
                    {receipt.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
