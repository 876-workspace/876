'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatMoney } from '@/lib/format'

type Props = {
  emptyState?: React.ReactNode
  invoices: InvoiceRow[]
}

interface InvoiceRow {
  id: string
  number: string
  totalAmount: bigint
  amountDue: bigint
  currency: string
  status: string
  customer: { name: string }
}

export function InvoicesTable({ invoices, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<InvoiceRow, unknown>[] = [
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }) => (
        <Link
          href={`/invoices/${row.original.id}`}
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
      id: 'amountDue',
      header: 'Amount due',
      cell: ({ row }) =>
        formatMoney(row.original.amountDue, row.original.currency),
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
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={invoices}
        onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
      />
    </div>
  )
}
