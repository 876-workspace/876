import type { SubscriptionTableRow } from '@/types/subscription'

type SubscriptionRecord = Awaited<
  ReturnType<
    (typeof import('@/lib/service'))['service']['subscriptions']['list']
  >
>[number]

/** Builds the compact, JSON-safe rows used by customer and subscription views. */
export function buildSubscriptionTableRows(
  subscriptions: SubscriptionRecord[]
): SubscriptionTableRow[] {
  return subscriptions.map((subscription) => {
    const firstItem = subscription.items[0]
    const hasCompleteAmount = subscription.items.every(
      (item) => item.unitAmount !== null
    )
    const amount = hasCompleteAmount
      ? subscription.items.reduce(
          (total, item) =>
            total + (item.unitAmount ?? 0n) * BigInt(item.quantity),
          0n
        )
      : null

    return {
      id: subscription.id,
      externalReference: subscription.externalReference,
      customer: {
        id: subscription.customer.id,
        name: subscription.customer.name,
        type: subscription.customer.customerType,
      },
      offering: {
        productName:
          firstItem?.price.plan?.product.name ??
          firstItem?.price.item?.name ??
          'Custom subscription',
        planName: firstItem?.price.plan?.name ?? null,
        additionalItems: Math.max(0, subscription.items.length - 1),
      },
      amount: amount?.toString() ?? null,
      currency: firstItem?.currency ?? null,
      intervalUnit: firstItem?.price.intervalUnit ?? null,
      intervalCount: firstItem?.price.intervalCount ?? null,
      status: subscription.status,
      nextBillingAt: subscription.nextBillingAt,
      createdAt: subscription.createdAt,
    }
  })
}
