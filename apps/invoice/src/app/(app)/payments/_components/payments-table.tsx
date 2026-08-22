'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney, formatDate } from '@/lib/format'

interface PaymentRow {
  id: string
  number: string
  customer: { name: string }
  amount: bigint | string
  currency: string
  paymentDate: number
  status: string
  depositAccount: string
}

interface Props {
  emptyState?: React.ReactNode
  payments: PaymentRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function PaymentsTable({ payments, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<PaymentRow, unknown>[] = [
    {
      id: 'payment',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/payments/${row.original.id}`}
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
      id: 'account',
      accessorKey: 'depositAccount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deposit account" />
      ),
      cell: ({ row }) => (
        <span className="text-xs">{row.original.depositAccount}</span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) =>
        formatMoney(row.original.amount, row.original.currency),
    },
    {
      id: 'date',
      accessorKey: 'paymentDate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.paymentDate)}
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
        <Badge variant="secondary">{row.original.status}</Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={payments}
        onRowClick={(p) => router.push(`/payments/${p.id}`)}
      />
    </div>
  )
}
