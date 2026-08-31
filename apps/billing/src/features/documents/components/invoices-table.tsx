'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { ResourceSplitList } from '@876/ui/resource-split-list'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

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
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const visibleInvoices = invoices.filter((invoice) =>
    status === 'all' ? true : invoice.status === status.toUpperCase()
  )

  const columns: ColumnDef<InvoiceRow, unknown>[] = [
    {
      id: 'invoice',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Invoice" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/invoices/${row.original.id}`}
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
      id: 'amountDue',
      accessorKey: 'amountDue',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount due" />
      ),
      cell: ({ row }) =>
        formatMoney(row.original.amountDue, row.original.currency),
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
            {row.original.status.toLowerCase().replace(/_/g, ' ')}
          </span>
        </Badge>
      ),
    },
  ]

  const table = (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={visibleInvoices}
        onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
      />
    </div>
  )

  return (
    <ResourceSplitList
      table={table}
      items={visibleInvoices.map((invoice) => ({
        id: invoice.id,
        href: `/invoices/${invoice.id}`,
        title: invoice.number,
        description: invoice.customer.name,
        meta: `${formatMoney(invoice.amountDue, invoice.currency)} due · ${invoice.status.toLowerCase().replace(/_/g, ' ')}`,
      }))}
    />
  )
}
