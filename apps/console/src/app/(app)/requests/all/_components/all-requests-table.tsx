'use client'

import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { CrossOrganizationRequest } from '@876/crm'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

import { formatDate } from '@/lib/format'

const columns: ColumnDef<CrossOrganizationRequest, unknown>[] = [
  {
    accessorKey: 'subject',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Request" />
    ),
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="block truncate font-medium">
          {row.original.subject}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          #{row.original.number}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'organizationId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.organizationId}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.createdAt)}
      </span>
    ),
  },
]

export function AllRequestsTable({
  data,
}: {
  data: CrossOrganizationRequest[]
}) {
  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={data} />
    </div>
  )
}
