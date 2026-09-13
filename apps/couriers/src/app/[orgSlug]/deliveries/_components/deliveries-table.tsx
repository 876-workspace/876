'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

export type DeliveryTableRow = {
  id: string
  customerName: string
  code: string
  area: string
  dateTime: string
  packages: string
  status: string
  orgSlug?: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function deliveryStatusVariant(
  status: string
): 'success' | 'destructive' | 'secondary' {
  if (status === 'delivered') return 'success'
  if (status === 'failed') return 'destructive'
  return 'secondary'
}

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
      <Link
        href={`/${row.original.orgSlug}/deliveries/${row.original.id}`}
        className="font-medium text-sky-600 dark:text-sky-400"
      >
        {row.original.code}
      </Link>
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
      <Badge variant={deliveryStatusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
]

export function DeliveriesTable({
  deliveries,
  orgSlug,
}: {
  deliveries: DeliveryTableRow[]
  orgSlug: string
}) {
  const router = useRouter()
  const hrefFor = (id: string) => `/${orgSlug}/deliveries/${id}`

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={deliveries.map((delivery) => ({ ...delivery, orgSlug }))}
        rowClassName="cursor-pointer"
        onRowClick={(delivery) => router.push(hrefFor(delivery.id))}
      />
    </div>
  )
}
