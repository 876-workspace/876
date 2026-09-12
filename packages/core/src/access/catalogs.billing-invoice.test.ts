import { describe, expect, it } from 'vitest'

import { FINANCE_MODULES } from '../modules'
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
  'payment-methods.create',
  'payment-methods.delete',
  'payment-methods.edit',
  'payment-methods.view',
  'payments.create',
  'payments.delete',
  'payments.edit',
  'payments.view',
  'purchases.create',
  'purchases.delete',
  'purchases.edit',
  'purchases.view',
  'reports.view',
  'requests.create',
  'requests.edit',
  'requests.view',
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
  'calendars.create',
  'calendars.delete',
  'calendars.edit',
  'calendars.view',
  'customers.create',
  'customers.delete',
  'customers.edit',
  'customers.view',
  'dashboard.view',
  'events.create',
  'events.delete',
  'events.edit',
  'events.invite',
  'events.respond',
  'events.view',
  'invoices.create',
  'invoices.delete',
  'invoices.edit',
  'invoices.export',
  'invoices.view',
  'items.create',
  'items.delete',
  'items.edit',
  'items.view',
  'my-work.view',
  'payments.create',
  'payments.delete',
  'payments.edit',
  'payments.view',
  'quotes.create',
  'quotes.delete',
  'quotes.edit',
  'quotes.export',
  'quotes.view',
  'reminders.create',
  'reminders.delete',
  'reminders.edit',
  'reminders.view',
  'reports.view',
  'requests.create',
  'requests.edit',
  'requests.view',
  'settings.edit',
  'settings.view',
  'tasks.assign',
  'tasks.create',
  'tasks.delete',
  'tasks.edit',
  'tasks.respond',
  'tasks.view',
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
      'payment-methods',
      'requests',
      'settings',
    ])
  })

  it('reuses canonical labels for matching finance modules', () => {
    const labels = new Map(
      billingPermissionCatalog.modules.map((module) => [
        module.key,
        module.label,
      ])
    )

    expect({
      customers: labels.get('customers'),
      subscriptions: labels.get('subscriptions'),
      purchases: labels.get('purchases'),
      banking: labels.get('banking'),
      payments: labels.get('payments'),
    }).toEqual({
      customers: FINANCE_MODULES.customers.label,
      subscriptions: FINANCE_MODULES.subscriptions.label,
      purchases: FINANCE_MODULES.purchases.label,
      banking: FINANCE_MODULES.banking.label,
      payments: FINANCE_MODULES.payments.label,
    })
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
      'quotes',
      'payments',
      'requests',
      'tasks',
      'reminders',
      'events',
      'calendars',
      'my-work',
      'reports',
      'settings',
    ])
  })

  it('reuses canonical labels for every matching finance module', () => {
    const labels = new Map(
      invoicePermissionCatalog.modules.map((module) => [
        module.key,
        module.label,
      ])
    )

    expect({
      customers: labels.get('customers'),
      items: labels.get('items'),
      invoices: labels.get('invoices'),
      quotes: labels.get('quotes'),
      payments: labels.get('payments'),
    }).toEqual({
      customers: FINANCE_MODULES.customers.label,
      items: FINANCE_MODULES.items.label,
      invoices: FINANCE_MODULES.invoices.label,
      quotes: FINANCE_MODULES.quotes.label,
      payments: FINANCE_MODULES.payments.label,
    })
  })

  it('gives invoices and quotes an export action', () => {
    const exportable = invoicePermissionCatalog.permissions
      .filter((permission) => permission.action === 'export')
      .map((permission) => permission.moduleKey)
      .sort()
    expect(exportable).toEqual(['invoices', 'quotes'])
  })

  it('grants the Work session API vocabulary needed by the widget', () => {
    const workPermissions = invoicePermissionCatalog.permissions
      .filter((permission) =>
        ['tasks', 'reminders', 'events', 'calendars', 'my-work'].includes(
          permission.moduleKey
        )
      )
      .map((permission) => permission.key)
      .sort()

    expect(workPermissions).toEqual([
      'calendars.create',
      'calendars.delete',
      'calendars.edit',
      'calendars.view',
      'events.create',
      'events.delete',
      'events.edit',
      'events.invite',
      'events.respond',
      'events.view',
      'my-work.view',
      'reminders.create',
      'reminders.delete',
      'reminders.edit',
      'reminders.view',
      'tasks.assign',
      'tasks.create',
      'tasks.delete',
      'tasks.edit',
      'tasks.respond',
      'tasks.view',
    ])
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
      '876-projects',
      'console',
    ])
  })
})

describe('finance request role grants', () => {
  it.each([
    ['876-billing', billingPermissionCatalog],
    ['876-invoice', invoicePermissionCatalog],
  ] as const)('%s declares all three request capabilities', (_app, catalog) => {
    expect(
      catalog.permissions
        .filter((permission) => permission.moduleKey === 'requests')
        .map((permission) => permission.key)
        .sort()
    ).toEqual(['requests.create', 'requests.edit', 'requests.view'])
  })
})
