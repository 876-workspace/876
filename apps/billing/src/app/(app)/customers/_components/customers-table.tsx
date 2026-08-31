'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { ResourceSplitList } from '@876/ui/resource-split-list'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatMoney } from '@/lib/format'
import type { CustomerTableRow } from '@/types/customer'

interface Props {
  emptyState?: React.ReactNode
  customers: CustomerTableRow[]
}

export function CustomersTable({ customers, emptyState }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const visibleCustomers = customers.filter((customer) => {
    if (status === 'active') return customer.status === 'ACTIVE'
    if (status === 'archived') return customer.status === 'ARCHIVED'
    return true
  })

  const columns: ColumnDef<CustomerTableRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={row.original.name} />
          <Link
            href={`/customers/${row.original.id}`}
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
          {formatMoney(String(row.original.receivables), row.original.currency)}
        </div>
      ),
    },
  ]

  const table = (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={visibleCustomers}
        className="text-[0.8125rem]"
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
      />
    </div>
  )

  return (
    <ResourceSplitList
      table={table}
      items={visibleCustomers.map((customer) => ({
        id: customer.id,
        href: `/customers/${customer.id}`,
        title: customer.name,
        description:
          customer.companyName ?? customer.contactName ?? customer.phone,
        meta: `${formatMoney(String(customer.receivables), customer.currency)} receivable`,
      }))}
    />
  )
}
