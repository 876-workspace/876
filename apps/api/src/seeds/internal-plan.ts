import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createInternalProductWithPrice,
  createPlanModule,
  findAppBySlug,
  findOrganizationBySlug,
  findPlanModule,
  findPriceForProduct,
  findProductBySlug,
  getSubscription,
  listApplicationModules,
  provisionSubscription,
  setSubscriptionPrice,
} from './plans.repository'

const log = getLogger('seeds:internal-plan')

/**
 * The internal, 876-only plan.
 *
 * Feature evaluation ANDs four things: the feature's own switch, the rollout
 * decision, module entitlement, and the parent chain. Module entitlement comes
 * from the organization's *plan* — so an app whose sidebar groups are declared
 * as platform modules stays dark for an organization on a plan that carries
 * none of them, no matter what is enabled globally or granted per organization.
 * There was no plan carrying them: `876-billing-internal` was referenced by the
 * module seed and by `backfillBillingPlanAssignments` but never created, so
 * every Billing module was gated with nothing to satisfy the gate.
 *
 * This seed creates one internal plan per app, grants it every module that app
 * declares, and puts 876's own organization on it. It is deliberately not a
 * customer-facing plan: the product carries `metadata.internal = true` so an
 * operator plan list can exclude it without matching on the slug.
 */

/** `<appSlug>-internal`, which is also the slug the module seed already names. */
export function internalPlanSlug(appSlug: string): string {
  return `${appSlug}-internal`
}

/**
 * The apps an internal plan is created for — every subscribable app. Console is
 * excluded because it is never subscribed to.
 */
export const INTERNAL_PLAN_APP_SLUGS = [
  '876-enterprise',
  '876-couriers',
  '876-billing',
  '876-invoice',
  '876-crm',
  '876-projects',
  '876-commerce',
] as const

/** 876's own organization, the only one this seed subscribes. */
export const INTERNAL_PLAN_ORGANIZATION_SLUG =
  process.env.INTERNAL_PLAN_ORGANIZATION_SLUG ?? 'efesto'

export type InternalPlanSeedSummary = {
  plansCreated: number
  planModulesGranted: number
  subscriptionsProvisioned: number
  subscriptionsRepriced: number
  organizationResolved: boolean
  skippedMissingApp: string[]
}

export async function seedInternalPlans(): Promise<InternalPlanSeedSummary> {
  const now = BigInt(nowUnixSeconds())

  const organization = await findOrganizationBySlug(
    INTERNAL_PLAN_ORGANIZATION_SLUG
  )
  if (!organization)
    log.warn(
      { slug: INTERNAL_PLAN_ORGANIZATION_SLUG },
      'internal_plan.organization_missing'
    )

  const summary: InternalPlanSeedSummary = {
    plansCreated: 0,
    planModulesGranted: 0,
    subscriptionsProvisioned: 0,
    subscriptionsRepriced: 0,
    organizationResolved: organization !== null,
    skippedMissingApp: [],
  }

  for (const appSlug of INTERNAL_PLAN_APP_SLUGS) {
    const app = await findAppBySlug(appSlug)
    if (!app) {
      summary.skippedMissingApp.push(appSlug)
      log.warn({ slug: appSlug }, 'internal_plan.app_missing')
      continue
    }

    const planSlug = internalPlanSlug(appSlug)
    let product = await findProductBySlug(planSlug)

    if (!product) {
      const created = await createInternalProductWithPrice({
        productId: generateId('product'),
        priceId: generateId('price'),
        slug: planSlug,
        name: `${appSlug} Internal`,
        appId: app.id,
        now,
      })
      product = { id: created.productId, slug: planSlug }
      summary.plansCreated += 1
      log.info({ slug: planSlug, app_id: app.id }, 'internal_plan.created')
    }

    // Every module the app declares, granted to the internal plan. Unlike the
    // platform module seed, this re-grants on every run rather than only on
    // module creation: an internal plan that is missing a module is a gate with
    // nothing behind it, which is the defect this seed exists to close.
    for (const appModule of await listApplicationModules(app.id)) {
      if (await findPlanModule(product.id, appModule.id)) continue

      await createPlanModule({
        id: generateId('planModule'),
        productId: product.id,
        moduleId: appModule.id,
        createdAt: now,
        updatedAt: now,
      })
      summary.planModulesGranted += 1
    }

    if (!organization) continue

    const price = await findPriceForProduct(product.id)
    if (!price) {
      log.error({ slug: planSlug }, 'internal_plan.price_missing')
      continue
    }

    const subscription = await getSubscription(organization.id, app.id)
    if (!subscription) {
      await provisionSubscription({
        organizationId: organization.id,
        appId: app.id,
        priceId: price.id,
      })
      summary.subscriptionsProvisioned += 1
      continue
    }

    if (subscription.items.some((item) => item.priceId === price.id)) continue

    await setSubscriptionPrice(subscription.id, price.id)
    summary.subscriptionsRepriced += 1
  }

  log.info({ ...summary }, 'internal_plan.seeded')
  return summary
}
