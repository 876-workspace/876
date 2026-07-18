import { CreditCardIcon } from '@876/ui/icons'
import Link from 'next/link'
import { buttonVariants } from '@876/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { SubscriptionsTable } from './subscriptions-table'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'
import type { SubscriptionStatus } from '@/types/subscription'

export const metadata = {
  title: 'Subscriptions',
  description: 'Subscription lifecycle records.',
}

const SUBSCRIPTION_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Subscriptions' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Subscriptions' },
  {
    value: 'trialing',
    label: 'Trialing',
    headingLabel: 'Trialing Subscriptions',
  },
  { value: 'active', label: 'Active', headingLabel: 'Active Subscriptions' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Subscriptions' },
  {
    value: 'canceled',
    label: 'Canceled',
    headingLabel: 'Canceled Subscriptions',
  },
  { value: 'ended', label: 'Ended', headingLabel: 'Ended Subscriptions' },
]

type Props = {
  searchParams: Promise<{
    status?: string
    view?: string
  }>
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const { status, view } = await searchParams
  const selectedStatus = [
    'draft',
    'trialing',
    'active',
    'paused',
    'canceled',
    'ended',
  ].includes(status ?? '')
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as SubscriptionStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const [subscriptions, views] = await Promise.all([
    service.subscriptions.list(
      context.tenant.id,
      { status: filterStatus, customViewId: view },
      context.userId
    ),
    service.subscriptions.views.list(context.tenant.id, context.userId),
  ])
  const rows = buildSubscriptionTableRows(subscriptions)
  const selectedView = views.find((savedView) => savedView.id === view)

  return (
    <Page>
      <ResourceToolbar
        title="Subscriptions"
        titleFilter={
          <StatusFilterHeading
            label="Subscriptions"
            value={selectedStatus}
            options={SUBSCRIPTION_STATUS_OPTIONS}
          />
        }
        primaryLabel={
          context.permissions.includes('subscriptions:write')
            ? 'Add'
            : undefined
        }
        primaryHref={
          context.permissions.includes('subscriptions:write')
            ? '/subscriptions/new'
            : undefined
        }
        primaryVariant="info"
        refresh
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/subscriptions"
          className={buttonVariants({
            variant: view ? 'outline' : 'secondary',
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
              variant: view === savedView.id ? 'secondary' : 'outline',
              size: 'sm',
            })}
          >
            {savedView.name}
          </Link>
        ))}
        {context.permissions.includes('subscriptions:write') ? (
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
            {selectedView?.ownerUserId === context.userId ? (
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
        defaultCurrency={context.tenant.defaultCurrency}
        visibleColumns={selectedView?.columns.map((column) => column.field)}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No subscriptions yet</EmptyTitle>
              <EmptyDescription>
                Add a recurring price, then create a subscription for a
                customer.
              </EmptyDescription>
            </EmptyHeader>
            {context.permissions.includes('subscriptions:write') ? (
              <EmptyContent>
                <Link
                  href="/subscriptions/new"
                  className={buttonVariants({ variant: 'info' })}
                >
                  Add subscription
                </Link>
              </EmptyContent>
            ) : null}
          </Empty>
        }
      />
    </Page>
  )
}
