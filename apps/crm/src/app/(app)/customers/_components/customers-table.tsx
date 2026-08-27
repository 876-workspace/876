'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@876/ui/empty'

export type CrmCustomerRow = {
  profileId: string
  billingCustomerId: string
  name: string
  email: string | null
  phone: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

interface Props {
  customers: CrmCustomerRow[]
}

const emptyState = (
  <Empty className="py-14">
    <EmptyHeader>
      <EmptyTitle>No customers yet</EmptyTitle>
      <EmptyDescription>
        Add your first customer to get started.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
)

export function CustomersTable({ customers }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CrmCustomerRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <CustomerAvatar name={row.original.name} />
          <Link
            href={`/customers/${row.original.profileId}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.email ?? '—'}
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
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <span
          className={
            row.original.status === 'ACTIVE'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground'
          }
        >
          {row.original.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={customers}
        emptyState={emptyState}
        onRowClick={(customer) =>
          router.push(`/customers/${customer.profileId}`)
        }
      />
    </div>
  )
}
