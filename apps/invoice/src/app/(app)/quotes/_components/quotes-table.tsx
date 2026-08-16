'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

interface QuoteRow {
  id: string
  number: string
  totalAmount: bigint | string
  currency: string
  status: string
  customer: { name: string }
  convertedInvoice: { number: string } | null
}

interface Props {
  emptyState?: React.ReactNode
  quotes: QuoteRow[]
}

export function QuotesTable({ quotes, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<QuoteRow, unknown>[] = [
    {
      id: 'quote',
      header: 'Quote',
      cell: ({ row }: any) => (
        <Link
          href={`/quotes/${row.original.id}`}
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
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={documentStatusVariant(row.original.status)}>
          <span className="capitalize">
            {row.original.status.toLowerCase().replace(/_/g, ' ')}
          </span>
        </Badge>
      ),
    },
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }: any) => (
        <span className="text-xs">
          {row.original.convertedInvoice?.number ?? 'Not converted'}
        </span>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={quotes}
        onRowClick={(q) => router.push(`/quotes/${q.id}`)}
      />
    </div>
  )
}
