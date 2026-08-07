import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createApplicationModule,
  createPlanModule,
  findAppBySlug,
  findApplicationModule,
  findOwnerOrganizationId,
  findPlanModule,
  findPriceForProduct,
  findProductBySlug,
  getSubscription,
  listApps,
  listFeatures,
  listProducts,
  listSubscriptionsByApp,
  provisionSubscription,
  setSubscriptionPrice,
} from './plans.repository'

const log = getLogger('seeds:plans')

export const BILLING_INTERNAL_PLAN_SLUG = '876-billing-internal'
export const BILLING_INTERNAL_OWNER_EMAIL = 'raheemdevs@gmail.com'
export const BILLING_APP_SLUG = '876-billing'

type PlatformModuleDef = {
  appSlug: string
  key: string
  name: string
  description: string
  featureSlug: string | null
  position: number
  includedPlanSlugs: readonly string[]
}

export const PLATFORM_MODULES: readonly PlatformModuleDef[] = [
  {
    appSlug: '876-billing',
    key: 'sales',
    name: 'Sales',
    description: 'Quotes, estimates, invoices, payments, and credit notes.',
    featureSlug: 'billing_sales',
    position: 10,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-billing',
    key: 'subscriptions',
    name: 'Subscriptions',
    description:
      'Recurring plans, subscriptions, renewals, and generated invoices.',
    featureSlug: 'billing_subscriptions',
    position: 20,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-billing',
    key: 'purchases',
    name: 'Purchases',
    description: 'Vendor and expense management.',
    featureSlug: 'billing_purchases',
    position: 30,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-billing',
    key: 'banking',
    name: 'Banking',
    description: 'Bank accounts and transaction workflows.',
    featureSlug: 'billing_banking',
    position: 40,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-billing',
    key: 'documents',
    name: 'Documents',
    description: 'Document storage and financial attachments.',
    featureSlug: 'billing_documents',
    position: 50,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-billing',
    key: 'payroll',
    name: 'Payroll',
    description: 'Payroll setup, calculation, and payroll runs.',
    featureSlug: 'billing_payroll',
    position: 60,
    includedPlanSlugs: ['876-billing-internal'],
  },
  {
    appSlug: '876-couriers',
    key: 'delivery',
    name: 'Delivery',
    description:
      'Courier delivery operations, shipping, and fulfillment settings.',
    featureSlug: null,
    position: 10,
    includedPlanSlugs: ['876-couriers-free', '876-couriers-pro'],
  },
] as const

export type PlanSeedSummary = {
  modulesCreated: number
  planModulesCreated: number
  billingAssignments: number
  ownerProvisioned: boolean
}

export async function seedPlatformPlanModules(): Promise<PlanSeedSummary> {
  const now = BigInt(nowUnixSeconds())
  const appsBySlug = new Map((await listApps()).map((app) => [app.slug, app]))
  const featuresBySlug = new Map(
    (await listFeatures()).map((feature) => [feature.slug, feature])
  )
  const productsBySlug = new Map(
    (await listProducts()).map((product) => [product.slug, product])
  )

  let modulesCreated = 0
  let planModulesCreated = 0

  for (const definition of PLATFORM_MODULES) {
    const app = appsBySlug.get(definition.appSlug)
    if (!app) continue

    let applicationModule = await findApplicationModule(app.id, definition.key)
    const feature = definition.featureSlug
      ? (featuresBySlug.get(definition.featureSlug) ?? null)
      : null
    const created = applicationModule === null

    if (!applicationModule) {
      applicationModule = await createApplicationModule({
        id: generateId('applicationModule'),
        appId: app.id,
        key: definition.key,
        name: definition.name,
        description: definition.description,
        featureId: feature ? feature.id : null,
        status: 'active',
        position: definition.position,
        createdAt: now,
        updatedAt: now,
      })
      modulesCreated += 1
    }

    // Only seed plan grants on creation — preserves operator-removed grants.
    const planSlugs = created ? definition.includedPlanSlugs : []
    for (const planSlug of planSlugs) {
      const product = productsBySlug.get(planSlug)
      if (!product) continue
      const existing = await findPlanModule(product.id, applicationModule.id)
      if (!existing) {
        await createPlanModule({
          id: generateId('planModule'),
          productId: product.id,
          moduleId: applicationModule.id,
          createdAt: now,
          updatedAt: now,
        })
        planModulesCreated += 1
      }
    }
  }

  return {
    modulesCreated,
    planModulesCreated,
    billingAssignments: 0,
    ownerProvisioned: false,
  }
}

export async function backfillBillingPlanAssignments(): Promise<PlanSeedSummary> {
  const billingApp = await findAppBySlug(BILLING_APP_SLUG)
  const internalProduct = await findProductBySlug(BILLING_INTERNAL_PLAN_SLUG)

  if (!billingApp || !internalProduct) {
    log.error('plans.billing_internal_missing')
    return {
      modulesCreated: 0,
      planModulesCreated: 0,
      billingAssignments: 0,
      ownerProvisioned: false,
    }
  }

  const internalPrice = await findPriceForProduct(internalProduct.id)
  if (!internalPrice) {
    log.error('plans.billing_internal_price_missing')
    return {
      modulesCreated: 0,
      planModulesCreated: 0,
      billingAssignments: 0,
      ownerProvisioned: false,
    }
  }

  const subscriptions = await listSubscriptionsByApp(billingApp.id)
  let assignments = 0

  for (const subscription of subscriptions) {
    if (subscription.items.length === 0) {
      await setSubscriptionPrice(subscription.id, internalPrice.id)
      assignments += 1
    }
  }

  const ownerOrgId = await findOwnerOrganizationId(BILLING_INTERNAL_OWNER_EMAIL)
  let ownerProvisioned = false

  if (ownerOrgId) {
    const ownerSubscription = await getSubscription(ownerOrgId, billingApp.id)
    if (!ownerSubscription) {
      await provisionSubscription({
        organizationId: ownerOrgId,
        appId: billingApp.id,
        priceId: internalPrice.id,
      })
      assignments += 1
      ownerProvisioned = true
    } else if (
      !ownerSubscription.items.some((item) => item.priceId === internalPrice.id)
    ) {
      await setSubscriptionPrice(ownerSubscription.id, internalPrice.id)
      assignments += 1
      ownerProvisioned = true
    }
  }

  log.info(
    {
      app_id: billingApp.id,
      plan_id: internalProduct.id,
      subscription_count: subscriptions.length,
      owner_org_id: ownerOrgId,
    },
    'plans.billing_assignments_backfilled'
  )

  return {
    modulesCreated: 0,
    planModulesCreated: 0,
    billingAssignments: assignments,
    ownerProvisioned,
  }
}

export async function seedPlans(): Promise<PlanSeedSummary> {
  const modules = await seedPlatformPlanModules()
  const assignments = await backfillBillingPlanAssignments()
  return {
    modulesCreated: modules.modulesCreated,
    planModulesCreated: modules.planModulesCreated,
    billingAssignments: assignments.billingAssignments,
    ownerProvisioned: assignments.ownerProvisioned,
  }
}
