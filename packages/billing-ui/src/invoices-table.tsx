'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { documentStatusVariant } from './document-status'

/**
 * A sales invoice as the finance plane serves it. `customer` accepts a bare
 * name because Console reads a denormalized row where the product apps hold the
 * related record.
 */
export interface InvoiceRow {
  id: string
  number: string
  totalAmount: bigint | string
  amountDue?: bigint | string
  currency: string
  status: string
  customer: { name: string } | string | null
}

export interface InvoicesTableProps {
  invoices: InvoiceRow[]
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /** Host money policy, as in ItemsTable. */
  formatAmount: (amount: bigint | string, currency: string) => string
  emptyState?: ReactNode
}

function customerName(customer: InvoiceRow['customer']): string {
  if (typeof customer === 'string') return customer
  return customer?.name ?? '—'
}

/** An unpaid balance is the total until the document says otherwise. */
function amountDue(row: InvoiceRow): bigint | string {
  return row.amountDue ?? row.totalAmount
}

export function InvoicesTable({
  invoices,
  baseHref,
  formatAmount,
  emptyState,
}: InvoicesTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<InvoiceRow, unknown>[] = [
    {
      id: 'invoice',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Invoice" />
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
      accessorFn: (row) => customerName(row.customer),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => customerName(row.original.customer),
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
      id: 'amountDue',
      accessorFn: amountDue,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount due" />
      ),
      cell: ({ row }) =>
        formatAmount(amountDue(row.original), row.original.currency),
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

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={invoices}
        onRowClick={(invoice) => router.push(hrefFor(invoice.id))}
      />
    </div>
  )
}
