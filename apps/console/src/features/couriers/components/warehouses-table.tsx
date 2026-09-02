'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import type { CouriersWarehouseRow } from '../warehouse-rows'
import { enumLabel } from '../labels'
import { Muted } from './cells'

export interface WarehousesTableProps {
  warehouses: CouriersWarehouseRow[]
  baseHref: string
  emptyState?: ReactNode
}

export function WarehousesTable({
  warehouses,
  baseHref,
  emptyState,
}: WarehousesTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CouriersWarehouseRow, unknown>[] = [
    {
      id: 'warehouse',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Warehouse" />
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
      id: 'code',
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => <Muted>{row.original.code ?? '—'}</Muted>,
    },
    {
      id: 'model',
      accessorKey: 'operatingModel',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Operating model" />
      ),
      cell: ({ row }) => enumLabel(row.original.operatingModel),
    },
    {
      id: 'agent',
      accessorKey: 'agentName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Agent" />
      ),
      cell: ({ row }) => <Muted>{row.original.agentName ?? '—'}</Muted>,
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
      id: 'primary',
      accessorKey: 'isPrimary',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Primary" />
      ),
      cell: ({ row }) =>
        row.original.isPrimary ? (
          <Badge variant="secondary">Primary</Badge>
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
        data={warehouses}
        className="text-[0.8125rem]"
        onRowClick={(warehouse) => router.push(hrefFor(warehouse.id))}
      />
    </div>
  )
}
