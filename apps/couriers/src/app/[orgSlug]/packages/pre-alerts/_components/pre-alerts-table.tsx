'use client'

import type { ReactNode } from 'react'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

export type PreAlertTableRow = {
  id: string
  reference: string
  customer: string
  status: string
  orgSlug?: string
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

export function preAlertStatusVariant(status: string): 'success' | 'secondary' {
  return status === 'received' ? 'success' : 'secondary'
}

const columns: ColumnDef<PreAlertTableRow, unknown>[] = [
  {
    accessorKey: 'reference',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reference" />
    ),
    cell: ({ row }) => (
      <Link
        href={`/${row.original.orgSlug}/packages/pre-alerts/${row.original.id}`}
        className="font-medium text-sky-600 dark:text-sky-400"
      >
        {row.original.reference}
      </Link>
    ),
  },
  {
    accessorKey: 'customer',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={preAlertStatusVariant(row.original.status)}>
        {row.original.status}
      </Badge>
    ),
  },
]

export function PreAlertsTable({
  preAlerts,
  orgSlug,
  emptyState,
}: {
  preAlerts: PreAlertTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}) {
  const router = useRouter()
  const hrefFor = (id: string) => `/${orgSlug}/packages/pre-alerts/${id}`

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={preAlerts.map((preAlert) => ({ ...preAlert, orgSlug }))}
        rowClassName="cursor-pointer"
        onRowClick={(preAlert) => router.push(hrefFor(preAlert.id))}
        emptyState={emptyState}
      />
    </div>
  )
}
