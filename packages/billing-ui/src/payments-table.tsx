'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { Link } from './link'

/**
 * A received payment as the finance plane serves it.
 *
 * `amount` accepts both shapes the hosts hold it in — Invoice reads Prisma
 * `BigInt` minor units, Console reads the serialized decimal string — because
 * narrowing it here would force one host to convert on every row.
 */
export interface PaymentRow {
  id: string
  number: string
  customerName: string
  amount: bigint | string
  currency: string
  /** Unix seconds, or null when the payment carries no recorded date. */
  paymentDate: number | null
  status: string
  depositAccountName: string
}

export interface PaymentsTableProps {
  payments: PaymentRow[]
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /**
   * Money and date formatting are host policy, not presentation: each host
   * already owns a locale and a currency convention, and passing them keeps
   * this table from becoming a second place those decisions are made.
   */
  formatAmount: (amount: bigint | string, currency: string) => string
  formatDate: (date: number | null) => string
  emptyState?: ReactNode
}

export function PaymentsTable({
  payments,
  baseHref,
  formatAmount,
  formatDate,
  emptyState,
}: PaymentsTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<PaymentRow, unknown>[] = [
    {
      id: 'payment',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment" />
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
      accessorKey: 'customerName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customerName,
    },
    {
      id: 'account',
      accessorKey: 'depositAccountName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deposit account" />
      ),
      cell: ({ row }) => (
        <span className="text-xs">{row.original.depositAccountName}</span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatAmount(row.original.amount, row.original.currency)}
        </span>
      ),
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
        className="text-[0.8125rem]"
        onRowClick={(payment) => router.push(hrefFor(payment.id))}
      />
    </div>
  )
}
