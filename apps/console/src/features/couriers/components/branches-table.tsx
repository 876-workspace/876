'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import type { CouriersBranchRow } from '../branch-rows'
import { Muted } from './cells'

export interface BranchesTableProps {
  branches: CouriersBranchRow[]
  baseHref: string
  emptyState?: ReactNode
}

export function BranchesTable({
  branches,
  baseHref,
  emptyState,
}: BranchesTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CouriersBranchRow, unknown>[] = [
    {
      id: 'branch',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'address',
      accessorKey: 'line1',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => row.original.line1,
    },
    {
      id: 'city',
      accessorKey: 'city',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="City" />
      ),
      cell: ({ row }) => (
        <Muted>{`${row.original.city}, ${row.original.countryCode}`}</Muted>
      ),
    },
    {
      id: 'phone',
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => <Muted>{row.original.phone ?? '—'}</Muted>,
    },
    {
      id: 'default',
      accessorKey: 'isDefault',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Default" />
      ),
      cell: ({ row }) =>
        row.original.isDefault ? (
          <Badge variant="secondary">Default</Badge>
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={branches}
        className="text-[0.8125rem]"
        onRowClick={(branch) => router.push(hrefFor(branch.id))}
      />
    </div>
  )
}
