'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
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
      header: 'Invoice',
      cell: ({ row }: any) => (
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
      header: 'Customer',
      cell: ({ row }: any) => getCustomerName(row.original.customer),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }: any) =>
        formatMoney(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'amountDue',
      header: 'Amount due',
      cell: ({ row }: any) =>
        formatMoney(getAmountDue(row.original), row.original.currency),
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
