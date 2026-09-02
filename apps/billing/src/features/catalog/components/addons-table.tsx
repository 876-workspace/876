'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatPriceCadence } from '@/lib/format'
import { ResourceRowLink } from '@/components/patterns/resource-row-link'

export type AddonRow = {
  id: string
  code: string
  name: string
  priceType: 'ONE_TIME' | 'RECURRING'
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  intervalCount: number | null
  isActive: boolean
  product: { name: string }
  prices: unknown[]
  planAssociations: unknown[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function AddonsTable({
  addons,
  emptyState,
}: {
  addons: AddonRow[]
  emptyState?: React.ReactNode
}) {
  const router = useRouter()
  const columns: ColumnDef<AddonRow, unknown>[] = [
    {
      id: 'addon',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Add-on" />
      ),
      cell: ({ row }) => (
        <>
          <Link
            href={`/addons/${row.original.id}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            {row.original.code}
          </p>
        </>
      ),
    },
    {
      id: 'product',
      accessorFn: (row) => row.product.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => row.original.product.name,
    },
    {
      id: 'cadence',
      enableSorting: false,
      header: 'Charge',
      cell: ({ row }) => formatPriceCadence(row.original),
    },
    {
      id: 'plans',
      enableSorting: false,
      header: 'Plans',
      cell: ({ row }) => row.original.planAssociations.length,
    },
    {
      id: 'prices',
      enableSorting: false,
      header: 'Prices',
      cell: ({ row }) => row.original.prices.length,
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (row.original.isActive ? 'Active' : 'Archived'),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ResourceRowLink
            href={`/addons/${row.original.id}`}
            resourceName={row.original.name}
          />
        </div>
      ),
    },
  ]
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={addons}
        emptyState={emptyState}
        onRowClick={(addon) => router.push(`/addons/${addon.id}`)}
      />
    </div>
  )
}
