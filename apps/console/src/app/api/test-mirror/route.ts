import { apiSuccess } from '@876/core/api'
import { $876 } from '@/lib/876'
import { $billing } from '@/lib/billing'
import { mirrorCoreProductPrices } from '@/lib/billing/mirror'

const INTERVAL_BY_CORE: Record<string, 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
  year: 'YEAR',
}

function billingStatusFromCore(status: string): any {
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
  const results = []

  for (const subscription of subs?.data || []) {
    let logs: string[] = []
    try {
      if (subscription.items.length === 0) {
        logs.push('no items')
        continue
      }

      const productIds = [
        ...new Set(
          subscription.items.flatMap((item: any) =>
            item.product_id ? [item.product_id] : []
          )
        ),
      ]
      if (productIds.length === 0) {
        logs.push('no productIds')
        continue
      }

      const orgPromise = $876.orgs.retrieve(subscription.organization_id)
      const productPromises = productIds.map((productId: string) =>
        $876.products.retrieve(productId)
      )
      const [org, productResults] = await Promise.all([
        orgPromise,
        Promise.all(productPromises),
      ])

      const referencedPriceIds = new Set(
        subscription.items.map((item: any) => item.price_id)
      )
      const catalogResults = await Promise.all(
        productResults.map(async (productResult: any) => {
          if (!productResult.data) {
            logs.push(
              'product retrieve failed: ' + productResult.error?.message
            )
            return false
          }
          const prices = productResult.data.prices.filter((price: any) =>
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
      const ensuredCustomer = await $billing.customers.ensure({
        organizationId: subscription.organization_id,
        name: customerName,
      })
      if (ensuredCustomer.error !== null) {
        logs.push('customer ensure failed: ' + ensuredCustomer.error.message)
        results.push({ id: subscription.id, logs })
        continue
      }

      const ensuredSubscription = await $billing.subscriptions.ensure({
        externalReference: subscription.id,
        sourceAppId: subscription.app_id,
        customerId: ensuredCustomer.data.id,
        items: subscription.items.map((item: any) => ({
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
    } catch (e: any) {
      logs.push('exception: ' + e.message)
    }
    results.push({ id: subscription.id, logs })
  }
  return apiSuccess(results)
}
