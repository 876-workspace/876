import { FINANCE_MODULES } from '@876/core/modules'
import { describe, expect, it } from 'vitest'

import {
  BILLING_MODULE_CATALOG,
  INVOICE_MODULE_CATALOG,
} from './settings-catalog'

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

const SHARED_KEYS = [
  'invoices',
  'quotes',
  'payments',
  'expenses',
  'items',
  'sales-receipts',
  'time-tracking',
  'customers',
  'crm',
] as const

const BILLING_ONLY_KEYS = [
  'subscriptions',
  'banking',
  'credit-notes',
  'purchases',
  'payroll',
  'price-lists',
  'discounts',
] as const

describe('finance module catalogs', () => {
  it('declares the exact shared Invoice module keys', () => {
    expect(INVOICE_MODULE_CATALOG.map((module) => module.key)).toEqual(
      SHARED_KEYS
    )
  })

  it('declares shared modules followed by the exact Billing-only keys', () => {
    expect(BILLING_MODULE_CATALOG.map((module) => module.key)).toEqual([
      ...SHARED_KEYS,
      ...BILLING_ONLY_KEYS,
    ])
  })

  it('uses canonical kebab-case for every Billing module key', () => {
    expect(
      BILLING_MODULE_CATALOG.every((module) => KEY_PATTERN.test(module.key))
    ).toBe(true)
  })

  it('uses canonical kebab-case for every Invoice module key', () => {
    expect(
      INVOICE_MODULE_CATALOG.every((module) => KEY_PATTERN.test(module.key))
    ).toBe(true)
  })

  it('keeps Billing module keys unique', () => {
    const keys = BILLING_MODULE_CATALOG.map((module) => module.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps Invoice module keys unique', () => {
    const keys = INVOICE_MODULE_CATALOG.map((module) => module.key)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('keeps shared labels and descriptions identical in both apps', () => {
    const billingByKey = new Map(
      BILLING_MODULE_CATALOG.map((module) => [module.key, module] as const)
    )

    for (const invoiceModule of INVOICE_MODULE_CATALOG) {
      const billingModule = billingByKey.get(invoiceModule.key)

      expect({
        label: billingModule?.label,
        description: billingModule?.description,
      }).toEqual({
        label: invoiceModule.label,
        description: invoiceModule.description,
      })
    }
  })

  it('derives every label and description from canonical finance identity', () => {
    const canonical = new Map(
      Object.values(FINANCE_MODULES).map((module) => [module.key, module] as const)
    )

    for (const module of BILLING_MODULE_CATALOG) {
      const identity = canonical.get(module.key)

      expect({ label: module.label, description: module.description }).toEqual({
        label: identity?.label,
        description: identity?.description,
      })
    }
  })

  it('keeps Invoice as a strict subset of Billing', () => {
    const billingKeys = new Set(
      BILLING_MODULE_CATALOG.map((module) => module.key)
    )

    expect(
      INVOICE_MODULE_CATALOG.every((module) => billingKeys.has(module.key))
    ).toBe(true)
    expect(INVOICE_MODULE_CATALOG.length).toBeLessThan(
      BILLING_MODULE_CATALOG.length
    )
  })

  it('keeps every Billing-only module out of Invoice', () => {
    // Typed as strings, not as Invoice's key union: the question this test
    // asks is whether a key outside that union is absent, which `Set<K>.has`
    // will not accept as an argument.
    const invoiceKeys = new Set<string>(
      INVOICE_MODULE_CATALOG.map((module) => module.key)
    )

    expect(BILLING_ONLY_KEYS.every((key) => !invoiceKeys.has(key))).toBe(true)
  })

  it('declares the exact preference set for every module', () => {
    const expected: Record<string, unknown[]> = {
      items: [
        {
          key: 'product-variants',
          label: 'Product variants',
          type: 'boolean',
          default: false,
          hint: 'Allow goods to have multiple sellable versions such as size or color.',
        },
      ],
      quotes: [
        {
          key: 'accepted-quote-conversion',
          label: 'Accepted quote conversion',
          type: 'enum',
          default: 'manual',
          hint: 'Choose whether accepting a quote only records the decision or also creates a draft invoice.',
          options: [
            { value: 'manual', label: 'Convert manually' },
            {
              value: 'draft-invoice-on-accept',
              label: 'Create a draft invoice on acceptance',
            },
          ],
        },
      ],
    }

    for (const catalogModule of BILLING_MODULE_CATALOG) {
      expect(catalogModule.description.length).toBeGreaterThan(0)
      expect(catalogModule.optional).toBe(true)
      expect(catalogModule.preferences).toEqual(
        expected[catalogModule.key] ?? []
      )
    }
  })

  // `crm` is deliberately opt-in; every other finance module is on by default.
  // Pinned explicitly so a new opt-out module cannot slip in unnoticed.
  it('enables every module by default except crm', () => {
    const optIn = BILLING_MODULE_CATALOG.filter(
      (module) => !module.enabledByDefault
    ).map((module) => module.key)

    expect(optIn).toEqual(['crm'])
  })
})
