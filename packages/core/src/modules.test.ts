import { describe, expect, it } from 'vitest'

import {
  APP_MODULE_REGISTRIES,
  BILLING_COMMERCIAL_MODULE_KEYS,
  BILLING_MODULE_REGISTRY,
  defineAppModuleRegistry,
  FINANCE_MODULES,
  findAppModule,
  getAppModuleRegistry,
  INVOICE_COMMERCIAL_MODULE_KEYS,
  INVOICE_MODULE_REGISTRY,
} from './modules'

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('canonical application module registry', () => {
  it('keeps Invoice module identity in the expected declaration order', () => {
    // ARRANGE
    const expected = [
      'invoices',
      'quotes',
      'payments',
      'expenses',
      'items',
      'sales-receipts',
      'time-tracking',
      'customers',
    ]

    // ACT
    const keys = INVOICE_MODULE_REGISTRY.modules.map((module) => module.key)

    // ASSERT
    expect(keys).toEqual(expected)
  })

  it('reuses the same shared module definitions in Billing and Invoice', () => {
    // ARRANGE
    const billing = new Map(
      BILLING_MODULE_REGISTRY.modules.map((module) => [module.key, module])
    )

    // ACT
    const shared = INVOICE_MODULE_REGISTRY.modules.map((module) => ({
      key: module.key,
      sameObject: billing.get(module.key) === module,
    }))

    // ASSERT
    expect(shared).toEqual(
      INVOICE_MODULE_REGISTRY.modules.map((module) => ({
        key: module.key,
        sameObject: true,
      }))
    )
  })

  it('keeps Billing as a strict superset of Invoice', () => {
    // ARRANGE
    const invoiceKeys = INVOICE_MODULE_REGISTRY.modules.map(
      (module) => module.key
    )

    // ACT
    const billingKeys = BILLING_MODULE_REGISTRY.modules.map(
      (module) => module.key
    )

    // ASSERT
    expect(billingKeys.slice(0, invoiceKeys.length)).toEqual(invoiceKeys)
    expect(billingKeys.length).toBeGreaterThan(invoiceKeys.length)
  })

  it('uses canonical kebab-case keys with unique keys per app', () => {
    // ARRANGE
    const registries = Object.values(APP_MODULE_REGISTRIES)

    // ACT
    const results = registries.map((registry) => {
      const keys = registry.modules.map((module) => module.key)
      return {
        app: registry.app,
        canonical: keys.every((key) => KEY_PATTERN.test(key)),
        unique: new Set(keys).size === keys.length,
      }
    })

    // ASSERT
    expect(results).toEqual([
      { app: '876-billing', canonical: true, unique: true },
      { app: '876-invoice', canonical: true, unique: true },
    ])
  })

  it('keeps crm out of the commercial module projections', () => {
    // ARRANGE
    const invoiceCommercial = new Set<string>(INVOICE_COMMERCIAL_MODULE_KEYS)
    const billingCommercial = new Set<string>(BILLING_COMMERCIAL_MODULE_KEYS)

    // ACT
    const result = {
      invoiceHasCrm: invoiceCommercial.has('crm'),
      billingHasCrm: billingCommercial.has('crm'),
    }

    // ASSERT
    expect(result).toEqual({ invoiceHasCrm: false, billingHasCrm: false })
  })

  it('exposes only Billing keys with existing effective commercial semantics', () => {
    // ARRANGE
    const expected = ['subscriptions', 'purchases', 'banking', 'payroll']

    // ACT
    const keys = [...BILLING_COMMERCIAL_MODULE_KEYS]

    // ASSERT
    expect(keys).toEqual(expected)
  })

  it('resolves registered apps and modules without fallback definitions', () => {
    // ARRANGE
    const expectedModule = FINANCE_MODULES.invoices

    // ACT
    const registry = getAppModuleRegistry('876-invoice')
    const definition = findAppModule('876-invoice', 'invoices')

    // ASSERT
    expect(registry).toBe(INVOICE_MODULE_REGISTRY)
    expect(definition).toBe(expectedModule)
  })

  it('returns undefined for unknown apps and module keys', () => {
    // ARRANGE
    const app = '876-unknown'

    // ACT
    const registry = getAppModuleRegistry(app)
    const definition = findAppModule('876-invoice', 'unknown')

    // ASSERT
    expect(registry).toBeUndefined()
    expect(definition).toBeUndefined()
  })

  it.each(['__proto__', 'constructor', 'toString'])(
    'treats %s as an unknown app',
    (app) => {
      expect(getAppModuleRegistry(app)).toBeUndefined()
      expect(findAppModule(app, 'invoices')).toBeUndefined()
    }
  )

  it('rejects duplicate module keys', () => {
    // ARRANGE
    const duplicate = {
      key: 'invoices',
      label: 'Invoices again',
      description: 'Duplicate identity.',
    }

    // ACT / ASSERT
    expect(() =>
      defineAppModuleRegistry({
        app: '876-test',
        modules: [FINANCE_MODULES.invoices, duplicate],
      })
    ).toThrow('Duplicate module key: invoices')
  })

  it('rejects invalid module keys', () => {
    // ARRANGE
    const invalidKey = {
      key: 'sales_receipts',
      label: 'Sales receipts',
      description: 'Invalid identifier.',
    }

    // ACT / ASSERT
    expect(() =>
      defineAppModuleRegistry({ app: '876-test', modules: [invalidKey] })
    ).toThrow('Invalid module key: sales_receipts')
  })

  it('rejects incomplete module identity metadata', () => {
    // ARRANGE
    const missingDescription = {
      key: 'valid-key',
      label: 'Valid label',
      description: '   ',
    }

    // ACT / ASSERT
    expect(() =>
      defineAppModuleRegistry({
        app: '876-test',
        modules: [missingDescription],
      })
    ).toThrow('Module valid-key must have a description')
  })
})
