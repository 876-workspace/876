'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatMoney } from '@/lib/format'
import { ResourceRowLink } from '@/components/resource-row-link'

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
  const columns: ColumnDef<ItemRow, unknown>[] = [
    {
      id: 'item',
      header: 'Item',
      cell: ({ row }) => {
        const item = row.original
        return (
          <>
            <Link
              href={`/items/${item.id}`}
              className="font-medium hover:underline"
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
      header: 'Default price',
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
      header: 'Tax',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.isTaxable ? 'Taxable' : 'Non-taxable'}
        </span>
      ),
    },
    {
      id: 'prices',
      header: 'Prices',
      cell: ({ row }) => row.original.prices.length,
    },
    {
      id: 'status',
      header: 'Status',
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

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={items}
        onRowClick={(item) => router.push(`/items/${item.id}`)}
      />
    </div>
  )
}
