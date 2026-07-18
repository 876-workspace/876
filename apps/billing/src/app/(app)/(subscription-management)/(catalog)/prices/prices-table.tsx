'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatMoney, formatPriceCadence } from '@/lib/format'
import { ResourceRowLink } from '@/components/resource-row-link'

type Props = {
  emptyState?: React.ReactNode
  prices: PriceRow[]
}

interface PriceRow {
  id: string
  unitAmount: bigint | null
  currency: string
  priceType: 'ONE_TIME' | 'RECURRING'
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  intervalCount: number | null
  pricingModel: string
  isActive: boolean
  item: { name: string } | null
  plan: { name: string; product: { name: string } } | null
  addon: { name: string; product: { name: string } } | null
}

export function PricesTable({ prices, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<PriceRow, unknown>[] = [
    {
      id: 'target',
      header: 'Catalog target',
      cell: ({ row }) => {
        const price = row.original
        return (
          <>
            <Link
              href={`/prices/${price.id}`}
              className="font-medium hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {price.item?.name ??
                price.plan?.name ??
                price.addon?.name ??
                'Unknown target'}
            </Link>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {price.item
                ? 'Item'
                : (price.plan?.product.name ?? price.addon?.product.name)}
            </p>
          </>
        )
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) =>
        formatMoney(row.original.unitAmount, row.original.currency),
    },
    {
      id: 'cadence',
      header: 'Cadence',
      cell: ({ row }) => formatPriceCadence(row.original),
    },
    {
      id: 'model',
      header: 'Model',
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.pricingModel.toLowerCase().replaceAll('_', ' ')}
        </span>
      ),
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
      cell: ({ row }) => {
        const name =
          row.original.item?.name ??
          row.original.plan?.name ??
          row.original.addon?.name ??
          'price'

        return (
          <div className="flex justify-end">
            <ResourceRowLink
              href={`/prices/${row.original.id}`}
              resourceName={name}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={prices}
        onRowClick={(price) => router.push(`/prices/${price.id}`)}
      />
    </div>
  )
}
