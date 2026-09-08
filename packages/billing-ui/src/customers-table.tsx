'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { Link } from './link'

/**
 * A customer as the finance plane serves it. `receivables` accepts both
 * shapes the hosts hold it in — Billing reads Prisma `BigInt` minor units,
 * Invoice reads the serialized decimal string — because narrowing it here
 * would force one host to convert on every row.
 */
export interface CustomerRow {
  id: string
  name: string
  companyName: string | null
  contactName: string | null
  email?: string | null
  phone: string | null
  receivables: bigint | string
  currency: string
  status: 'ACTIVE' | 'ARCHIVED'
}

export interface CustomersTableProps {
  customers: CustomerRow[]
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /**
   * Money formatting is host policy, not presentation: Billing formats minor units
   * while Invoice formats decimal strings. Passing the formatter keeps that
   * difference where it belongs instead of adding a third formatter.
   */
  formatAmount: (amount: bigint | string | null, currency: string) => string
  emptyState?: ReactNode
}

export function CustomersTable({
  customers,
  baseHref,
  formatAmount,
  emptyState,
}: CustomersTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CustomerRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={row.original.name} />
          <Link
            href={hrefFor(row.original.id)}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => (
        <span
          className={
            row.original.companyName
              ? 'text-foreground'
              : 'text-muted-foreground'
          }
        >
          {row.original.companyName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'contactName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.contactName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'receivables',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Receivables" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatAmount(row.original.receivables, row.original.currency)}
        </div>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={customers}
        className="text-[0.8125rem]"
        onRowClick={(customer) => router.push(hrefFor(customer.id))}
      />
    </div>
  )
}
