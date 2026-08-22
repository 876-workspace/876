'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

interface InvoiceRow {
  id: string
  number: string
  totalAmount: bigint | string
  amountDue?: bigint | string
  currency: string
  status: string
  customer: { name: string } | string
}

interface Props {
  emptyState?: React.ReactNode
  invoices: InvoiceRow[]
}

function getCustomerName(customer: InvoiceRow['customer']): string {
  if (typeof customer === 'string') return customer
  return customer?.name ?? '—'
}

function getAmountDue(row: InvoiceRow): bigint | string {
  if (row.amountDue !== undefined) return row.amountDue
  return row.totalAmount
}

export function InvoicesTable({ invoices, emptyState }: Props) {
  const router = useRouter()
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
      accessorFn: (row) => getCustomerName(row.customer),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => getCustomerName(row.original.customer),
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
      accessorFn: getAmountDue,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount due" />
      ),
      cell: ({ row }) =>
        formatMoney(getAmountDue(row.original), row.original.currency),
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
        onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
      />
    </div>
  )
}
