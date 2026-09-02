'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@/lib/format'
import type { CouriersPackageRow } from '../package-rows'
import { enumLabel } from '../labels'
import { Muted } from './cells'

export interface PackagesTableProps {
  packages: CouriersPackageRow[]
  baseHref: string
  emptyState?: ReactNode
}

export function PackagesTable({
  packages,
  baseHref,
  emptyState,
}: PackagesTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

  const columns: ColumnDef<CouriersPackageRow, unknown>[] = [
    {
      id: 'tracking',
      accessorKey: 'trackingNum',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tracking" />
      ),
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.trackingNum ?? 'No tracking number'}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorKey: 'customerName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customerName ?? <Muted>—</Muted>,
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => row.original.description ?? <Muted>—</Muted>,
    },
    {
      id: 'type',
      accessorKey: 'packageType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => <Muted>{enumLabel(row.original.packageType)}</Muted>,
    },
    {
      id: 'quantity',
      accessorKey: 'quantity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Qty" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.quantity}</span>
      ),
    },
    {
      id: 'weight',
      accessorKey: 'actualWeight',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Weight" />
      ),
      cell: ({ row }) =>
        row.original.actualWeight === null ? (
          <Muted>—</Muted>
        ) : (
          <span className="tabular-nums">{row.original.actualWeight}</span>
        ),
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
        <DataTableColumnHeader column={column} title="Received" />
      ),
      cell: ({ row }) => <Muted>{formatDate(row.original.createdAt)}</Muted>,
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={packages}
        className="text-[0.8125rem]"
        onRowClick={(pkg) => router.push(hrefFor(pkg.id))}
      />
    </div>
  )
}
