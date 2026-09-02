'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { ResourceRowLink } from '@/components/patterns/resource-row-link'

export type PriceListRow = {
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

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function PriceListsTable({ lists }: { lists: PriceListRow[] }) {
  const router = useRouter()
  const columns: ColumnDef<PriceListRow, unknown>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price list" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/price-lists/${row.original.id}`}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: 'method',
      accessorKey: 'mode',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Method" />
      ),
      cell: ({ row }) =>
        row.original.mode === 'PERCENTAGE'
          ? `${row.original.percentage?.toString() ?? 0}% ${row.original.direction?.toLowerCase()}`
          : `Custom ${row.original.currency ?? ''}`,
    },
    {
      id: 'prices',
      enableSorting: false,
      header: 'Prices',
      cell: ({ row }) => row.original.entries.length,
    },
    {
      id: 'customers',
      enableSorting: false,
      header: 'Customers',
      cell: ({ row }) => row.original._count.customers,
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
