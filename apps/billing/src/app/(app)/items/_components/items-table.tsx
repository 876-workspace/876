'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { ResourceSplitList } from '@876/ui/resource-split-list'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { ResourceRowLink } from '@/components/patterns/resource-row-link'
import { formatMoney } from '@/lib/format'

type Props = {
  emptyState?: React.ReactNode
  items: ItemRow[]
  defaultCurrency: string
}

interface ItemRow {
  id: string
  name: string
  type: string
  sku: string | null
  unit: string | null
  defaultSellingAmount: bigint | null
  defaultSellingCurrency: string | null
  isTaxable: boolean
  isActive: boolean
  prices: unknown[]
}

export function ItemsTable({ items, defaultCurrency, emptyState }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const visibleItems = items.filter((item) => {
    if (status === 'active') return item.isActive
    if (status === 'inactive') return !item.isActive
    return true
  })

  const columns: ColumnDef<ItemRow, unknown>[] = [
    {
      id: 'item',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Item" />
      ),
      cell: ({ row }) => {
        const item = row.original
        return (
          <>
            <Link
              href={`/items/${item.id}`}
              className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              onClick={(event) => event.stopPropagation()}
            >
              {item.name}
            </Link>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {item.type.toLowerCase()} · {item.sku ?? item.unit ?? 'No SKU'}
            </p>
          </>
        )
      },
    },
    {
      id: 'defaultPrice',
      accessorKey: 'defaultSellingAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Default price" />
      ),
      cell: ({ row }) => {
        const item = row.original
        return formatMoney(
          item.defaultSellingAmount,
          item.defaultSellingCurrency ?? defaultCurrency
        )
      },
    },
    {
      id: 'tax',
      accessorKey: 'isTaxable',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tax" />
      ),
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.isTaxable ? 'Taxable' : 'Non-taxable'}
        </span>
      ),
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
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.isActive ? 'Active' : 'Archived'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ResourceRowLink
            href={`/items/${row.original.id}`}
            resourceName={row.original.name}
          />
        </div>
      ),
    },
  ]

  const table = (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={visibleItems}
        className="text-[0.8125rem]"
        onRowClick={(item) => router.push(`/items/${item.id}`)}
      />
    </div>
  )

  return (
    <ResourceSplitList
      table={table}
      items={visibleItems.map((item) => ({
        id: item.id,
        href: `/items/${item.id}`,
        title: item.name,
        description: `${item.type.toLowerCase()} · ${item.sku ?? item.unit ?? 'No SKU'}`,
        meta: `${formatMoney(
          item.defaultSellingAmount,
          item.defaultSellingCurrency ?? defaultCurrency
        )} · ${item.isActive ? 'Active' : 'Archived'}`,
      }))}
    />
  )
}
