'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney, formatDate } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

interface SalesReceiptRow {
  id: string
  number: string
  customer: { name: string }
  totalAmount: bigint | string
  currency: string
  status: string
  date: number | null
}

interface Props {
  emptyState?: React.ReactNode
  receipts: SalesReceiptRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function SalesReceiptsTable({ receipts, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<SalesReceiptRow, unknown>[] = [
    {
      id: 'receipt',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales Receipt" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/sales-receipts/${row.original.id}`}
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
        formatMoney(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'date',
      accessorKey: 'date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={documentStatusVariant(row.original.status)}>
          <span className="capitalize">
            {row.original.status.toLowerCase()}
          </span>
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={receipts}
        onRowClick={(r) => router.push(`/sales-receipts/${r.id}`)}
      />
    </div>
  )
}
