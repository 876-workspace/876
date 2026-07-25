'use client'

import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@876/ui/data-table'

import { SoftBadge } from '@/components/soft-badge'

export type ItemTableRow = {
  id: string
  name: string
  subtitle: string
  type: 'SERVICE' | 'GOOD' | string
  origin: string
  priceLabel: string
}

type Props = {
  items: ItemTableRow[]
  emptyState?: ReactNode
}

const columns: ColumnDef<ItemTableRow, unknown>[] = [
  {
    id: 'item',
    header: 'Item',
    cell: ({ row }) => (
      <>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-muted-foreground text-xs">
          {row.original.subtitle}
        </div>
      </>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) =>
      row.original.type === 'SERVICE' ? (
        <SoftBadge tone="sky">Service</SoftBadge>
      ) : (
        <SoftBadge tone="purple">Good</SoftBadge>
      ),
  },
  {
    id: 'origin',
    header: 'Origin',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.origin}
      </span>
    ),
  },
  {
    id: 'price',
    header: () => <div className="text-right">Default price</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {row.original.priceLabel}
      </div>
    ),
  },
]

export function ItemsTable({ items, emptyState }: Props) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={items} emptyState={emptyState} />
    </div>
  )
}
