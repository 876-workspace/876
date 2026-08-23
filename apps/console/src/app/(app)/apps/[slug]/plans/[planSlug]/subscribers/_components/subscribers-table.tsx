'use client'

import { useMemo } from 'react'
import { Users } from '@876/ui/icons'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@876/ui/empty'
import { cn } from '@876/core/utils'

import { formatMoney } from '@/lib/money'
import { formatDate, statusBadgeClass } from '@/lib/format'

type SubscriberItem = {
  id: string
  name: string
  email: string | null
  status: string
  startedAt: number | null
  mrr: number
}

function buildColumns(): ColumnDef<SubscriberItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground truncate text-[0.8125rem] font-medium">
            {row.original.name}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {row.original.email ?? '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
            statusBadgeClass(row.original.status)
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'startedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Started" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.startedAt === null
            ? '—'
            : formatDate(row.original.startedAt)}
        </span>
      ),
    },
    {
      accessorKey: 'mrr',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="MRR"
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <span className="block text-right font-mono text-[0.8125rem] tabular-nums">
          {formatMoney(row.original.mrr, 'usd')}
        </span>
      ),
    },
  ]
}

export function SubscribersTable({
  subscribers,
}: {
  subscribers: SubscriberItem[]
}) {
  const columns = useMemo(() => buildColumns(), [])

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={subscribers}
        emptyState={
          <Empty className="border-border/60 bg-muted/5 border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle className="text-foreground text-base font-semibold">
                No subscribers yet
              </EmptyTitle>
              <EmptyDescription className="text-muted-foreground/90 max-w-[360px] text-[0.8125rem] leading-relaxed">
                Organizations on this plan will appear here as soon as their
                subscriptions start.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
