'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatPriceCadence } from '@/lib/format'
import { ResourceRowLink } from '@/components/resource-row-link'

type AddonRow = {
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
      header: 'Add-on',
      cell: ({ row }) => (
        <>
          <Link
            href={`/addons/${row.original.id}`}
            className="font-medium hover:underline"
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
      header: 'Product',
      cell: ({ row }) => row.original.product.name,
    },
    {
      id: 'cadence',
      header: 'Charge',
      cell: ({ row }) => formatPriceCadence(row.original),
    },
    {
      id: 'plans',
      header: 'Plans',
      cell: ({ row }) => row.original.planAssociations.length,
    },
    {
      id: 'prices',
      header: 'Prices',
      cell: ({ row }) => row.original.prices.length,
    },
    {
      id: 'status',
      header: 'Status',
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
