'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { ResourceRowLink } from '@/components/resource-row-link'

type PriceListRow = {
  id: string
  name: string
  mode: 'PERCENTAGE' | 'CUSTOM'
  direction: 'MARKUP' | 'MARKDOWN' | null
  percentage: { toString(): string } | null
  currency: string | null
  isActive: boolean
  entries: unknown[]
  _count: { customers: number }
}

export function PriceListsTable({ lists }: { lists: PriceListRow[] }) {
  const router = useRouter()
  const columns: ColumnDef<PriceListRow, unknown>[] = [
    {
      id: 'name',
      header: 'Price list',
      cell: ({ row }) => (
        <Link
          href={`/price-lists/${row.original.id}`}
          className="font-medium hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      cell: ({ row }) =>
        row.original.mode === 'PERCENTAGE'
          ? `${row.original.percentage?.toString() ?? 0}% ${row.original.direction?.toLowerCase()}`
          : `Custom ${row.original.currency ?? ''}`,
    },
    {
      id: 'prices',
      header: 'Prices',
      cell: ({ row }) => row.original.entries.length,
    },
    {
      id: 'customers',
      header: 'Customers',
      cell: ({ row }) => row.original._count.customers,
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
            href={`/price-lists/${row.original.id}`}
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
        data={lists}
        onRowClick={(list) => router.push(`/price-lists/${list.id}`)}
      />
    </div>
  )
}
