import 'server-only'

import type {
  AdminOrganization,
  AdminPrice,
  AdminProduct,
  AdminSubscription,
  AdminSubscriptionStatus,
} from '@876/admin'
import type { CustomerEnsureParams } from '@876/billing/admin'
import type { IntervalUnit, SubscriptionStatus } from '@876/billing/admin'

import { $876 } from '@/lib/876'

/**
 * One-way Console -> Billing mirror. Core stays the entitlement source of
 * truth; these helpers project catalog and subscription writes into 876
 * Billing's commercial records. Every Billing call is idempotent on an
 * opaque reference key, so a failed mirror is repaired by retrying (or by
 * the backfill script) — mirror failures are logged, never thrown, and must
 * never fail the core write that triggered them.
 */

/**
 * Resolves the person Billing should attach to an organization customer.
 *
 * Order: the organization's declared primary contact, then the owner
 * membership, then the earliest member. Returns null when the org has no
 * members — a contact is never fabricated.
 */
async function resolveOrgPrimaryContact(
  org: AdminOrganization | null | undefined
): Promise<CustomerEnsureParams['primaryContact']> {
  if (!org) return null

  let contactUserId = org.primary_contact_user_id
  if (!contactUserId) {
    const memberships = await $876.memberships.list({
      organizationId: org.id,
      limit: 100,
    })
    const rows = memberships.data?.data ?? []
    if (rows.length === 0) return null

    const owner =
      rows.find((membership) => membership.role === 'owner') ??
      rows.reduce((earliest, current) =>
        current.created_at < earliest.created_at ? current : earliest
      )
    contactUserId = owner.user_id
  }

  const user = await $876.auth.admin.getUserById(contactUserId)
  if (!user.data) return { userId: contactUserId }

  return {
    userId: contactUserId,
    firstName: user.data.first_name,
    lastName: user.data.last_name,
    email: user.data.email,
  }
}

const INTERVAL_BY_CORE: Record<string, IntervalUnit> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
  year: 'YEAR',
}

/** Adds the projection outcome to a successful Console mutation response. */
export function withBillingSyncHeader(
  response: Response,
  succeeded: boolean
): Response {
  response.headers.set(
    'x-876-billing-sync',
    succeeded ? 'succeeded' : 'pending-reconciliation'
  )
  return response
}

/**
 * Resolves a core price's billing cadence. Newer core rows carry it in the
 * `recurring` JSON, legacy rows in `billing_interval`; a recurring price with
 * neither is treated as monthly so $0/legacy seed prices stay mirrorable.
 */
function coreCadence(
  price: AdminPrice
): { intervalUnit: IntervalUnit; intervalCount: number } | null {
  const recurring = price.recurring as {
    interval?: string
    interval_count?: number
  } | null

  const interval =
    price.billing_interval ??
    recurring?.interval ??
    (price.type === 'recurring' ? 'month' : undefined)
  if (!interval) return null

  const intervalUnit = INTERVAL_BY_CORE[interval]
  if (!intervalUnit) return null

  return {
    intervalUnit,
    intervalCount: price.interval_count ?? recurring?.interval_count ?? 1,
  }
}

function billingStatusFromCore(
  status: AdminSubscriptionStatus
): SubscriptionStatus {
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

/** Mirrors a core plan tier and a set of its prices into Billing. */
export async function mirrorCoreProductPrices(
  product: AdminProduct,
  prices: AdminPrice[]
): Promise<boolean> {
  if (!product.app_id) return false

  const ensuredProduct = await $876.billing.products.ensure({
    sourceAppId: product.app_id,
    slug: product.app_slug ?? product.app_id,
    name: product.app_name ?? product.app_slug ?? product.app_id,
    description: null,
    active: true,
  })
  if (ensuredProduct.error !== null) {
    console.error(
      '[console.billing.mirror] product ensure failed:',
      product.id,
      ensuredProduct.error.message
    )
    return false
  }

  let succeeded = true
  for (const price of prices) {
    const cadence = coreCadence(price)
    if (!cadence) {
      succeeded = false
      console.error(
        '[console.billing.mirror] price cadence unavailable:',
        price.id
      )
      continue
    }

    const { intervalUnit, intervalCount } = cadence
    const ensuredPlan = await $876.billing.plans.ensure({
      productId: ensuredProduct.data.id,
      entitlementReferenceId: product.id,
      code: product.slug,
      name: product.name,
      description: product.description,
      intervalUnit,
      intervalCount,
      trialDays: price.trial_period_days ?? 0,
      active: product.active,
    })
    if (ensuredPlan.error !== null) {
      console.error(
        '[console.billing.mirror] plan ensure failed:',
        product.id,
        ensuredPlan.error.message
      )
      succeeded = false
      continue
    }

    const ensuredPrice = await $876.billing.prices.ensure({
      planId: ensuredPlan.data.id,
      entitlementReferenceId: price.id,
      nickname: price.nickname ?? price.name ?? null,
      currency: price.currency.toUpperCase(),
      unitAmount: price.unit_amount,
      intervalUnit,
      intervalCount,
      active: price.active,
    })
    if (ensuredPrice.error !== null) {
      console.error(
        '[console.billing.mirror] price ensure failed:',
        price.id,
        ensuredPrice.error.message
      )
      succeeded = false
    }
  }

  return succeeded
}

/** Mirrors a core org-app subscription into Billing as a commercial agreement. */
export async function mirrorCoreSubscription(
  subscription: AdminSubscription
): Promise<boolean> {
  if (subscription.items.length === 0) return false

  const productIds = [
    ...new Set(
      subscription.items.flatMap((item) =>
        item.product_id ? [item.product_id] : []
      )
    ),
  ]
  if (productIds.length === 0) {
    console.error(
      '[console.billing.mirror] subscription items have no products:',
      subscription.id
    )
    return false
  }

  const orgPromise = $876.orgs.retrieve(subscription.organization_id)
  const productPromises = productIds.map((productId) =>
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
        console.error(
          '[console.billing.mirror] subscription product retrieve failed:',
          subscription.id,
          productResult.error?.message
        )
        return false
      }

      const prices = productResult.data.prices.filter((price) =>
        referencedPriceIds.has(price.id)
      )
      if (prices.length === 0) return false

      return mirrorCoreProductPrices(productResult.data, prices)
    })
  )
  if (catalogResults.some((result) => !result)) return false

  const legalName = org.data?.name ?? subscription.organization_id
  const contact = await resolveOrgPrimaryContact(org.data)

  const ensuredCustomer = await $876.billing.customers.ensure({
    organizationId: subscription.organization_id,
    customerType: 'CORE_ORGANIZATION',
    customerKind: 'BUSINESS',
    name: org.data?.doing_business_as ?? legalName,
    companyName: legalName,
    email: org.data?.primary_email ?? contact?.email ?? null,
    phone: org.data?.primary_phone ?? null,
    firstName: contact?.firstName ?? null,
    lastName: contact?.lastName ?? null,
    primaryContact: contact,
  })
  if (ensuredCustomer.error !== null) {
    console.error(
      '[console.billing.mirror] customer ensure failed:',
      subscription.organization_id,
      ensuredCustomer.error.message
    )
    return false
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
    console.error(
      '[console.billing.mirror] subscription ensure failed:',
      subscription.id,
      ensuredSubscription.error.message
    )
    return false
  }

  return true
}

/** Retrieves and reconciles one core subscription after an item mutation. */
export async function mirrorCoreSubscriptionById(
  subscriptionId: string
): Promise<boolean> {
  const result = await $876.subscriptions.retrieve(subscriptionId)
  if (!result.data) {
    console.error(
      '[console.billing.mirror] subscription retrieve failed:',
      subscriptionId,
      result.error?.message
    )
    return false
  }

  return mirrorCoreSubscription(result.data)
}

/** Replays all core catalog and organization subscriptions into Billing. */
export async function reconcileBillingMirror() {
  let products = 0
  let subscriptions = 0
  let failures = 0

  try {
    const productResult = await $876.products.list()
    if (productResult.error) {
      failures += 1
      console.error(
        '[console.billing.reconcile] product list failed:',
        productResult.error.message
      )
    } else {
      for (const product of productResult.data.data) {
        products += 1
        try {
          const succeeded = await mirrorCoreProductPrices(
            product,
            product.prices
          )
          if (!succeeded) failures += 1
        } catch (error) {
          failures += 1
          console.error(
            '[console.billing.reconcile] product mirror failed:',
            product.id,
            error
          )
        }
      }
    }
  } catch (error) {
    failures += 1
    console.error('[console.billing.reconcile] product list failed:', error)
  }

  let startingAfter: string | undefined
  let hasMore = true
  while (hasMore) {
    try {
      const orgResult = await $876.orgs.list({
        limit: 100,
        startingAfter,
      })
      if (orgResult.error) {
        failures += 1
        console.error(
          '[console.billing.reconcile] organization list failed:',
          orgResult.error.message
        )
        break
      }

      for (const org of orgResult.data.data) {
        try {
          const subscriptionResult = await $876.orgs.subscriptions.list(org.id)
          if (subscriptionResult.error) {
            failures += 1
            console.error(
              '[console.billing.reconcile] subscription list failed:',
              org.id,
              subscriptionResult.error.message
            )
            continue
          }

          for (const subscription of subscriptionResult.data) {
            subscriptions += 1
            try {
              const succeeded = await mirrorCoreSubscription(subscription)
              if (!succeeded) failures += 1
            } catch (error) {
              failures += 1
              console.error(
                '[console.billing.reconcile] subscription mirror failed:',
                subscription.id,
                error
              )
            }
          }
        } catch (error) {
          failures += 1
          console.error(
            '[console.billing.reconcile] subscription list failed:',
            org.id,
            error
          )
        }
      }

      hasMore = orgResult.data.has_more
      startingAfter = orgResult.data.data.at(-1)?.id
      if (hasMore && !startingAfter) {
        failures += 1
        console.error(
          '[console.billing.reconcile] organization pagination returned no cursor'
        )
        break
      }
    } catch (error) {
      failures += 1
      console.error(
        '[console.billing.reconcile] organization list failed:',
        error
      )
      break
    }
  }

  return {
    object: 'billing_mirror_reconcile' as const,
    products,
    subscriptions,
    failures,
  }
}
