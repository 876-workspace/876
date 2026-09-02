'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'
import { ResourceRowLink } from '@876/ui/resource-row-link'

export interface CreditNoteRow {
  id: string
  number: string
  status: string
  currency: string
  totalAmount: string
  balanceAmount: string
  customerId: string
  customer: { id: string; name: string }
}

type Props = {
  emptyState?: React.ReactNode
  creditNotes: CreditNoteRow[]
}

function statusVariant(
  status: string
): 'info' | 'secondary' | 'success' | 'destructive' {
  switch (status) {
    case 'OPEN':
      return 'info'
    case 'CLOSED':
      return 'success'
    case 'VOID':
      return 'secondary'
    case 'DRAFT':
    default:
      return 'secondary'
  }
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function CreditNotesTable({ creditNotes, emptyState }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CreditNoteRow, unknown>[] = [
    {
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Number" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/credit-notes/${row.original.id}`}
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
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.customer.id}`}
          className="text-sm hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.customer.name}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {row.original.status.charAt(0) +
            row.original.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Total" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatMoney(row.original.totalAmount, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: 'balanceAmount',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Balance" />
        </div>
      ),
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatMoney(row.original.balanceAmount, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ResourceRowLink
            href={`/credit-notes/${row.original.id}`}
            resourceName={row.original.number}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={creditNotes}
        onRowClick={(cn) => router.push(`/credit-notes/${cn.id}`)}
      />
    </div>
  )
}
