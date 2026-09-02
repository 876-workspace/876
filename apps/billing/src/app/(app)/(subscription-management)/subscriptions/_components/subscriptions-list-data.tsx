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

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'
import { SubscriptionsList } from './subscriptions-list'

export async function SubscriptionsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const [subscriptions, views] = await Promise.all([
    service.subscriptions.list(
      context.tenant.id,
      { status: undefined, customViewId: undefined },
      context.userId
    ),
    service.subscriptions.views.list(context.tenant.id, context.userId),
  ])

  const rows = buildSubscriptionTableRows(subscriptions)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SubscriptionsList
        subscriptions={rows}
        views={views}
        userId={context.userId}
        canWrite={context.permissions.includes('subscriptions:write')}
        defaultCurrency={context.tenant.defaultCurrency}
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
    </div>
  )
}
