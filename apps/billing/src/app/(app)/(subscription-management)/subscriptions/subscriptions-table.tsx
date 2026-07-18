'use client'

import * as React from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DataTable } from '@876/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'

import { formatMoney, formatPriceCadence } from '@/lib/format'
import { SubscriptionStatusBadge } from '@/components/subscription-status-badge'
import { ResourceRowLink } from '@/components/resource-row-link'
import type { SubscriptionTableRow } from '@/types/subscription'

interface Props {
  emptyState?: React.ReactNode
  subscriptions: SubscriptionTableRow[]
  defaultCurrency: string
  showCustomer?: boolean
  visibleColumns?: string[]
}

export function SubscriptionsTable({
  subscriptions,
  defaultCurrency,
  showCustomer = true,
  visibleColumns,
  emptyState,
}: Props) {
  const router = useRouter()
  const shows = (column: string) =>
    visibleColumns === undefined || visibleColumns.includes(column)
  const columns: ColumnDef<SubscriptionTableRow, unknown>[] = [
    ...(showCustomer && shows('customer')
      ? [
          {
            accessorKey: 'customer.name',
            header: 'Customer',
            cell: ({ row }) => (
              <div>
                <Link
                  href={`/customers/${row.original.customer.id}`}
                  className="font-medium hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {row.original.customer.name}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {customerTypeLabel(row.original.customer.type)}
                </p>
              </div>
            ),
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    ...(shows('offering')
      ? [
          {
            accessorKey: 'offering.productName',
            header: 'Product & plan',
            cell: ({ row }) => (
              <div>
                <Link
                  href={`/subscriptions/${row.original.id}`}
                  className="font-medium hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {row.original.offering.productName}
                </Link>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {row.original.offering.planName ?? 'Custom price'}
                  {row.original.offering.additionalItems > 0
                    ? ` +${row.original.offering.additionalItems} more`
                    : ''}
                </p>
              </div>
            ),
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    ...(shows('amount')
      ? [
          {
            id: 'amount',
            header: 'Recurring amount',
            cell: ({ row }) => {
              const currency = row.original.currency ?? defaultCurrency

              return (
                <div>
                  <p className="font-medium">
                    {formatMoney(row.original.amount, currency)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatPriceCadence({
                      priceType: 'RECURRING',
                      intervalUnit: row.original.intervalUnit,
                      intervalCount: row.original.intervalCount,
                    })}
                  </p>
                </div>
              )
            },
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    ...(shows('status')
      ? [
          {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
              <SubscriptionStatusBadge status={row.original.status} />
            ),
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    ...(shows('billingDate')
      ? [
          {
            accessorKey: 'nextBillingAt',
            header: 'Renews / ends',
            cell: ({ row }) => (
              <span className="text-muted-foreground text-xs">
                {row.original.nextBillingAt
                  ? new Date(
                      row.original.nextBillingAt * 1000
                    ).toLocaleDateString('en-JM')
                  : 'Not scheduled'}
              </span>
            ),
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    ...(shows('createdAt')
      ? [
          {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => (
              <span className="text-muted-foreground text-xs">
                {new Date(row.original.createdAt * 1000).toLocaleDateString(
                  'en-JM'
                )}
              </span>
            ),
          } satisfies ColumnDef<SubscriptionTableRow, unknown>,
        ]
      : []),
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ResourceRowLink
            href={`/subscriptions/${row.original.id}`}
            label="Manage"
            resourceName={row.original.offering.productName}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        emptyState={emptyState}
        columns={columns}
        data={subscriptions}
        onRowClick={(subscription) =>
          router.push(`/subscriptions/${subscription.id}`)
        }
      />
    </div>
  )
}

function customerTypeLabel(type: SubscriptionTableRow['customer']['type']) {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}
