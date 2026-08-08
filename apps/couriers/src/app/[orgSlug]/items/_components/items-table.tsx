'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@876/ui/data-table'

export type ItemTableRow = {
  id: string
  name: string
  imageUrl: string | null
  sku: string | null
  priceLabel: string
  description: string | null
}

type Props = {
  items: ItemTableRow[]
  emptyState?: ReactNode
}

const ITEM_LOGO_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function itemLogoColor(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index++)
    hash = (hash * 31 + name.charCodeAt(index)) | 0

  return ITEM_LOGO_COLORS[Math.abs(hash) % ITEM_LOGO_COLORS.length]!
}

const columns: ColumnDef<ItemTableRow, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {row.original.imageUrl ? (
          <img
            src={row.original.imageUrl}
            alt=""
            className="size-8 rounded-md object-cover"
          />
        ) : (
          <div
            className={`flex size-8 items-center justify-center rounded-md text-xs font-medium ${itemLogoColor(row.original.name)}`}
          >
            {row.original.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {row.original.name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.sku ?? '—'}
      </span>
    ),
  },
  {
    id: 'price',
    header: 'Price',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.original.priceLabel}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.description ?? '—'}
      </span>
    ),
  },
]

export function ItemsTable({ items, emptyState }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={items}
        emptyState={emptyState}
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
