'use client'

import type { ColumnDef } from '@tanstack/react-table'
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

const columns: ColumnDef<DeliveryTableRow, unknown>[] = [
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => <span className="font-medium text-sky-600">{row.original.code}</span> },
  { accessorKey: 'area', header: 'Area' },
  { accessorKey: 'dateTime', header: 'Date & Time' },
  { accessorKey: 'packages', header: 'Packages' },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.6875rem] font-medium text-emerald-700">{row.original.status}</span> },
]

export function DeliveriesTable({ deliveries }: { deliveries: DeliveryTableRow[] }) {
  return <div className="876-card overflow-hidden"><DataTable columns={columns} data={deliveries} rowClassName="cursor-pointer" /></div>
}
