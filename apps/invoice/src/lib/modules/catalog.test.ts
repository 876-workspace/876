import { describe, expect, it } from 'vitest'

import { INVOICE_MODULE_KEYS, isInvoiceModuleKey } from './catalog'

describe('isInvoiceModuleKey', () => {
  it('accepts a shared finance module key', () => {
    expect(isInvoiceModuleKey('invoices')).toBe(true)
  })

  it('rejects a Billing-only module key', () => {
    expect(isInvoiceModuleKey('subscriptions')).toBe(false)
  })

  it('rejects an unknown module key', () => {
    expect(isInvoiceModuleKey('not-a-module')).toBe(false)
  })

  it('rejects an underscore-form module key', () => {
    expect(isInvoiceModuleKey('sales_receipts')).toBe(false)
  })

  it('rejects an empty module key', () => {
    expect(isInvoiceModuleKey('')).toBe(false)
  })
})

describe('INVOICE_MODULE_KEYS', () => {
  it('is derived in the same order as the shared catalog', () => {
    expect(INVOICE_MODULE_KEYS).toEqual([
      'invoices',
      'quotes',
      'payments',
      'expenses',
      'items',
      'sales-receipts',
      'time-tracking',
      'customers',
    ])
  })
})
