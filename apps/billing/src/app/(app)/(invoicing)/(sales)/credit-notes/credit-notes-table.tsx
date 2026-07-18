'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatMoney } from '@/lib/format'
import { ResourceRowLink } from '@/components/resource-row-link'

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

export function CreditNotesTable({ creditNotes, emptyState }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CreditNoteRow, unknown>[] = [
    {
      id: 'number',
      header: 'Number',
      cell: ({ row }) => (
        <Link
          href={`/credit-notes/${row.original.id}`}
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
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {row.original.status.charAt(0) +
            row.original.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      id: 'total',
      header: () => <span className="block text-right">Total</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatMoney(row.original.totalAmount, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'balance',
      header: () => <span className="block text-right">Balance</span>,
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
