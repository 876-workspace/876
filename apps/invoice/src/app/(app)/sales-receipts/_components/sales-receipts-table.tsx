'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

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

export function SalesReceiptsTable({ receipts, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<SalesReceiptRow, unknown>[] = [
    {
      id: 'receipt',
      header: 'Sales Receipt',
      cell: ({ row }: any) => (
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
      header: 'Customer',
      cell: ({ row }: any) => row.original.customer.name,
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }: any) =>
        formatMoney(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
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
