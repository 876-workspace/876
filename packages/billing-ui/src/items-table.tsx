'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { ResourceRowLink } from '@876/ui/resource-row-link'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatItemStock } from './item-stock'

/**
 * A catalog item as the finance plane serves it. `defaultSellingAmount` accepts
 * both shapes the hosts hold it in — Billing reads Prisma `BigInt` minor units,
 * Invoice reads the serialized decimal string — because narrowing it here would
 * force one host to convert on every row.
 */
export interface ItemRow {
  id: string
  name: string
  type: string
  sku: string | null
  unit: string | null
  defaultSellingAmount: bigint | string | null
  defaultSellingCurrency: string | null
  isTaxable: boolean
  trackStock: boolean
  stockQuantity: number | null
  lowStockThreshold: number | null
  allowOutOfStock: boolean
  isActive: boolean
  priceCount?: number
}

export interface ItemsTableProps {
  items: ItemRow[]
  defaultCurrency: string
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /**
   * Money formatting is host policy, not presentation: Billing renders a missing
   * amount as "Custom pricing" and Invoice as an em dash. Passing the formatter
   * keeps that difference where it belongs instead of adding a third formatter.
   */
  formatAmount: (amount: bigint | string | null, currency: string) => string
  emptyState?: ReactNode
  /** Billing sells items at several prices; Invoice does not model that yet. */
  showPriceCount?: boolean
}

export function ItemsTable({
  items,
  defaultCurrency,
  baseHref,
  formatAmount,
  emptyState,
  showPriceCount = false,
}: ItemsTableProps) {
  const router = useRouter()
  const hrefFor = (id: string) => `${baseHref}/${id}`

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
              href={hrefFor(item.id)}
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

        return formatAmount(
          item.defaultSellingAmount,
          item.defaultSellingCurrency ?? defaultCurrency
        )
      },
    },
    {
      id: 'stock',
      accessorKey: 'stockQuantity',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock" />
      ),
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">
          {formatItemStock(row.original)}
        </span>
      ),
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
    ...(showPriceCount
      ? [
          {
            id: 'prices',
            enableSorting: false,
            header: 'Prices',
            cell: ({ row }) => row.original.priceCount ?? 0,
          } satisfies ColumnDef<ItemRow, unknown>,
        ]
      : []),
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
            href={hrefFor(row.original.id)}
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
        className="text-[0.8125rem]"
        onRowClick={(item) => router.push(hrefFor(item.id))}
      />
    </div>
  )
}
