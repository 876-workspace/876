'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@/lib/format'
import type { CouriersCustomerRow } from '../customer-rows'
import { Muted } from './cells'
import { enumLabel } from '../labels'

export interface CustomersTableProps {
  customers: CouriersCustomerRow[]
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  emptyState?: ReactNode
}

export function CustomersTable({
  customers,
  baseHref,
  emptyState,
}: CustomersTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CouriersCustomerRow, unknown>[] = [
    {
      id: 'customer',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name ?? row.original.billingCustomerId}
        </Link>
      ),
    },
    {
      id: 'branch',
      accessorKey: 'branchName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => row.original.branchName ?? <Muted>—</Muted>,
    },
    {
      id: 'kind',
      accessorKey: 'isCommercial',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kind" />
      ),
      cell: ({ row }) =>
        row.original.isCommercial ? 'Commercial' : 'Personal',
    },
    {
      id: 'trn',
      accessorKey: 'trn',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="TRN" />
      ),
      cell: ({ row }) => <Muted>{row.original.trn ?? '—'}</Muted>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{enumLabel(row.original.status)}</Badge>
      ),
    },
    {
      id: 'created',
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => <Muted>{formatDate(row.original.createdAt)}</Muted>,
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
