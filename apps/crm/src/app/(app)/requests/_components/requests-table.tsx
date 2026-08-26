'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@876/core/timestamps'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import type {
  RequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '@/types/crm'

import { RequestPriorityBadge } from './request-priority-badge'
import { RequestStatusBadge } from './request-status-badge'

export type CrmRequestRow = {
  id: string
  number: number
  subject: string
  customerId: string
  customerName: string
  category: RequestCategory
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  createdAt: number
}

interface Props {
  requests: CrmRequestRow[]
}

const emptyState = (
  <Empty className="py-14">
    <EmptyHeader>
      <EmptyTitle>No requests yet</EmptyTitle>
    </EmptyHeader>
  </Empty>
)

function formatCategory(category: RequestCategory): string {
  switch (category) {
    case 'GENERAL':
      return 'General'
    case 'SUPPORT':
      return 'Support'
    case 'BILLING':
      return 'Billing'
    case 'SALES':
      return 'Sales'
    case 'COMPLAINT':
      return 'Complaint'
    case 'FEEDBACK':
      return 'Feedback'
    default:
      return category.replaceAll('_', ' ')
  }
}

export function RequestsTable({ requests }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CrmRequestRow, unknown>[] = [
    {
      accessorKey: 'subject',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Request" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs font-semibold">
            #{row.original.number}
          </span>
          <Link
            href={`/requests/${row.original.id}`}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.subject}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'customerName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.customerId}`}
          className="text-foreground hover:text-sky-600 font-medium transition-colors hover:underline dark:hover:text-sky-400"
          onClick={(event) => event.stopPropagation()}
        >
          {row.original.customerName}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <RequestStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Priority" />
      ),
      cell: ({ row }) => (
        <RequestPriorityBadge priority={row.original.priority} />
      ),
    },
    {
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs font-normal">
          {formatCategory(row.original.category)}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
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
        emptyState={emptyState}
        onRowClick={(request) => router.push(`/requests/${request.id}`)}
      />
    </div>
  )
}
