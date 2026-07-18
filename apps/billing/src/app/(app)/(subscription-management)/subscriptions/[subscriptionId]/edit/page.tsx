import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@876/ui/page'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { SubscriptionAmendmentForm } from '@/components/subscription-amendment-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Change subscription' }

export default async function ChangeSubscriptionPage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const [subscription, prices] = await Promise.all([
    resolveSubscription(context.tenant.id, subscriptionId),
    service.prices.list(context.tenant.id),
  ])
  if (!subscription) notFound()
  const recurring = prices.filter(
    (price) =>
      price.isActive &&
      price.priceType === 'RECURRING' &&
      price.unitAmount !== null &&
      price.intervalUnit !== null
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageBreadcrumb
        href={`/subscriptions/${subscriptionId}`}
        label="Subscription"
      />
      <SubscriptionAmendmentForm
        subscriptionId={subscriptionId}
        initialItems={subscription.items.map((item) => ({
          priceId: item.priceId,
          quantity: item.quantity,
        }))}
        prices={recurring.map((price) => ({
          value: price.id,
          label: `${price.plan?.name ?? price.addon?.name ?? price.item?.name ?? price.nickname ?? 'Price'} · ${price.currency}`,
        }))}
        initial={{
          collectionMethod: subscription.collectionMethod,
          billingTiming: subscription.billingTiming,
          taxBehavior: subscription.taxBehavior,
          invoiceModeOverride: subscription.invoiceModeOverride,
          renewalPricingPolicy: subscription.renewalPricingPolicy,
          renewalAdjustmentPercent:
            subscription.renewalAdjustmentPercent?.toString() ?? null,
          billingCycleAnchor: subscription.billingCycleAnchor,
          remainingCycles: subscription.remainingCycles,
        }}
      />
    </div>
  )
}
