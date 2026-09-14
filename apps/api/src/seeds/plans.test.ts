import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BILLING_COMMERCIAL_MODULE_KEYS,
  COURIERS_COMMERCIAL_MODULE_KEYS,
  INVOICE_COMMERCIAL_MODULE_KEYS,
  PROJECTS_COMMERCIAL_MODULE_KEYS,
  findAppModule,
} from '@876/core/modules'

const repository = vi.hoisted(() => ({
  createApplicationModule: vi.fn(),
  findAppBySlug: vi.fn(),
  findApplicationModule: vi.fn(),
  findOwnerOrganizationId: vi.fn(),
  findPriceForProduct: vi.fn(),
  findProductBySlug: vi.fn(),
  getSubscription: vi.fn(),
  listApps: vi.fn(),
  listFeatures: vi.fn(),
  listProducts: vi.fn(),
  listSubscriptionsByApp: vi.fn(),
  provisionSubscription: vi.fn(),
  renameApplicationModuleKey: vi.fn(),
  setSubscriptionPrice: vi.fn(),
  updateApplicationModuleIdentity: vi.fn(),
}))

vi.mock('./plans.repository', () => repository)
vi.mock('@/platform/ids', () => ({
  generateId: vi.fn((entityType: string) => `${entityType}_generated`),
}))
vi.mock('@/platform/timestamps', () => ({
  nowUnixSeconds: vi.fn(() => 1_700_000_000),
}))
vi.mock('@/platform/logger', () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}))

import {
  INVOICE_FREE_PLAN_MODULE_KEYS,
  INVOICE_FREE_PLAN_SLUG,
  COURIERS_FREE_PLAN_SLUG,
  COURIERS_PRO_PLAN_SLUG,
  PLATFORM_MODULES,
  PROJECTS_FREE_PLAN_MODULE_KEYS,
  PROJECTS_FREE_PLAN_SLUG,
  seedPlatformPlanModules,
} from './plans'

function createdModule(params: {
  appId: string
  key: string
  name: string
  description: string
  featureId: string | null
}) {
  return {
    id: `mod_${params.key}`,
    ...params,
  }
}

describe('canonical plan module seed definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.listApps.mockResolvedValue([])
    repository.listFeatures.mockResolvedValue([])
    repository.listProducts.mockResolvedValue([])
    repository.findApplicationModule.mockResolvedValue(null)
    repository.updateApplicationModuleIdentity.mockResolvedValue(undefined)
    repository.createApplicationModule.mockImplementation(
      (params: Parameters<typeof createdModule>[0]) =>
        Promise.resolve(createdModule(params))
    )
  })

  it('materializes the exact Invoice commercial registry without crm', () => {
    const definitions = PLATFORM_MODULES.filter(
      (definition) =>
        definition.appSlug === '876-invoice' && definition.syncIdentity
    )

    expect(definitions.map((definition) => definition.key)).toEqual(
      INVOICE_COMMERCIAL_MODULE_KEYS
    )
    for (const definition of definitions) {
      const canonical = findAppModule('876-invoice', definition.key)
      expect(definition.name).toBe(canonical?.label)
      expect(definition.description).toBe(canonical?.description)
    }
    expect(definitions.some((definition) => definition.key === 'crm')).toBe(
      false
    )
  })

  it('materializes only Projects capabilities with current commercial semantics', () => {
    const keys = PLATFORM_MODULES.filter(
      (definition) =>
        definition.appSlug === '876-projects' && definition.syncIdentity
    ).map((definition) => definition.key)

    expect(keys).toEqual(PROJECTS_COMMERCIAL_MODULE_KEYS)
    expect(keys).toEqual(['projects', 'issues'])
    expect(keys).not.toContain('reports')
  })

  it('does not materialize Commerce capabilities before runtime module gates exist', () => {
    expect(
      PLATFORM_MODULES.filter(
        (definition) => definition.appSlug === '876-commerce'
      )
    ).toEqual([])
  })

  it('materializes the exact Couriers commercial registry with both baseline plans', () => {
    const definitions = PLATFORM_MODULES.filter(
      (definition) =>
        definition.appSlug === '876-couriers' && definition.syncIdentity
    )

    expect(definitions.map((definition) => definition.key)).toEqual(
      COURIERS_COMMERCIAL_MODULE_KEYS
    )
    expect(definitions.map((definition) => definition.position)).toEqual([
      10, 20, 30, 40, 50,
    ])
    expect(
      definitions.map((definition) => definition.includedPlanSlugs)
    ).toEqual(
      COURIERS_COMMERCIAL_MODULE_KEYS.map(() => [
        COURIERS_FREE_PLAN_SLUG,
        COURIERS_PRO_PLAN_SLUG,
      ])
    )
  })

  it('binds Requests to app-scoped rollout flags in both finance apps', () => {
    const bindings = PLATFORM_MODULES.filter(
      (definition) => definition.key === 'requests'
    ).map((definition) => ({
      appSlug: definition.appSlug,
      featureSlug: definition.featureSlug,
      includeCurrentAppPlans: definition.includeCurrentAppPlans,
    }))

    expect(bindings).toEqual([
      {
        appSlug: '876-invoice',
        featureSlug: 'invoice-requests',
        includeCurrentAppPlans: true,
      },
      {
        appSlug: '876-billing',
        featureSlug: 'billing-requests',
        includeCurrentAppPlans: true,
      },
    ])
  })

  it('keeps Billing sales and documents as explicit legacy modules', () => {
    const legacy = PLATFORM_MODULES.filter(
      (definition) =>
        definition.appSlug === '876-billing' && !definition.syncIdentity
    ).map((definition) => ({
      key: definition.key,
      featureSlug: definition.featureSlug,
    }))

    expect(legacy).toEqual([
      { key: 'sales', featureSlug: 'billing-sales' },
      { key: 'documents', featureSlug: 'billing-documents' },
    ])
  })

  it('preserves established Billing positions and appends Requests', () => {
    const positions = new Map(
      PLATFORM_MODULES.filter(
        (definition) =>
          definition.appSlug === '876-billing' && definition.syncIdentity
      ).map((definition) => [definition.key, definition.position])
    )

    expect({
      subscriptions: positions.get('subscriptions'),
      purchases: positions.get('purchases'),
      banking: positions.get('banking'),
      payroll: positions.get('payroll'),
      requests: positions.get('requests'),
    }).toEqual({
      subscriptions: 20,
      purchases: 30,
      banking: 40,
      payroll: 60,
      requests: 70,
    })
  })

  it('grants new Invoice Requests to the current plan beside the free baseline', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_invoice', slug: '876-invoice' },
    ])
    repository.listProducts.mockResolvedValue([
      {
        id: 'product_invoice_free',
        slug: INVOICE_FREE_PLAN_SLUG,
        appId: 'app_invoice',
      },
    ])

    const result = await seedPlatformPlanModules()

    expect(result.planModulesCreated).toBe(
      INVOICE_FREE_PLAN_MODULE_KEYS.length + 1
    )
    expect(repository.createApplicationModule).toHaveBeenCalledTimes(
      INVOICE_COMMERCIAL_MODULE_KEYS.length
    )
  })

  it('creates Projects modules with initial grants to its free plan', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_projects', slug: '876-projects' },
    ])
    repository.listProducts.mockResolvedValue([
      {
        id: 'product_projects_free',
        slug: PROJECTS_FREE_PLAN_SLUG,
        appId: 'app_projects',
      },
    ])

    const result = await seedPlatformPlanModules()

    expect(result).toEqual({
      modulesCreated: PROJECTS_COMMERCIAL_MODULE_KEYS.length,
      planModulesCreated: PROJECTS_FREE_PLAN_MODULE_KEYS.length,
      billingAssignments: 0,
      ownerProvisioned: false,
    })
    expect(
      repository.createApplicationModule.mock.calls.map(([params]) => ({
        key: params.key,
        grants: params.initialGrants,
      }))
    ).toEqual(
      PROJECTS_COMMERCIAL_MODULE_KEYS.map((key) => ({
        key,
        grants: [
          { id: 'planModule_generated', productId: 'product_projects_free' },
        ],
      }))
    )
  })

  it('creates Couriers modules with initial grants to free and pro plans', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_couriers', slug: '876-couriers' },
    ])
    repository.listProducts.mockResolvedValue([
      {
        id: 'product_couriers_free',
        slug: COURIERS_FREE_PLAN_SLUG,
        appId: 'app_couriers',
      },
      {
        id: 'product_couriers_pro',
        slug: COURIERS_PRO_PLAN_SLUG,
        appId: 'app_couriers',
      },
    ])

    const result = await seedPlatformPlanModules()

    expect(result).toEqual({
      modulesCreated: COURIERS_COMMERCIAL_MODULE_KEYS.length,
      planModulesCreated: COURIERS_COMMERCIAL_MODULE_KEYS.length * 2,
      billingAssignments: 0,
      ownerProvisioned: false,
    })
    expect(
      repository.createApplicationModule.mock.calls.map(([params]) => ({
        key: params.key,
        grants: params.initialGrants.map(
          (grant: { productId: string }) => grant.productId
        ),
      }))
    ).toEqual(
      COURIERS_COMMERCIAL_MODULE_KEYS.map((key) => ({
        key,
        grants: ['product_couriers_free', 'product_couriers_pro'],
      }))
    )
  })

  it('grants new Billing Requests to every current Billing plan only', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_billing', slug: '876-billing' },
    ])
    repository.listFeatures.mockResolvedValue([
      { id: 'feat_requests', slug: 'billing-requests' },
    ])
    repository.listProducts.mockResolvedValue([
      { id: 'plan_free', slug: 'billing-free', appId: 'app_billing' },
      { id: 'plan_pro', slug: 'billing-pro', appId: 'app_billing' },
      { id: 'plan_invoice', slug: 'invoice-free', appId: 'app_invoice' },
    ])

    await seedPlatformPlanModules()

    const requestsCall = repository.createApplicationModule.mock.calls.find(
      ([params]) => params.key === 'requests'
    )
    expect(requestsCall?.[0]).toEqual(
      expect.objectContaining({
        appId: 'app_billing',
        key: 'requests',
        featureId: 'feat_requests',
        initialGrants: [
          { id: 'planModule_generated', productId: 'plan_free' },
          { id: 'planModule_generated', productId: 'plan_pro' },
        ],
      })
    )
    expect(
      repository.createApplicationModule.mock.calls
        .filter(([params]) => params.appId === 'app_billing')
        .map(([params]) => params.key)
    ).toEqual([...BILLING_COMMERCIAL_MODULE_KEYS, 'sales', 'documents'])
  })

  it('does not restore a removed Requests grant after the module already exists', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_invoice', slug: '876-invoice' },
    ])
    repository.listProducts.mockResolvedValue([
      {
        id: 'product_invoice_free',
        slug: INVOICE_FREE_PLAN_SLUG,
        appId: 'app_invoice',
      },
    ])
    repository.findApplicationModule.mockImplementation(
      (_appId: string, key: string) => {
        const definition = findAppModule('876-invoice', key)
        return Promise.resolve(
          definition
            ? {
                id: `mod_${key}`,
                appId: 'app_invoice',
                key,
                name: definition.label,
                description: definition.description,
                featureId: null,
              }
            : null
        )
      }
    )

    const result = await seedPlatformPlanModules()

    expect(result.modulesCreated).toBe(0)
    expect(result.planModulesCreated).toBe(0)
    expect(repository.createApplicationModule).not.toHaveBeenCalled()
  })

  it('repairs stale registry-owned labels and descriptions without changing grants', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_invoice', slug: '876-invoice' },
    ])
    repository.findApplicationModule.mockImplementation(
      (_appId: string, key: string) =>
        Promise.resolve({
          id: `mod_${key}`,
          appId: 'app_invoice',
          key,
          name: 'Stale name',
          description: 'Stale description',
          featureId: null,
        })
    )

    const result = await seedPlatformPlanModules()

    expect(result.planModulesCreated).toBe(0)
    expect(repository.updateApplicationModuleIdentity).toHaveBeenCalledTimes(
      INVOICE_COMMERCIAL_MODULE_KEYS.length
    )
    expect(repository.createApplicationModule).not.toHaveBeenCalled()
  })

  it('renames the legacy Couriers delivery module in place before syncing identity', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_couriers', slug: '876-couriers' },
    ])
    repository.findApplicationModule.mockImplementation(
      (_appId: string, key: string) =>
        Promise.resolve(
          key === 'delivery'
            ? {
                id: 'mod_delivery',
                appId: 'app_couriers',
                key: 'delivery',
                name: 'Delivery',
                description: 'Legacy delivery module.',
                featureId: null,
              }
            : null
        )
    )

    const result = await seedPlatformPlanModules()

    expect(result.modulesCreated).toBe(4)
    expect(repository.renameApplicationModuleKey).toHaveBeenCalledTimes(1)
    expect(repository.renameApplicationModuleKey).toHaveBeenCalledWith(
      'mod_delivery',
      { key: 'deliveries', updatedAt: BigInt(1_700_000_000) }
    )
    expect(repository.createApplicationModule).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'deliveries' })
    )
    expect(repository.updateApplicationModuleIdentity).toHaveBeenCalledWith(
      'mod_delivery',
      expect.objectContaining({
        name: 'Deliveries',
        description: 'Manage courier deliveries and delivery status.',
      })
    )
  })

  it('fails loudly when legacy and canonical Couriers delivery modules coexist', async () => {
    repository.listApps.mockResolvedValue([
      { id: 'app_couriers', slug: '876-couriers' },
    ])
    repository.findApplicationModule.mockImplementation(
      (_appId: string, key: string) =>
        Promise.resolve(
          ['delivery', 'deliveries'].includes(key)
            ? {
                id: `mod_${key}`,
                appId: 'app_couriers',
                key,
                name: 'Delivery',
                description: 'Courier delivery module.',
                featureId: null,
              }
            : null
        )
    )

    await expect(seedPlatformPlanModules()).rejects.toThrow(
      'Application module key collision for 876-couriers: deliveries, delivery. Resolve the duplicate rows before rerunning the seed.'
    )
    expect(repository.renameApplicationModuleKey).not.toHaveBeenCalled()
    expect(repository.createApplicationModule).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'deliveries' })
    )
  })
})
