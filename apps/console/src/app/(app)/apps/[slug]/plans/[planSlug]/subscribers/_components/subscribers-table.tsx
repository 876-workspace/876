'use client'

import { useMemo } from 'react'
import { Users, Plus } from '@876/ui/icons'
import type { ColumnDef } from '@tanstack/react-table'

import { Button } from '@876/ui/button'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@876/ui/empty'
import { formatDate } from '@/lib/format'

type SubscriberItem = {
  id: string
  name: string
  email: string
  status: string
  startedAt: number | null
  mrr: number
}

const formatMoney = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function buildColumns(): ColumnDef<SubscriberItem>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => {
        const sub = row.original
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground text-sm font-medium">
              {sub.name}
            </span>
            <span className="text-muted-foreground text-xs">{sub.email}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge className="border-0 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-500 hover:bg-emerald-500/10">
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-xs">
            {row.original.startedAt === null
              ? '—'
              : formatDate(row.original.startedAt)}
          </span>
        )
      },
    },
    {
      accessorKey: 'mrr',
      header: 'MRR',
      cell: ({ row }) => {
        return (
          <span className="text-foreground font-mono text-sm tabular-nums">
            {formatMoney(row.original.mrr)}
          </span>
        )
      },
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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="info"
          size="sm"
          className="h-8 gap-1.5 px-2.5 text-xs"
          disabled
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add subscriber
        </Button>
      </div>
      <div className="876-card">
        <DataTable
          columns={columns}
          data={subscribers}
          emptyState={
            <div className="p-6">
              <Empty className="border-border/60 bg-muted/5 border-dashed py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="text-cyan-600 dark:text-cyan-400" />
                  </EmptyMedia>
                  <EmptyTitle className="text-foreground text-base font-semibold">
                    No recent subscriptions
                  </EmptyTitle>
                  <EmptyDescription className="text-muted-foreground/90 max-w-[360px] text-sm leading-relaxed">
                    Subscriptions for this plan will appear here once customers
                    subscribe.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      disabled
                    >
                      View all subscribers
                    </Button>
                    <Button size="sm" className="h-8 text-xs" disabled>
                      Create test subscription
                    </Button>
                  </div>
                </EmptyContent>
              </Empty>
            </div>
          }
        />
      </div>
    </div>
  )
}
