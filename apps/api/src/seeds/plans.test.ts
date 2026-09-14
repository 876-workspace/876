import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BILLING_COMMERCIAL_MODULE_KEYS,
  INVOICE_COMMERCIAL_MODULE_KEYS,
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
  PLATFORM_MODULES,
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
    appId: params.appId,
    key: params.key,
    name: params.name,
    description: params.description,
    featureId: params.featureId,
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
    // ARRANGE
    const invoiceDefinitions = PLATFORM_MODULES.filter(
      (definition) =>
        definition.appSlug === '876-invoice' && definition.syncIdentity
    )

    // ACT
    const identity = invoiceDefinitions.map((definition) => {
      const canonical = findAppModule('876-invoice', definition.key)
      return {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        canonicalName: canonical?.label,
        canonicalDescription: canonical?.description,
      }
    })

    // ASSERT
    expect(invoiceDefinitions.map((definition) => definition.key)).toEqual(
      INVOICE_COMMERCIAL_MODULE_KEYS
    )
    expect(identity).toEqual(
      invoiceDefinitions.map((definition) => ({
        key: definition.key,
        name: definition.name,
        description: definition.description,
        canonicalName: definition.name,
        canonicalDescription: definition.description,
      }))
    )
    expect(
      invoiceDefinitions.some((definition) => definition.key === 'crm')
    ).toBe(false)
  })

  it('binds Requests to app-scoped rollout flags in both finance apps', () => {
    // ARRANGE
    const definitions = PLATFORM_MODULES.filter(
      (definition) => definition.key === 'requests'
    )

    // ACT
    const bindings = definitions.map((definition) => ({
      appSlug: definition.appSlug,
      featureSlug: definition.featureSlug,
      includeCurrentAppPlans: definition.includeCurrentAppPlans,
    }))

    // ASSERT
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
    // ARRANGE
    const billingDefinitions = PLATFORM_MODULES.filter(
      (definition) => definition.appSlug === '876-billing'
    )

    // ACT
    const legacy = billingDefinitions
      .filter((definition) => !definition.syncIdentity)
      .map((definition) => ({
        key: definition.key,
        featureSlug: definition.featureSlug,
      }))

    // ASSERT
    expect(legacy).toEqual([
      { key: 'sales', featureSlug: 'billing-sales' },
      { key: 'documents', featureSlug: 'billing-documents' },
    ])
  })

  it('preserves established Billing positions and appends Requests', () => {
    // ARRANGE
    const billingDefinitions = new Map(
      PLATFORM_MODULES.filter(
        (definition) =>
          definition.appSlug === '876-billing' && definition.syncIdentity
      ).map((definition) => [definition.key, definition.position])
    )

    // ACT
    const positions = {
      subscriptions: billingDefinitions.get('subscriptions'),
      purchases: billingDefinitions.get('purchases'),
      banking: billingDefinitions.get('banking'),
      payroll: billingDefinitions.get('payroll'),
      requests: billingDefinitions.get('requests'),
    }

    // ASSERT
    expect(positions).toEqual({
      subscriptions: 20,
      purchases: 30,
      banking: 40,
      payroll: 60,
      requests: 70,
    })
  })

  it('grants new Invoice Requests to the current plan beside the free baseline', async () => {
    // ARRANGE
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

    // ACT
    const result = await seedPlatformPlanModules()

    // ASSERT
    expect(result).toEqual({
      modulesCreated: INVOICE_COMMERCIAL_MODULE_KEYS.length,
      planModulesCreated: INVOICE_FREE_PLAN_MODULE_KEYS.length + 1,
      billingAssignments: 0,
      ownerProvisioned: false,
    })
    expect(repository.createApplicationModule).toHaveBeenCalledTimes(
      INVOICE_COMMERCIAL_MODULE_KEYS.length
    )
    expect(
      repository.createApplicationModule.mock.calls.map(
        ([params]) => (params as { key: string }).key
      )
    ).toEqual(INVOICE_COMMERCIAL_MODULE_KEYS)
    expect(
      repository.createApplicationModule.mock.calls.map(([params]) => ({
        key: params.key,
        grants: params.initialGrants,
      }))
    ).toEqual(
      INVOICE_COMMERCIAL_MODULE_KEYS.map((key) => ({
        key,
        grants:
          new Set<string>(INVOICE_FREE_PLAN_MODULE_KEYS).has(key) ||
          key === 'requests'
            ? [{ id: 'planModule_generated', productId: 'product_invoice_free' }]
            : [],
      }))
    )
  })

  it('grants new Billing Requests to every current Billing plan only', async () => {
    // ARRANGE
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

    // ACT
    await seedPlatformPlanModules()

    // ASSERT
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
    ).toEqual([
      ...BILLING_COMMERCIAL_MODULE_KEYS,
      'sales',
      'documents',
    ])
  })

  it('does not restore a removed Requests grant after the module already exists', async () => {
    // ARRANGE
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

    // ACT
    const result = await seedPlatformPlanModules()

    // ASSERT
    expect(result).toEqual({
      modulesCreated: 0,
      planModulesCreated: 0,
      billingAssignments: 0,
      ownerProvisioned: false,
    })
    expect(repository.createApplicationModule).not.toHaveBeenCalled()
  })

  it('repairs stale registry-owned labels and descriptions without changing grants', async () => {
    // ARRANGE
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

    // ACT
    const result = await seedPlatformPlanModules()

    // ASSERT
    expect(result.planModulesCreated).toBe(0)
    expect(repository.updateApplicationModuleIdentity).toHaveBeenCalledTimes(
      INVOICE_COMMERCIAL_MODULE_KEYS.length
    )
    expect(repository.createApplicationModule).not.toHaveBeenCalled()
    expect(repository.updateApplicationModuleIdentity).toHaveBeenCalledWith(
      'mod_invoices',
      {
        name: 'Invoices',
        description: 'Create, issue, and manage customer invoices.',
        updatedAt: BigInt(1_700_000_000),
      }
    )
  })
})
