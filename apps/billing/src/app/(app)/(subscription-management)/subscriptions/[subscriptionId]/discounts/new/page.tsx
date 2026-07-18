import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@876/ui/page'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { SubscriptionDiscountForm } from '@/components/subscription-discount-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Apply subscription discount' }

export default async function NewSubscriptionDiscountPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const [subscription, currencies] = await Promise.all([
    resolveSubscription(context.tenant.id, subscriptionId),
    service.currencies.list(context.tenant.id),
  ])
  if (!subscription) notFound()
  const currency =
    subscription.items.find((item) => item.currency)?.currency ??
    context.tenant.defaultCurrency
  const decimalPlaces =
    currencies.find((entry) => entry.currency.code === currency)?.currency
      .decimalPlaces ?? 2

  return (
    <div className="space-y-5">
      <PageBreadcrumb
        href={`/subscriptions/${subscriptionId}/billing`}
        label="Subscription billing"
      />
      <SubscriptionDiscountForm
        subscriptionId={subscriptionId}
        currency={currency}
        decimalPlaces={decimalPlaces}
        items={subscription.items.map((item) => ({
          id: item.id,
          label:
            item.description ??
            item.price.plan?.name ??
            item.price.item?.name ??
            item.price.nickname ??
            item.id,
        }))}
      />
    </div>
  )
}
