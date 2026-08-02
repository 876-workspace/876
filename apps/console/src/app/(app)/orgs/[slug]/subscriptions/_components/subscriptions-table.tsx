'use client'

import { useMemo } from 'react'
import type { AdminSubscription } from '@876/admin'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatDate, statusBadgeClass } from '@/lib/format'
import { cn } from '@876/core/utils'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCard } from '@876/ui/icons'

type Props = {
  subscriptions: AdminSubscription[]
}

function resolvePlanName(sub: AdminSubscription): string {
  const firstItem = sub.items?.[0]
  if (firstItem?.product_name) return firstItem.product_name
  if (firstItem?.product_slug) return firstItem.product_slug
  return sub.app_slug || sub.app_id
}

function resolveAppSlug(sub: AdminSubscription): string {
  return sub.app_slug || sub.app_id
}

const columns: ColumnDef<AdminSubscription, unknown>[] = [
  {
    id: 'plan',
    header: 'Plan',
    cell: ({ row }) => {
      const sub = row.original
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{resolvePlanName(sub)}</span>
          <span className="text-muted-foreground/70 text-xs">
            {resolveAppSlug(sub)}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
          statusBadgeClass(row.original.status)
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'collection_method',
    header: 'Collection Method',
    cell: ({ row }) => (
      <span className="capitalize">
        {row.original.collection_method.replace('_', ' ')}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

export function SubscriptionsTable({ subscriptions }: Props) {
  const data = useMemo(() => subscriptions, [subscriptions])

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={data}
        className="min-w-[48rem]"
        emptyState={<SubscriptionsEmptyState />}
      />
    </div>
  )
}

function SubscriptionsEmptyState() {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCard aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No subscriptions.</EmptyTitle>
        <EmptyDescription>
          This organization does not have any active subscriptions.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
