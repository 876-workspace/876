'use client'

import { formatDate } from '@876/core/timestamps'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ClipboardDocumentListIcon } from '@876/ui/icons'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type RequestRow = {
  id: string
  number: number
  subject: string
  customerId: string
  assigneeId: string | null
  status: string
  priority: string
  source: string
  createdAt: number
}

type Props = {
  requests: RequestRow[]
  requestsHref: string
}

export function RequestsTable({ requests, requestsHref }: Props) {
  const router = useRouter()

  const columns: ColumnDef<RequestRow, unknown>[] = [
    {
      accessorKey: 'subject',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Request" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`${requestsHref}/${row.original.id}`}
            className="block truncate font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.subject}
          </Link>
          <span className="text-muted-foreground text-xs tabular-nums">
            #{row.original.number} · {row.original.source.toLowerCase()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'customerId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.customerId}
        </span>
      ),
    },
    {
      accessorKey: 'assigneeId',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.assigneeId ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.status.toLowerCase().replaceAll('_', ' ')}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.priority.toLowerCase()}</Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={requests}
        emptyState={
          <Empty className="border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardDocumentListIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No requests</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
        onRowClick={(request) => router.push(`${requestsHref}/${request.id}`)}
      />
    </div>
  )
}
