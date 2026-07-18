'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatMoney } from '@/lib/format'

type Props = {
  emptyState?: React.ReactNode
  quotes: QuoteRow[]
}

interface QuoteRow {
  id: string
  number: string
  totalAmount: bigint
  currency: string
  status: string
  customer: { name: string }
  convertedInvoice: { number: string } | null
}

export function QuotesTable({ quotes, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<QuoteRow, unknown>[] = [
    {
      id: 'quote',
      header: 'Quote',
      cell: ({ row }) => (
        <Link
          href={`/quotes/${row.original.id}`}
          className="font-medium hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: ({ row }) => row.original.customer.name,
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) =>
        formatMoney(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className="text-xs capitalize">
          {row.original.status.toLowerCase()}
        </span>
      ),
    },
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }) => (
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
        onRowClick={(quote) => router.push(`/quotes/${quote.id}`)}
      />
    </div>
  )
}
