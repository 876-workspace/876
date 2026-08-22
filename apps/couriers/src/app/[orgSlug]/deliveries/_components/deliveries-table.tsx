'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { DataTable } from '@876/ui/data-table'

export type DeliveryTableRow = {
  id: string
  customerName: string
  code: string
  area: string
  dateTime: string
  packages: string
  status: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

const columns: ColumnDef<DeliveryTableRow, unknown>[] = [
  {
    accessorKey: 'customerName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: 'code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <span className="font-medium text-sky-600">{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'area',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Area" />
    ),
  },
  {
    accessorKey: 'dateTime',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date & Time" />
    ),
  },
  {
    accessorKey: 'packages',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Packages" />
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.6875rem] font-medium text-emerald-700">
        {row.original.status}
      </span>
    ),
  },
]

export function DeliveriesTable({
  deliveries,
}: {
  deliveries: DeliveryTableRow[]
}) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={deliveries}
        rowClassName="cursor-pointer"
      />
    </div>
  )
}
