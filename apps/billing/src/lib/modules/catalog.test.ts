import { describe, expect, it } from 'vitest'

import {
  BILLING_MODULE_CATALOG,
  BILLING_MODULE_KEYS,
  isBillingModuleKey,
} from './catalog'

describe('isBillingModuleKey', () => {
  it('accepts a shared finance module key', () => {
    expect(isBillingModuleKey('invoices')).toBe(true)
  })

  it('accepts the shared CRM module seam', () => {
    expect(isBillingModuleKey('crm')).toBe(true)
  })

  it('accepts a Billing-only module key', () => {
    expect(isBillingModuleKey('subscriptions')).toBe(true)
  })

  it('rejects an unknown module key', () => {
    expect(isBillingModuleKey('not-a-module')).toBe(false)
  })

  it('rejects an underscore-form module key', () => {
    expect(isBillingModuleKey('sales_receipts')).toBe(false)
  })

  it('rejects an empty module key', () => {
    expect(isBillingModuleKey('')).toBe(false)
  })
})

describe('BILLING_MODULE_KEYS', () => {
  it('is derived in the same order as the catalog', () => {
    expect(BILLING_MODULE_KEYS).toEqual([
      'invoices',
      'quotes',
      'payments',
      'expenses',
      'items',
      'sales-receipts',
      'time-tracking',
      'customers',
      'crm',
      'subscriptions',
      'banking',
      'credit-notes',
      'purchases',
      'payroll',
      'price-lists',
      'discounts',
    ])
  })

  it('keeps the embedded CRM seam optional and disabled by default', () => {
    expect(BILLING_MODULE_CATALOG.find((module) => module.key === 'crm')).toMatchObject({
      optional: true,
      enabledByDefault: false,
    })
  })
})
