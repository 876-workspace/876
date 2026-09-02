'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { formatPriceCadence } from '@/lib/format'
import { ResourceRowLink } from '@876/ui/resource-row-link'

type Props = {
  emptyState?: React.ReactNode
  plans: PlanRow[]
}

export interface PlanRow {
  id: string
  name: string
  code: string
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  intervalCount: number
  trialDays: number
  isActive: boolean
  product: { name: string }
  prices: unknown[]
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function PlansTable({ plans, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<PlanRow, unknown>[] = [
    {
      id: 'plan',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Plan" />
      ),
      cell: ({ row }) => {
        const plan = row.original
        return (
          <>
            <Link
              href={`/plans/${plan.id}`}
              className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
              onClick={(event) => event.stopPropagation()}
            >
              {plan.name}
            </Link>
            <p className="text-muted-foreground mt-0.5 font-mono text-xs">
              {plan.code}
            </p>
          </>
        )
      },
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
      header: 'Cadence',
      cell: ({ row }) => {
        const plan = row.original
        return formatPriceCadence({
          priceType: 'RECURRING',
          intervalUnit: plan.intervalUnit,
          intervalCount: plan.intervalCount,
        })
      },
    },
    {
      id: 'trial',
      accessorKey: 'trialDays',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Trial" />
      ),
      cell: ({ row }) =>
        row.original.trialDays ? `${row.original.trialDays} days` : '—',
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
            href={`/plans/${row.original.id}`}
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
        data={plans}
        onRowClick={(plan) => router.push(`/plans/${plan.id}`)}
      />
    </div>
  )
}
