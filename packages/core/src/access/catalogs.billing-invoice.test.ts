import { describe, expect, it } from 'vitest'

import {
  appPermissionCatalogs,
  billingPermissionCatalog,
  invoicePermissionCatalog,
} from './catalogs'

/**
 * Billing and Invoice permission keys are durable identifiers: they are stored
 * on `app_roles.permissions` and on every `app_assignments` grant/deny array.
 * These snapshots exist so a key can only change through a deliberate edit that
 * also updates the migration, never as a side effect of reordering a catalog.
 */
const BILLING_KEYS = [
  'banking.create',
  'banking.delete',
  'banking.edit',
  'banking.view',
  'catalog.create',
  'catalog.delete',
  'catalog.edit',
  'catalog.view',
  'currencies.create',
  'currencies.delete',
  'currencies.edit',
  'currencies.view',
  'customers.create',
  'customers.delete',
  'customers.edit',
  'customers.view',
  'dashboard.view',
  'payments.create',
  'payments.delete',
  'payments.edit',
  'payments.view',
  'purchases.create',
  'purchases.delete',
  'purchases.edit',
  'purchases.view',
  'reports.view',
  'sales.create',
  'sales.delete',
  'sales.edit',
  'sales.view',
  'settings.edit',
  'settings.view',
  'subscriptions.create',
  'subscriptions.delete',
  'subscriptions.edit',
  'subscriptions.view',
  'taxes.create',
  'taxes.delete',
  'taxes.edit',
  'taxes.view',
  'vendors.create',
  'vendors.delete',
  'vendors.edit',
  'vendors.view',
]

const INVOICE_KEYS = [
  'customers.create',
  'customers.delete',
  'customers.edit',
  'customers.view',
  'dashboard.view',
  'estimates.create',
  'estimates.delete',
  'estimates.edit',
  'estimates.export',
  'estimates.view',
  'invoices.create',
  'invoices.delete',
  'invoices.edit',
  'invoices.export',
  'invoices.view',
  'items.create',
  'items.delete',
  'items.edit',
  'items.view',
  'payments.create',
  'payments.delete',
  'payments.edit',
  'payments.view',
  'reports.view',
  'settings.edit',
  'settings.view',
]

function sortedKeys(catalog: typeof billingPermissionCatalog): string[] {
  return catalog.permissions.map((permission) => permission.key).sort()
}

describe('billingPermissionCatalog', () => {
  it('uses the platform app slug', () => {
    expect(billingPermissionCatalog.app).toBe('876-billing')
  })

  it('registers under its app slug', () => {
    expect(appPermissionCatalogs['876-billing']).toBe(billingPermissionCatalog)
  })

  it('pins the full sorted permission-key snapshot', () => {
    expect(sortedKeys(billingPermissionCatalog)).toEqual(BILLING_KEYS)
  })

  it('keeps the exact declared module order', () => {
    expect(
      billingPermissionCatalog.modules.map((module) => module.key)
    ).toEqual([
      'dashboard',
      'customers',
      'catalog',
      'sales',
      'subscriptions',
      'reports',
      'currencies',
      'taxes',
      'vendors',
      'purchases',
      'banking',
      'payments',
      'settings',
    ])
  })

  it('marks exactly the delete actions dangerous', () => {
    const dangerous = billingPermissionCatalog.permissions
      .filter((permission) => permission.isDangerous)
      .map((permission) => permission.action)
    expect(new Set(dangerous)).toEqual(new Set(['delete']))
  })

  it('declares no duplicate keys', () => {
    const keys = billingPermissionCatalog.permissions.map(
      (permission) => permission.key
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('invoicePermissionCatalog', () => {
  it('uses the platform app slug', () => {
    expect(invoicePermissionCatalog.app).toBe('876-invoice')
  })

  it('registers under its app slug', () => {
    expect(appPermissionCatalogs['876-invoice']).toBe(invoicePermissionCatalog)
  })

  it('pins the full sorted permission-key snapshot', () => {
    expect(sortedKeys(invoicePermissionCatalog)).toEqual(INVOICE_KEYS)
  })

  it('keeps the exact declared module order', () => {
    expect(
      invoicePermissionCatalog.modules.map((module) => module.key)
    ).toEqual([
      'dashboard',
      'customers',
      'items',
      'invoices',
      'estimates',
      'payments',
      'reports',
      'settings',
    ])
  })

  it('gives invoices and estimates an export action', () => {
    const exportable = invoicePermissionCatalog.permissions
      .filter((permission) => permission.action === 'export')
      .map((permission) => permission.moduleKey)
      .sort()
    expect(exportable).toEqual(['estimates', 'invoices'])
  })

  it('declares no duplicate keys', () => {
    const keys = invoicePermissionCatalog.permissions.map(
      (permission) => permission.key
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('appPermissionCatalogs registry', () => {
  it('registers every catalog under the slug it declares', () => {
    for (const [slug, catalog] of Object.entries(appPermissionCatalogs)) {
      // Console is the documented exception: its real slug is `console` while
      // the generic builder validates product slugs as `876-*`.
      const expected = slug === 'console' ? 'console' : catalog.app
      expect(expected).toBe(catalog.app)
    }
  })

  it('covers every product app that seeds app-access', () => {
    expect(Object.keys(appPermissionCatalogs).sort()).toEqual([
      '876-billing',
      '876-couriers',
      '876-crm',
      '876-invoice',
      'console',
    ])
  })
})
