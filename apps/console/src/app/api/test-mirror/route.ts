import type { SubscriptionStatus } from '@876/billing/admin'
import { apiSuccess } from '@876/core/api'
import { $876 } from '@/lib/876'
import { mirrorCoreProductPrices } from '@/lib/billing/mirror'

function billingStatusFromCore(status: string): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING'
    case 'paused':
    case 'blocked':
      return 'PAUSED'
    case 'canceled':
      return 'CANCELED'
    case 'incomplete':
    case 'incomplete_expired':
      return 'DRAFT'
    default:
      return 'ACTIVE'
  }
}

export async function GET() {
  const { data: subs } = await $876.subscriptions.list({ limit: 100 })
  const results: Array<{ id: string; logs: string[] }> = []

  for (const subscription of subs?.data || []) {
    const logs: string[] = []
    try {
      if (subscription.items.length === 0) {
        logs.push('no items')
        continue
      }

      const productIds = [
        ...new Set(
          subscription.items.flatMap((item) =>
            item.product_id ? [item.product_id] : []
          )
        ),
      ]
      if (productIds.length === 0) {
        logs.push('no productIds')
        continue
      }

      const orgPromise = $876.organizations.retrieve(
        subscription.organization_id
      )
      const productPromises = productIds.map((productId: string) =>
        $876.products.retrieve(productId)
      )
      const [org, productResults] = await Promise.all([
        orgPromise,
        Promise.all(productPromises),
      ])

      const referencedPriceIds = new Set(
        subscription.items.map((item) => item.price_id)
      )
      const catalogResults = await Promise.all(
        productResults.map(async (productResult) => {
          if (!productResult.data) {
            logs.push(
              'product retrieve failed: ' + productResult.error?.message
            )
            return false
          }
          const prices = productResult.data.prices.filter((price) =>
            referencedPriceIds.has(price.id)
          )
          if (prices.length === 0) {
            logs.push('no prices matched')
            return false
          }
          return await mirrorCoreProductPrices(productResult.data, prices)
        })
      )
      if (catalogResults.some((r) => !r)) {
        logs.push('catalog sync failed')
        results.push({ id: subscription.id, logs })
        continue
      }

      const customerName = org.data?.name ?? subscription.organization_id
      const ensuredCustomer = await $876.billing.customers.ensure({
        organizationId: subscription.organization_id,
        name: customerName,
      })
      if (ensuredCustomer.error !== null) {
        logs.push('customer ensure failed: ' + ensuredCustomer.error.message)
        results.push({ id: subscription.id, logs })
        continue
      }

      const ensuredSubscription = await $876.billing.subscriptions.ensure({
        externalReference: subscription.id,
        sourceAppId: subscription.app_id,
        customerId: ensuredCustomer.data.id,
        items: subscription.items.map((item) => ({
          priceEntitlementReferenceId: item.price_id,
          quantity: item.quantity,
        })),
        status: billingStatusFromCore(subscription.status),
        startAt: subscription.start_date ?? subscription.created_at,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      if (ensuredSubscription.error !== null) {
        logs.push(
          'subscription ensure failed: ' + ensuredSubscription.error.message
        )
      } else {
        logs.push('success')
      }
    } catch (error: unknown) {
      logs.push(
        `exception: ${error instanceof Error ? error.message : String(error)}`
      )
    }
    results.push({ id: subscription.id, logs })
  }
  return apiSuccess(results)
}
