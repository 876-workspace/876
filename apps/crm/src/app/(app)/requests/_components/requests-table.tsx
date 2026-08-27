'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@876/core/timestamps'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { ClipboardDocumentListIcon } from '@876/ui/icons'
import { CategoryIcon } from '@876/ui/category-icons'
import { categoryColorClass } from '@/features/categories/category-color'
import type { RequestPriority, RequestSource, RequestStatus } from '@/types/crm'

import { formatAge, formatSource } from '../_lib/request-format'

import { RequestPriorityBadge } from './request-priority-badge'
import { RequestSourceIcon } from './request-source-icon'
import { RequestStatusBadge } from './request-status-badge'

export type CrmRequestRow = {
  id: string
  number: number
  subject: string
  customerId: string
  customerName: string
  teamId: string | null
  teamName: string | null
  assigneeId: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  /**
   * The category's display name, resolved from the org's catalog by the page.
   * A request may have none — the column is optional at the database level —
   * and a category that has since been archived still resolves, because the
   * page maps every category it loads rather than only the active ones.
   */
  categoryName: string | null
  /** The category's icon key, narrowed by `CategoryIcon` at render time. */
  categoryIcon: string | null
  categoryColor: string | null
  status: RequestStatus
  priority: RequestPriority
  source: RequestSource
  createdAt: number
}

interface Props {
  requests: CrmRequestRow[]
  /** Rendered inside the table card, above the header row. */
  filterBar?: React.ReactNode
}

const emptyState = (
  <Empty className="py-16">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ClipboardDocumentListIcon aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>No requests match these filters</EmptyTitle>
    </EmptyHeader>
    <EmptyContent>
      <Link
        href="/requests/new"
        className={buttonVariants({ variant: 'info', size: 'sm' })}
      >
        Add
      </Link>
    </EmptyContent>
  </Empty>
)

/**
 * The row's left edge carries priority as color. It reads at a glance across a
 * long queue, which a badge halfway down the row cannot do, and it costs no
 * horizontal space — so the priority badge keeps its own column for the exact
 * value.
 */
const PRIORITY_ACCENT: Record<RequestPriority, string> = {
  URGENT: 'border-l-destructive',
  HIGH: 'border-l-amber-500 dark:border-l-amber-400',
  NORMAL: 'border-l-transparent',
  LOW: 'border-l-transparent',
}

export function RequestsTable({ requests, filterBar }: Props) {
  const router = useRouter()

  const columns: ColumnDef<CrmRequestRow, unknown>[] = [
    {
      accessorKey: 'subject',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Request" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[420px] min-w-0 py-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground shrink-0 font-mono text-xs font-semibold tabular-nums">
              #{row.original.number}
            </span>
            <Link
              href={`/requests/${row.original.id}`}
              className="truncate font-medium hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.subject}
            </Link>
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
            <RequestSourceIcon
              source={row.original.source}
              className="size-3 shrink-0"
            />
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              {formatSource(row.original.source)}
              {row.original.categoryName ? (
                <>
                  <span aria-hidden="true">·</span>
                  <CategoryIcon
                    name={row.original.categoryIcon}
                    className={`size-3 shrink-0 ${categoryColorClass(row.original.categoryColor)}`}
                  />
                  <span className="truncate">{row.original.categoryName}</span>
                </>
              ) : null}
            </span>
          </div>
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
          className="text-foreground inline-flex min-w-0 items-center gap-2 font-medium transition-colors hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <CustomerAvatar name={row.original.customerName} />
          <span className="truncate">{row.original.customerName}</span>
        </Link>
      ),
    },
    {
      accessorKey: 'assigneeName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Assignee" />
      ),
      cell: ({ row }) =>
        row.original.assigneeName ? (
          <span className="inline-flex min-w-0 items-center gap-2">
            <CustomerAvatar
              name={row.original.assigneeName}
              src={row.original.assigneeAvatar}
            />
            <span className="truncate text-sm">
              {row.original.assigneeName}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Unassigned</span>
        ),
    },
    {
      accessorKey: 'teamName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) =>
        row.original.teamName ? (
          <Badge variant="secondary" className="font-normal">
            {row.original.teamName}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
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
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Age" />
      ),
      cell: ({ row }) => (
        <span
          className="text-muted-foreground text-sm whitespace-nowrap tabular-nums"
          title={formatDate(row.original.createdAt)}
          suppressHydrationWarning
        >
          {formatAge(row.original.createdAt)}
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
        rowClassName={(request) =>
          cn('border-l-2', PRIORITY_ACCENT[request.priority])
        }
        toolbar={
          filterBar ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              {filterBar}
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {requests.length}{' '}
                {requests.length === 1 ? 'request' : 'requests'}
              </span>
            </div>
          ) : undefined
        }
        onRowClick={(request) => router.push(`/requests/${request.id}`)}
      />
    </div>
  )
}
