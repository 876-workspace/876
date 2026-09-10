import {
  BILLING_COMMERCIAL_MODULE_KEYS,
  BILLING_MODULE_REGISTRY,
  findAppModule,
  INVOICE_COMMERCIAL_MODULE_KEYS,
  INVOICE_MODULE_REGISTRY,
} from '@876/core/modules'

import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createApplicationModule,
  findAppBySlug,
  findApplicationModule,
  findOwnerOrganizationId,
  findPriceForProduct,
  findProductBySlug,
  getSubscription,
  listApps,
  listFeatures,
  listProducts,
  listSubscriptionsByApp,
  provisionSubscription,
  setSubscriptionPrice,
  updateApplicationModuleIdentity,
} from './plans.repository'

const log = getLogger('seeds:plans')

export const BILLING_INTERNAL_PLAN_SLUG = '876-billing-internal'
export const BILLING_INTERNAL_OWNER_EMAIL = 'raheemdevs@gmail.com'
export const BILLING_APP_SLUG = '876-billing'
export const INVOICE_FREE_PLAN_SLUG = '876-invoice-free'

export const INVOICE_FREE_PLAN_MODULE_KEYS = [
  'invoices',
  'quotes',
  'payments',
  'items',
  'customers',
] as const

const invoiceFreeModuleKeys = new Set<string>(INVOICE_FREE_PLAN_MODULE_KEYS)

const BILLING_FEATURE_SLUGS: Readonly<Record<string, string>> = {
  subscriptions: 'billing-subscriptions',
  purchases: 'billing-purchases',
  banking: 'billing-banking',
  payroll: 'billing-payroll',
}

/**
 * Keep the positions of the pre-registry Billing modules stable on a fresh
 * database. Existing environments already retain operator positions because
 * identity synchronization never writes `position`.
 */
const BILLING_MODULE_POSITIONS: Readonly<Record<string, number>> = {
  subscriptions: 20,
  purchases: 30,
  banking: 40,
  payroll: 60,
}

type PlatformModuleDef = {
  appSlug: string
  key: string
  name: string
  description: string
  featureSlug: string | null
  position: number
  includedPlanSlugs: readonly string[]
  syncIdentity: boolean
}

function registryModuleDefinitions(params: {
  appSlug: string
  keys: readonly string[]
  positionBase: number
  positions?: Readonly<Record<string, number>>
  featureSlugs?: Readonly<Record<string, string>>
  includedPlanSlugs?: (key: string) => readonly string[]
}): PlatformModuleDef[] {
  return params.keys.map((key, index) => {
    const definition = findAppModule(params.appSlug, key)
    if (!definition)
      throw new Error(
        `Commercial module ${params.appSlug}.${key} is missing from the canonical registry`
      )

    return {
      appSlug: params.appSlug,
      key: definition.key,
      name: definition.label,
      description: definition.description,
      featureSlug: params.featureSlugs?.[key] ?? null,
      position: params.positions?.[key] ?? params.positionBase + index * 10,
      includedPlanSlugs: params.includedPlanSlugs?.(key) ?? [],
      syncIdentity: true,
    }
  })
}

const CANONICAL_FINANCE_MODULES = [
  ...registryModuleDefinitions({
    appSlug: INVOICE_MODULE_REGISTRY.app,
    keys: INVOICE_COMMERCIAL_MODULE_KEYS,
    positionBase: 10,
    includedPlanSlugs: (key) =>
      invoiceFreeModuleKeys.has(key) ? [INVOICE_FREE_PLAN_SLUG] : [],
  }),
  ...registryModuleDefinitions({
    appSlug: BILLING_MODULE_REGISTRY.app,
    keys: BILLING_COMMERCIAL_MODULE_KEYS,
    positionBase: 100,
    positions: BILLING_MODULE_POSITIONS,
    featureSlugs: BILLING_FEATURE_SLUGS,
  }),
]

/**
 * Registry-backed finance modules plus transitional legacy commercial modules.
 *
 * Billing's `sales` and `documents` keys are intentionally retained until their
 * existing feature/entitlement semantics can be migrated explicitly. They are
 * not aliases for the finer canonical finance modules.
 */
export const PLATFORM_MODULES: readonly PlatformModuleDef[] = [
  ...CANONICAL_FINANCE_MODULES,
  {
    appSlug: '876-billing',
    key: 'sales',
    name: 'Sales',
    description: 'Quotes, estimates, invoices, payments, and credit notes.',
    featureSlug: 'billing-sales',
    position: 10,
    includedPlanSlugs: [BILLING_INTERNAL_PLAN_SLUG],
    syncIdentity: false,
  },
  {
    appSlug: '876-billing',
    key: 'documents',
    name: 'Documents',
    description: 'Document storage and financial attachments.',
    featureSlug: 'billing-documents',
    position: 50,
    includedPlanSlugs: [BILLING_INTERNAL_PLAN_SLUG],
    syncIdentity: false,
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
    syncIdentity: false,
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
  const [apps, features, products] = await Promise.all([
    listApps(),
    listFeatures(),
    listProducts(),
  ])
  const appsBySlug = new Map(apps.map((app) => [app.slug, app]))
  const featuresBySlug = new Map(
    features.map((feature) => [feature.slug, feature])
  )
  const productsBySlug = new Map(
    products.map((product) => [product.slug, product])
  )

  let modulesCreated = 0
  let planModulesCreated = 0

  for (const definition of PLATFORM_MODULES) {
    const app = appsBySlug.get(definition.appSlug)
    if (!app) continue

    const applicationModule = await findApplicationModule(
      app.id,
      definition.key
    )
    const feature = definition.featureSlug
      ? (featuresBySlug.get(definition.featureSlug) ?? null)
      : null
    if (!applicationModule) {
      const initialGrants = definition.includedPlanSlugs.flatMap((slug) => {
        const product = productsBySlug.get(slug)
        return product
          ? [{ id: generateId('planModule'), productId: product.id }]
          : []
      })
      // A failed grant must roll back its new module, so a retry can still
      // distinguish bootstrap from an operator's later grant removal.
      await createApplicationModule({
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
        initialGrants,
      })
      modulesCreated += 1
      planModulesCreated += initialGrants.length
    } else if (
      definition.syncIdentity &&
      (applicationModule.name !== definition.name ||
        applicationModule.description !== definition.description)
    ) {
      await updateApplicationModuleIdentity(applicationModule.id, {
        name: definition.name,
        description: definition.description,
        updatedAt: now,
      })
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
