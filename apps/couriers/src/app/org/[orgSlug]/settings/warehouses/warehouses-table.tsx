'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { DataTable } from '@876/ui/data-table'

import { formatAddressLine } from '@/lib/address/format'
import type { WarehouseView } from '@/types/warehouse'

type Props = {
  warehouses: WarehouseView[]
  orgSlug: string
  emptyState?: React.ReactNode
}

type WarehouseTableRow = WarehouseView & { orgSlug: string }

const columns: ColumnDef<WarehouseTableRow, unknown>[] = [
  {
    id: 'warehouse',
    header: 'Warehouse',
    cell: ({ row }) => <span>{row.original.name}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    // Inactive wins over primary: a retired warehouse that still holds the
    // primary flag must not read as the live one.
    cell: ({ row }) =>
      !row.original.isActive ? (
        <Badge variant="secondary">Inactive</Badge>
      ) : row.original.isPrimary ? (
        <Badge>Primary</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'address',
    header: 'Address',
    cell: ({ row }) => <span>{formatAddressLine(row.original.address)}</span>,
  },
  {
    id: 'country',
    header: 'Country',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.address.countryCode}
      </span>
    ),
  },
  {
    id: 'edit',
    header: () => null,
    cell: ({ row }) => (
      <Button
        variant="outline"
        size="sm"
        render={
          <Link
            href={`/org/${row.original.orgSlug}/settings/warehouses/${row.original.id}/edit`}
          />
        }
      >
        Edit
      </Button>
    ),
  },
]

export function WarehousesTable({ warehouses, orgSlug, emptyState }: Props) {
  const rows: WarehouseTableRow[] = warehouses.map((warehouse) => ({
    ...warehouse,
    orgSlug,
  }))

  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={rows} emptyState={emptyState} />
    </div>
  )
}
