import { describe, expect, it } from 'vitest'

import {
  APP_MODULE_REGISTRIES,
  BILLING_COMMERCIAL_MODULE_KEYS,
  BILLING_MODULE_REGISTRY,
  COMMERCE_COMMERCIAL_MODULE_KEYS,
  COMMERCE_MODULE_REGISTRY,
  defineAppModuleRegistry,
  FINANCE_MODULES,
  findAppModule,
  getAppModuleRegistry,
  INVOICE_COMMERCIAL_MODULE_KEYS,
  INVOICE_MODULE_REGISTRY,
  PROJECTS_COMMERCIAL_MODULE_KEYS,
  PROJECTS_MODULE_REGISTRY,
  PROJECTS_MODULES,
  SHARED_APP_MODULES,
} from './modules'

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('canonical application module registry', () => {
  it('keeps Invoice module identity in the expected declaration order', () => {
    expect(INVOICE_MODULE_REGISTRY.modules.map((module) => module.key)).toEqual(
      [
        'invoices',
        'quotes',
        'payments',
        'expenses',
        'items',
        'sales-receipts',
        'time-tracking',
        'customers',
        'requests',
      ]
    )
  })

  it('reuses the same shared module definitions in Billing and Invoice', () => {
    const billing = new Map(
      BILLING_MODULE_REGISTRY.modules.map((module) => [module.key, module])
    )

    expect(
      INVOICE_MODULE_REGISTRY.modules.every(
        (module) => billing.get(module.key) === module
      )
    ).toBe(true)
  })

  it('projects CRM-owned Requests into both finance apps without redefining it', () => {
    expect(findAppModule('876-invoice', 'requests')).toBe(
      SHARED_APP_MODULES.requests
    )
    expect(findAppModule('876-billing', 'requests')).toBe(
      SHARED_APP_MODULES.requests
    )
  })

  it('keeps Billing as a strict superset of Invoice', () => {
    const invoiceKeys = INVOICE_MODULE_REGISTRY.modules.map(
      (module) => module.key
    )
    const billingKeys = BILLING_MODULE_REGISTRY.modules.map(
      (module) => module.key
    )

    expect(billingKeys.slice(0, invoiceKeys.length)).toEqual(invoiceKeys)
    expect(billingKeys.length).toBeGreaterThan(invoiceKeys.length)
  })

  it('registers Projects around product capabilities rather than every permission domain', () => {
    const keys = PROJECTS_MODULE_REGISTRY.modules.map((module) => module.key)

    expect(keys).toEqual(['projects', 'issues', 'reports'])
    for (const key of [
      'dashboard',
      'comments',
      'labels',
      'members',
      'settings',
    ])
      expect(keys).not.toContain(key)
  })

  it('registers the stable Commerce capability vocabulary in declaration order', () => {
    expect(
      COMMERCE_MODULE_REGISTRY.modules.map((module) => module.key)
    ).toEqual([
      'catalog',
      'orders',
      'customers',
      'inventory',
      'storefront',
      'checkout',
      'payments',
      'discounts',
      'shipping',
      'fulfillment',
      'returns',
      'markets',
      'marketing',
      'analytics',
      'pos',
      'b2b',
      'subscriptions',
      'channels',
      'automation',
    ])
  })

  it('uses canonical kebab-case keys with unique keys per app', () => {
    const results = Object.values(APP_MODULE_REGISTRIES).map((registry) => {
      const keys = registry.modules.map((module) => module.key)
      return {
        app: registry.app,
        canonical: keys.every((key) => KEY_PATTERN.test(key)),
        unique: new Set(keys).size === keys.length,
      }
    })

    expect(results).toEqual([
      { app: '876-billing', canonical: true, unique: true },
      { app: '876-invoice', canonical: true, unique: true },
      { app: '876-projects', canonical: true, unique: true },
      { app: '876-commerce', canonical: true, unique: true },
    ])
  })

  it('keeps the standalone CRM product out of finance commercial projections', () => {
    expect({
      invoiceHasCrm: new Set<string>(INVOICE_COMMERCIAL_MODULE_KEYS).has('crm'),
      billingHasCrm: new Set<string>(BILLING_COMMERCIAL_MODULE_KEYS).has('crm'),
    }).toEqual({ invoiceHasCrm: false, billingHasCrm: false })
  })

  it('materializes Requests commercially for both finance apps', () => {
    expect(
      new Set<string>(INVOICE_COMMERCIAL_MODULE_KEYS).has('requests')
    ).toBe(true)
    expect(
      new Set<string>(BILLING_COMMERCIAL_MODULE_KEYS).has('requests')
    ).toBe(true)
  })

  it('exposes only Billing keys with existing effective commercial semantics', () => {
    expect([...BILLING_COMMERCIAL_MODULE_KEYS]).toEqual([
      'subscriptions',
      'purchases',
      'banking',
      'payroll',
      'requests',
    ])
  })

  it('commercializes only implemented Projects module gates', () => {
    const keys = [...PROJECTS_COMMERCIAL_MODULE_KEYS]

    expect(keys).toEqual(['projects', 'issues'])
    expect(keys).not.toContain(PROJECTS_MODULES.reports.key)
  })

  it('does not make Commerce capabilities sellable by declaring their identity', () => {
    expect(COMMERCE_MODULE_REGISTRY.modules).toHaveLength(19)
    expect([...COMMERCE_COMMERCIAL_MODULE_KEYS]).toEqual([])
  })

  it('resolves registered apps and modules without fallback definitions', () => {
    expect(getAppModuleRegistry('876-invoice')).toBe(INVOICE_MODULE_REGISTRY)
    expect(findAppModule('876-invoice', 'invoices')).toBe(
      FINANCE_MODULES.invoices
    )
  })

  it('resolves Projects and Commerce canonical modules by app and key', () => {
    expect(findAppModule('876-projects', 'issues')).toBe(
      PROJECTS_MODULES.issues
    )
    expect(findAppModule('876-commerce', 'catalog')).toBe(
      COMMERCE_MODULE_REGISTRY.modules[0]
    )
  })

  it('returns undefined for unknown apps and module keys', () => {
    expect(getAppModuleRegistry('876-unknown')).toBeUndefined()
    expect(findAppModule('876-invoice', 'unknown')).toBeUndefined()
  })

  it.each(['__proto__', 'constructor', 'toString'])(
    'treats %s as an unknown app',
    (app) => {
      expect(getAppModuleRegistry(app)).toBeUndefined()
      expect(findAppModule(app, 'invoices')).toBeUndefined()
    }
  )

  it('rejects duplicate module keys', () => {
    expect(() =>
      defineAppModuleRegistry({
        app: '876-test',
        modules: [
          FINANCE_MODULES.invoices,
          {
            key: 'invoices',
            label: 'Invoices again',
            description: 'Duplicate identity.',
          },
        ],
      })
    ).toThrow('Duplicate module key: invoices')
  })

  it('rejects invalid module keys', () => {
    expect(() =>
      defineAppModuleRegistry({
        app: '876-test',
        modules: [
          {
            key: 'sales_receipts',
            label: 'Sales receipts',
            description: 'Invalid identifier.',
          },
        ],
      })
    ).toThrow('Invalid module key: sales_receipts')
  })

  it('rejects incomplete module identity metadata', () => {
    expect(() =>
      defineAppModuleRegistry({
        app: '876-test',
        modules: [
          { key: 'valid-key', label: 'Valid label', description: '   ' },
        ],
      })
    ).toThrow('Module valid-key must have a description')
  })
})
