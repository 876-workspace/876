'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import type { VendorTableRow } from '@/types/vendor'

interface Props {
  emptyState?: React.ReactNode
  vendors: VendorTableRow[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function VendorsTable({ vendors, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<VendorTableRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => (
        <div>
          <Link
            href={`/purchases/vendors/${row.original.id}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {row.original.email ?? row.original.phone ?? 'No contact details'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'reference',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reference" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: 'defaultCurrency',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Currency" />
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}
        >
          {row.original.status.toLowerCase()}
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={vendors}
        onRowClick={(vendor) => router.push(`/purchases/vendors/${vendor.id}`)}
      />
    </div>
  )
}
