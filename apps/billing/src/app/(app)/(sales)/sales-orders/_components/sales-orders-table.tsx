'use client'

import type * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

export interface SalesOrderRow {
  id: string
  number: string
  customerName: string | null
  currency: string
  totalAmount: string
  status: string
  invoicingStatus: string
}
export function SalesOrdersTable({
  orders,
  emptyState,
}: {
  orders: SalesOrderRow[]
  emptyState?: React.ReactNode
}) {
  const router = useRouter()
  const columns: ColumnDef<SalesOrderRow, unknown>[] = [
    {
      id: 'order',
      accessorKey: 'number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/sales-orders/${row.original.id}`}
          className="font-medium text-sky-600 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.number}
        </Link>
      ),
    },
    {
      id: 'customer',
      accessorKey: 'customerName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => row.original.customerName ?? '—',
    },
    {
      id: 'total',
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) =>
        formatMoney(BigInt(row.original.totalAmount), row.original.currency),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={documentStatusVariant(row.original.status)}>
          <span className="capitalize">{row.original.status}</span>
        </Badge>
      ),
    },
    {
      id: 'invoice',
      header: 'Invoicing',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs capitalize">
          {row.original.invoicingStatus}
        </span>
      ),
    },
  ]
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={orders}
        onRowClick={(order) => router.push(`/sales-orders/${order.id}`)}
      />
    </div>
  )
}
