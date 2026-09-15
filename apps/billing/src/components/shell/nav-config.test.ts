import type {
  AccessContext,
  NavEntry,
  NavGroupDefinition,
} from '@876/core/access'
import { describe, expect, it } from 'vitest'

import {
  billingNavigation,
  getVisibleSettingsSections,
  resolveBillingNavigation,
} from './nav-config'
import { BILLING_PERMISSION_VALUES } from '@/types/permission-values'

function context(
  permissions: string[],
  features: string[] = []
): AccessContext {
  return {
    subject: { userId: 'user_1' },
    permissions,
    features,
    experiments: {},
  }
}

function entries(groups: readonly NavGroupDefinition[]): NavEntry[] {
  return groups.flatMap((group) => group.entries)
}

function allEntries(groups: readonly NavGroupDefinition[]): NavEntry[] {
  return entries(groups).flatMap((entry) => [
    entry,
    ...(entry.children
      ? allEntries([{ key: entry.key, entries: entry.children }])
      : []),
  ])
}

function resolvedEntry(
  permissions: string[],
  features: string[],
  key: string
): NavEntry | undefined {
  return entries(resolveBillingNavigation(context(permissions, features))).find(
    (entry) => entry.key === key
  )
}

describe('resolveBillingNavigation', () => {
  it('shows the exact non-feature navigation for a fully-permitted member', () => {
    expect(
      entries(
        resolveBillingNavigation(context([...BILLING_PERMISSION_VALUES]))
      ).map((entry) => entry.title)
    ).toEqual(['Home', 'Customers', 'Items', 'Reports', 'Settings'])
  })

  it('shows Requests only when permission and feature are both present', () => {
    expect(resolvedEntry(['customers:read'], [], 'requests')).toBeUndefined()
    expect(resolvedEntry([], ['billing-requests'], 'requests')).toBeUndefined()

    const requests = resolvedEntry(
      ['customers:read'],
      ['billing-requests'],
      'requests'
    )
    expect({
      href: requests?.href,
      children: requests?.children?.map((child) => child.href),
    }).toEqual({
      href: '/requests',
      children: ['/requests', '/requests/customers', '/requests/forms'],
    })
  })

  it('returns no navigation without permissions', () => {
    expect(
      resolveBillingNavigation(
        context(
          [],
          ['billing-sales', 'billing-sales-quotes', 'billing-subscriptions']
        )
      )
    ).toEqual([])
  })

  it('re-points Sales to its first visible declared child', () => {
    const sales = resolvedEntry(
      ['sales:read'],
      ['billing-sales', 'billing-sales-invoices'],
      'sales'
    )

    expect({
      href: sales?.href,
      children: sales?.children?.map((child) => child.title),
    }).toEqual({
      href: '/invoices',
      children: [
        'Invoices',
        'Recurring Invoices',
        'Sales Receipts',
        'Credit Notes',
      ],
    })
  })

  it('gates Recurring Invoices and Sales Receipts on the invoices feature', () => {
    const withoutFeature = resolvedEntry(
      ['sales:read'],
      ['billing-sales'],
      'sales'
    )
    const withFeature = resolvedEntry(
      ['sales:read'],
      ['billing-sales', 'billing-sales-invoices'],
      'sales'
    )

    expect(withoutFeature).toBeUndefined()
    expect(withFeature?.children?.map((child) => child.title)).toContain(
      'Recurring Invoices'
    )
    expect(withFeature?.children?.map((child) => child.title)).toContain(
      'Sales Receipts'
    )
  })

  it('does not leak Sales children when the master feature is disabled', () => {
    expect(
      entries(
        resolveBillingNavigation(
          context(['sales:read'], ['billing-sales-quotes'])
        )
      ).map((entry) => entry.title)
    ).toEqual([])
  })

  it('keeps Subscriptions at its declared href and child order', () => {
    const subscriptions = resolvedEntry(
      ['subscriptions:read'],
      ['billing-subscriptions'],
      'subscriptions'
    )

    expect({
      href: subscriptions?.href,
      children: subscriptions?.children?.map((child) => child.title),
    }).toEqual({
      href: '/subscriptions',
      children: [
        'Products',
        'Plans',
        'Add-ons',
        'Prices',
        'Coupons',
        'Price Lists',
      ],
    })
  })

  it('re-points Purchases to Expenses when Vendors is disabled', () => {
    const purchases = resolvedEntry(
      ['billing:access'],
      ['billing-purchases', 'billing-purchases-expenses'],
      'purchases'
    )

    expect({
      href: purchases?.href,
      children: purchases?.children?.map((child) => child.title),
    }).toEqual({ href: '/purchases/expenses', children: ['Expenses'] })
  })

  it('shows Payments Received only with its permission', () => {
    const withoutPayments = resolvedEntry(
      ['sales:read'],
      ['billing-sales', 'billing-sales-quotes'],
      'sales'
    )
    const withPayments = resolvedEntry(
      ['sales:read', 'payments:read'],
      ['billing-sales', 'billing-sales-quotes'],
      'sales'
    )

    expect(withoutPayments?.children?.map((child) => child.title)).toEqual([
      'Quotes',
    ])
    expect(withPayments?.children?.map((child) => child.title)).toEqual([
      'Quotes',
      'Payments Received',
    ])
  })

  it('hides Banking without its permission', () => {
    expect(
      entries(resolveBillingNavigation(context([], ['billing-banking']))).map(
        (entry) => entry.title
      )
    ).toEqual([])
  })

  it('hides Banking without its feature', () => {
    expect(
      entries(resolveBillingNavigation(context(['banking:read']))).map(
        (entry) => entry.title
      )
    ).toEqual([])
  })

  it('places Settings in the secondary group', () => {
    const navigation = resolveBillingNavigation(context(['settings:read']))

    expect(
      navigation.map((group) => ({
        key: group.key,
        titles: group.entries.map((entry) => entry.title),
      }))
    ).toEqual([{ key: 'secondary', titles: ['Settings'] }])
  })

  it('returns string icons and JSON-serializable navigation', () => {
    const resolved = resolveBillingNavigation(
      context(
        [...BILLING_PERMISSION_VALUES],
        [
          'billing-requests',
          'billing-sales',
          'billing-sales-quotes',
          'billing-subscriptions',
          'billing-purchases',
          'billing-purchases-vendors',
          'billing-banking',
          'billing-payroll',
        ]
      )
    )

    expect(allEntries(resolved).map((entry) => typeof entry.icon)).toEqual(
      allEntries(resolved).map(() => 'string')
    )
    expect(JSON.parse(JSON.stringify(resolved))).toEqual(resolved)
  })

  it('does not mutate the declared navigation registry', () => {
    const before = structuredClone(billingNavigation)

    resolveBillingNavigation(
      context(['sales:read'], ['billing-sales', 'billing-sales-invoices'])
    )

    expect(billingNavigation).toEqual(before)
  })

  it('uses only permissions in the Billing permission catalog', () => {
    const permissions = allEntries(billingNavigation).flatMap((entry) =>
      entry.requires?.permission ? [entry.requires.permission] : []
    )

    expect(permissions).toEqual([
      'dashboard:read',
      'customers:read',
      'customers:read',
      'catalog:read',
      'sales:read',
      'sales-orders:read',
      'payments:read',
      'subscriptions:read',
      'billing:access',
      'banking:read',
      'billing:access',
      'reports:read',
      'settings:read',
    ])
    expect(
      permissions.every((permission) =>
        new Set<string>(BILLING_PERMISSION_VALUES).has(permission)
      )
    ).toBe(true)
  })
})

describe('getVisibleSettingsSections', () => {
  it('filters Console-style settings cards by Billing permissions', () => {
    expect(
      getVisibleSettingsSections([
        'billing:access',
        'settings:read',
        'payments:read',
        'roles:read',
      ]).map((section) => section.title)
    ).toEqual([
      'Payment Modes',
      'Payment Providers',
      'Accounting Providers',
      'Roles & Permissions',
    ])
  })

  it('exposes Templates and Branding to sales readers with their settings hrefs', () => {
    expect(
      getVisibleSettingsSections(['billing:access', 'sales:read']).map(
        (section) => ({
          title: section.title,
          href: section.href,
          permissions: section.permissions,
        })
      )
    ).toEqual([
      {
        title: 'Billing & Sales',
        href: '/settings/billing',
        permissions: ['sales:read'],
      },
      {
        title: 'Templates',
        href: '/settings/templates',
        permissions: ['sales:read'],
      },
      {
        title: 'Branding',
        href: '/settings/branding',
        permissions: ['sales:read'],
      },
    ])
  })
})
