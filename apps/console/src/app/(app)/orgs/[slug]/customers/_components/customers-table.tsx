'use client'

import type { Customer } from '@876/billing'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate, statusBadgeClass } from '@/lib/format'

type Props = {
  customers: Customer[]
}

const columns: ColumnDef<Customer, unknown>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.name} />
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'companyName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.companyName ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.phone ?? row.original.workPhone ?? '—'}
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
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          statusBadgeClass(row.original.status.toLowerCase())
        )}
      >
        {row.original.status.toLowerCase()}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]

export function CustomersTable({ customers }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={customers}
        emptyState={
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No customers</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
