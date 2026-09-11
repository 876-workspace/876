'use client'

import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { Link } from './link'

export interface SalesReceiptRow {
  id: string
  number: string
  customer: { name: string }
  totalAmount: bigint | string
  currency: string
  status: 'PAID' | 'VOID'
  receiptAt: number
}

export interface SalesReceiptsListProps {
  receipts: SalesReceiptRow[]
  baseHref: string
  formatAmount: (amount: bigint | string, currency: string) => string
  formatDate: (timestamp: number) => string
  renderStatus: (status: SalesReceiptRow['status']) => ReactNode
  emptyState?: ReactNode
}

/** Shared Billing/Invoice list-detail presentation for immediate paid sales. */
export function SalesReceiptsList({
  receipts,
  baseHref,
  formatAmount,
  formatDate,
  renderStatus,
  emptyState,
}: SalesReceiptsListProps) {
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
    return (
      <SalesReceiptsTable
        receipts={rows}
        baseHref={baseHref}
        formatAmount={formatAmount}
        formatDate={formatDate}
        renderStatus={renderStatus}
        emptyState={emptyState}
      />
    )

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
                  ? `${baseHref}/${receipt.id}?${query}`
                  : `${baseHref}/${receipt.id}`
              }
              selected={receipt.id === selectedId}
              label={`View sales receipt ${receipt.number}`}
              title={receipt.number}
              subtitle={receipt.customer.name}
              trailing={renderStatus(receipt.status)}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function SalesReceiptsTable({
  receipts,
  baseHref,
  formatAmount,
  formatDate,
  renderStatus,
  emptyState,
}: SalesReceiptsListProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`
  const columns: ColumnDef<SalesReceiptRow, unknown>[] = [
    {
      id: 'receipt',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales Receipt" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customer.name,
    },
    {
      id: 'total',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) =>
        formatAmount(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'date',
      accessorKey: 'receiptAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.receiptAt)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => renderStatus(row.original.status),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={receipts}
        onRowClick={(receipt) => router.push(hrefFor(receipt.id))}
      />
    </div>
  )
}
