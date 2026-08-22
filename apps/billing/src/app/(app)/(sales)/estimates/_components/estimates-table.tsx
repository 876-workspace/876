'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

type Props = {
  emptyState?: React.ReactNode
  estimates: EstimateRow[]
}

interface EstimateRow {
  id: string
  number: string
  totalAmount: bigint
  currency: string
  status: string
  customer: { name: string }
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function EstimatesTable({ estimates, emptyState }: Props) {
  const router = useRouter()
  const columns: ColumnDef<EstimateRow, unknown>[] = [
    {
      id: 'estimate',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estimate" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/estimates/${row.original.id}`}
          className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customer.name,
    },
    {
      id: 'total',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) =>
        formatMoney(row.original.totalAmount, row.original.currency),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={documentStatusVariant(row.original.status)}>
          <span className="capitalize">
            {row.original.status.toLowerCase().replace(/_/g, ' ')}
          </span>
        </Badge>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={estimates}
        onRowClick={(estimate) => router.push(`/estimates/${estimate.id}`)}
      />
    </div>
  )
}
