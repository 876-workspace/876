'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatMoney } from '@/lib/format'
import type { CustomerTableRow } from '@/types/customer'

interface Props {
  emptyState?: React.ReactNode
  customers: CustomerTableRow[]
}

export function CustomersTable({ customers, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<CustomerTableRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.id}`}
          className="font-medium hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ row }) => (
        <span
          className={row.original.companyName ? '' : 'text-muted-foreground'}
        >
          {row.original.companyName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => (
        <span className={row.original.phone ? '' : 'text-muted-foreground'}>
          {row.original.phone ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'receivables',
      header: () => <div className="text-right">Receivables</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatMoney(String(row.original.receivables), row.original.currency)}
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
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
      />
    </div>
  )
}
