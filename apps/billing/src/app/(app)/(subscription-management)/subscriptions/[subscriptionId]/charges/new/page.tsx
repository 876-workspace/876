import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@876/ui/page'

import { resolveSubscription } from '@/app/(app)/detail-data'
import { SubscriptionChargeForm } from '@/components/subscription-charge-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Add subscription charge' }

export default async function NewSubscriptionChargePage({
  params,
}: {
  params: Promise<{ subscriptionId: string }>
}) {
  const { subscriptionId } = await params
  const context = await requirePagePermission('subscriptions:write')
  const subscription = await resolveSubscription(
    context.tenant.id,
    subscriptionId
  )
  if (!subscription) notFound()
  const plan = subscription.items.find((item) => item.price.plan)?.price.plan
  const [addons, currencies] = await Promise.all([
    service.addons.list(context.tenant.id, true, plan?.productId),
    service.currencies.list(context.tenant.id),
  ])
  const currency =
    subscription.items.find((item) => item.currency)?.currency ??
    context.tenant.defaultCurrency
  const decimalPlaces =
    currencies.find((entry) => entry.currency.code === currency)?.currency
      .decimalPlaces ?? 2
  const oneTime = addons.flatMap((addon) =>
    addon.planAssociations.some(
      (association) => association.isActive && association.planId === plan?.id
    )
      ? addon.prices.filter(
          (price) =>
            price.isActive &&
            price.priceType === 'ONE_TIME' &&
            price.unitAmount !== null &&
            price.currency === currency
        )
      : []
  )
  const addonById = new Map(addons.map((addon) => [addon.id, addon]))

  return (
    <div className="space-y-5">
      <PageBreadcrumb
        href={`/subscriptions/${subscriptionId}/billing`}
        label="Subscription billing"
      />
      <SubscriptionChargeForm
        subscriptionId={subscriptionId}
        currency={currency}
        decimalPlaces={decimalPlaces}
        taxBehavior={subscription.taxBehavior}
        prices={oneTime.map((price) => ({
          id: price.id,
          addonId: price.addonId,
          label: `${addonById.get(price.addonId ?? '')?.name ?? price.nickname ?? 'One-time add-on'} · ${currency}`,
          unitAmount: price.unitAmount!.toString(),
          description:
            addonById.get(price.addonId ?? '')?.name ??
            price.nickname ??
            'One-time charge',
          isTaxable: addonById.get(price.addonId ?? '')?.isTaxable ?? true,
        }))}
      />
    </div>
  )
}
