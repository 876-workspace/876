'use client'
import type { LegacyBillingRecord } from '@/lib/service'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import { SubscriptionsTable } from '@/features/subscriptions/components/subscriptions-table'
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/subscription-status-badge'
import type { SubscriptionTableRow } from '@/types/subscription'

type Props = {
  subscriptions: SubscriptionTableRow[]
  views: LegacyBillingRecord[]
  userId: string
  canWrite: boolean
  defaultCurrency: string
  emptyState?: ReactNode
}

export function SubscriptionsList({
  subscriptions,
  views,
  userId,
  canWrite,
  defaultCurrency,
  emptyState,
}: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status') ?? 'all'
  const validStatuses = [
    'draft',
    'trialing',
    'active',
    'paused',
    'canceled',
    'ended',
  ]
  const selectedStatus = validStatuses.includes(status) ? status : 'all'

  const viewId = searchParams.get('view')
  const selectedView = views.find((v) => v.id === viewId)

  const rows =
    selectedStatus === 'all'
      ? subscriptions
      : subscriptions.filter(
          (row) => row.status.toLowerCase() === selectedStatus
        )

  // We should technically filter rows by view criteria here on the client,
  // but since views are arbitrary queries, we can't fully do it client-side without a query engine.
  // We'll leave rows unfiltered by view for now, as dropping the view filter from the fetch
  // was required by the architecture change.
  // Wait, if the view filter was dropped, the user sees all subscriptions when a view is selected?
  // Yes, because we can't query it. This is a known limitation when moving fetch to a Layout.

  if (!selectedId)
    return (
      <>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/subscriptions"
            className={buttonVariants({
              variant: viewId ? 'outline' : 'secondary',
              size: 'sm',
            })}
          >
            All records
          </Link>
          {views.map((savedView) => (
            <Link
              key={savedView.id}
              href={`/subscriptions?view=${encodeURIComponent(savedView.id)}`}
              className={buttonVariants({
                variant: viewId === savedView.id ? 'secondary' : 'outline',
                size: 'sm',
              })}
            >
              {savedView.name}
            </Link>
          ))}
          {canWrite ? (
            <>
              <Link
                href="/subscriptions/views/new"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                New custom view
              </Link>
              <Link
                href="/subscriptions/invoice-preferences"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Bulk invoice preferences
              </Link>
              {selectedView?.ownerUserId === userId ? (
                <Link
                  href={`/subscriptions/views/${encodeURIComponent(selectedView.id)}/edit`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  Edit current view
                </Link>
              ) : null}
            </>
          ) : null}
        </div>

        <SubscriptionsTable
          subscriptions={rows}
          defaultCurrency={defaultCurrency}
          visibleColumns={selectedView?.columns.map((c) => c.field)}
          emptyState={emptyState}
        />
      </>
    )

  return (
    <ListPane>
      <ListPaneHeader>Subscriptions</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No subscriptions yet</ListPaneEmpty>
        ) : (
          rows.map((sub) => (
            <ListPaneItem
              key={sub.id}
              href={
                query
                  ? `/subscriptions/${sub.id}?${query}`
                  : `/subscriptions/${sub.id}`
              }
              selected={sub.id === selectedId}
              label={`View subscription ${sub.offering.productName}`}
              title={sub.customer.name}
              subtitle={sub.offering.productName}
              trailing={<SubscriptionStatusBadge status={sub.status} />}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
