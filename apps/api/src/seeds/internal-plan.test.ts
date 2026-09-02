import { beforeEach, describe, expect, it, vi } from 'vitest'

const repo = vi.hoisted(() => ({
  findAppBySlug: vi.fn(),
  findOrganizationBySlug: vi.fn(),
  findProductBySlug: vi.fn(),
  findPriceForProduct: vi.fn(),
  findPlanModule: vi.fn(),
  createPlanModule: vi.fn(),
  createInternalProductWithPrice: vi.fn(),
  listApplicationModules: vi.fn(),
  getSubscription: vi.fn(),
  provisionSubscription: vi.fn(),
  setSubscriptionPrice: vi.fn(),
}))

vi.mock('@/db/client', () => ({ prisma: {} }))
vi.mock('./plans.repository', () => repo)

import {
  INTERNAL_PLAN_APP_SLUGS,
  internalPlanSlug,
  seedInternalPlans,
} from './internal-plan'

const ORG = { id: 'org_efesto', slug: 'efesto' }

/** One app resolves, everything else is missing, so a case stays readable. */
function onlyApp(slug: string, id = 'app_1') {
  repo.findAppBySlug.mockImplementation(async (candidate: string) =>
    candidate === slug ? { id, slug } : null
  )
}

describe('seedInternalPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repo.findOrganizationBySlug.mockResolvedValue(ORG)
    repo.findAppBySlug.mockResolvedValue(null)
    repo.findProductBySlug.mockResolvedValue(null)
    repo.findPriceForProduct.mockResolvedValue({ id: 'price_1' })
    repo.findPlanModule.mockResolvedValue(null)
    repo.listApplicationModules.mockResolvedValue([])
    repo.getSubscription.mockResolvedValue(null)
    repo.createInternalProductWithPrice.mockImplementation(
      async ({ productId, priceId }: { productId: string; priceId: string }) => ({
        productId,
        priceId,
      })
    )
  })

  it('names an internal plan after the app it belongs to', () => {
    expect(internalPlanSlug('876-billing')).toBe('876-billing-internal')
  })

  it('reuses the slug the platform module seed already grants against', () => {
    // `PLATFORM_MODULES` lists `876-billing-internal` in `includedPlanSlugs`,
    // and `backfillBillingPlanAssignments` looks it up by that exact slug. A
    // different name here would leave both pointing at nothing.
    expect(INTERNAL_PLAN_APP_SLUGS).toContain('876-billing')
    expect(internalPlanSlug('876-billing')).toBe('876-billing-internal')
  })

  it('never creates an internal plan for Console', () => {
    expect(INTERNAL_PLAN_APP_SLUGS).not.toContain('876-console')
    expect(INTERNAL_PLAN_APP_SLUGS).not.toContain('console')
  })

  it('creates the plan once and grants it every module the app declares', async () => {
    onlyApp('876-billing')
    repo.listApplicationModules.mockResolvedValue([
      { id: 'mod_sales', key: 'sales' },
      { id: 'mod_banking', key: 'banking' },
    ])

    const summary = await seedInternalPlans()

    expect(summary.plansCreated).toBe(1)
    expect(summary.planModulesGranted).toBe(2)
    expect(repo.createInternalProductWithPrice).toHaveBeenCalledTimes(1)
    expect(repo.createInternalProductWithPrice).toHaveBeenCalledWith(
      expect.objectContaining({ slug: '876-billing-internal', appId: 'app_1' })
    )
    expect(repo.createPlanModule).toHaveBeenCalledTimes(2)
  })

  it('does not recreate a plan that already exists', async () => {
    onlyApp('876-billing')
    repo.findProductBySlug.mockResolvedValue({
      id: 'prod_1',
      slug: '876-billing-internal',
    })

    const summary = await seedInternalPlans()

    expect(summary.plansCreated).toBe(0)
    expect(repo.createInternalProductWithPrice).not.toHaveBeenCalled()
  })

  it('does not re-grant a module the plan already carries', async () => {
    onlyApp('876-billing')
    repo.listApplicationModules.mockResolvedValue([
      { id: 'mod_sales', key: 'sales' },
    ])
    repo.findPlanModule.mockResolvedValue({ id: 'planmod_1' })

    const summary = await seedInternalPlans()

    expect(summary.planModulesGranted).toBe(0)
    expect(repo.createPlanModule).not.toHaveBeenCalled()
  })

  it('provisions a subscription for an organization that has none', async () => {
    onlyApp('876-billing')

    const summary = await seedInternalPlans()

    expect(summary.subscriptionsProvisioned).toBe(1)
    expect(summary.subscriptionsRepriced).toBe(0)
    expect(repo.provisionSubscription).toHaveBeenCalledWith({
      organizationId: 'org_efesto',
      appId: 'app_1',
      priceId: 'price_1',
    })
  })

  it('moves an existing subscription onto the internal price', async () => {
    onlyApp('876-billing')
    repo.getSubscription.mockResolvedValue({
      id: 'sub_1',
      items: [{ priceId: 'price_free' }],
    })

    const summary = await seedInternalPlans()

    expect(summary.subscriptionsRepriced).toBe(1)
    expect(summary.subscriptionsProvisioned).toBe(0)
    expect(repo.setSubscriptionPrice).toHaveBeenCalledWith('sub_1', 'price_1')
  })

  it('leaves a subscription already on the internal price untouched', async () => {
    onlyApp('876-billing')
    repo.getSubscription.mockResolvedValue({
      id: 'sub_1',
      items: [{ priceId: 'price_1' }],
    })

    const summary = await seedInternalPlans()

    expect(summary.subscriptionsRepriced).toBe(0)
    expect(repo.setSubscriptionPrice).not.toHaveBeenCalled()
    expect(repo.provisionSubscription).not.toHaveBeenCalled()
  })

  it('still creates the plans when the organization does not exist', async () => {
    onlyApp('876-billing')
    repo.findOrganizationBySlug.mockResolvedValue(null)
    repo.listApplicationModules.mockResolvedValue([
      { id: 'mod_sales', key: 'sales' },
    ])

    const summary = await seedInternalPlans()

    expect(summary.organizationResolved).toBe(false)
    expect(summary.plansCreated).toBe(1)
    expect(summary.planModulesGranted).toBe(1)
    expect(repo.provisionSubscription).not.toHaveBeenCalled()
    expect(repo.setSubscriptionPrice).not.toHaveBeenCalled()
  })

  it('records a missing app instead of failing the whole run', async () => {
    onlyApp('876-billing')

    const summary = await seedInternalPlans()

    expect(summary.skippedMissingApp).toEqual(
      INTERNAL_PLAN_APP_SLUGS.filter((slug) => slug !== '876-billing')
    )
    expect(summary.plansCreated).toBe(1)
  })

  it('does not subscribe an organization when the plan has no price', async () => {
    onlyApp('876-billing')
    repo.findProductBySlug.mockResolvedValue({
      id: 'prod_1',
      slug: '876-billing-internal',
    })
    repo.findPriceForProduct.mockResolvedValue(null)

    const summary = await seedInternalPlans()

    expect(summary.subscriptionsProvisioned).toBe(0)
    expect(repo.provisionSubscription).not.toHaveBeenCalled()
    expect(repo.setSubscriptionPrice).not.toHaveBeenCalled()
  })

  it('covers every subscribable app in one run', async () => {
    repo.findAppBySlug.mockImplementation(async (slug: string) => ({
      id: `app_${slug}`,
      slug,
    }))

    const summary = await seedInternalPlans()

    expect(summary.plansCreated).toBe(INTERNAL_PLAN_APP_SLUGS.length)
    expect(summary.subscriptionsProvisioned).toBe(
      INTERNAL_PLAN_APP_SLUGS.length
    )
    expect(summary.skippedMissingApp).toEqual([])
  })
})
