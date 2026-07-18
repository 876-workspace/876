import { describe, expect, it } from 'vitest'

import { getVisibleNav, getVisibleSettingsSections } from './billing-nav-config'
import type { Permission } from '@/types/access'
import type { BillingProductFeatures } from '@/types/features'

const permissions: Permission[] = [
  'billing:access',
  'dashboard:read',
  'customers:read',
  'catalog:read',
  'sales:read',
  'subscriptions:read',
  'reports:read',
]

const disabledFeatures: BillingProductFeatures = {
  sales: false,
  quotes: false,
  estimates: false,
  invoices: false,
  subscriptions: false,
  purchases: false,
  vendors: false,
  expenses: false,
  banking: false,
  documents: false,
  payroll: false,
}

function visibleItems(features: BillingProductFeatures) {
  return getVisibleNav(permissions, features).flatMap((group) => group.items)
}

describe('getVisibleNav', () => {
  it('hides all feature-gated navigation when product flags are disabled', () => {
    const items = visibleItems(disabledFeatures)

    expect(items.map((item) => item.title)).toEqual([
      'Home',
      'Customers',
      'Items',
      'Reports',
    ])
  })

  it('filters sales children and links the parent to the first visible child', () => {
    const items = visibleItems({
      ...disabledFeatures,
      sales: true,
      invoices: true,
    })
    const sales = items.find((item) => item.title === 'Sales')

    expect(sales?.href).toBe('/invoices')
    expect(sales?.children?.map((child) => child.title)).toEqual([
      'Invoices',
      'Credit Notes',
    ])
  })

  it('shows subscriptions as one flag with its complete navigation', () => {
    const items = visibleItems({
      ...disabledFeatures,
      subscriptions: true,
    })
    const subscriptions = items.find((item) => item.title === 'Subscriptions')

    expect(subscriptions?.href).toBe('/subscriptions')
    expect(subscriptions?.children?.map((child) => child.title)).toEqual([
      'Products',
      'Plans',
      'Add-ons',
      'Prices',
      'Coupons',
      'Price Lists',
    ])
  })

  it('shows purchase children only when their master and child flags are on', () => {
    const items = visibleItems({
      ...disabledFeatures,
      purchases: true,
      expenses: true,
    })
    const purchases = items.find((item) => item.title === 'Purchases')

    expect(purchases?.href).toBe('/purchases/expenses')
    expect(purchases?.children?.map((child) => child.title)).toEqual([
      'Expenses',
    ])
  })

  it('shows payments and banking only with their resource permissions', () => {
    const visible = getVisibleNav(
      [...permissions, 'payments:read', 'banking:read'],
      { ...disabledFeatures, sales: true, banking: true }
    ).flatMap((group) => group.items)

    expect(
      visible
        .find((item) => item.title === 'Sales')
        ?.children?.map((child) => child.title)
    ).toEqual(['Payments Received'])
    expect(visible.some((item) => item.title === 'Banking')).toBe(true)
  })

  it('filters Console-style settings cards by Billing permissions', () => {
    const sections = getVisibleSettingsSections([
      'billing:access',
      'settings:read',
      'payments:read',
      'roles:read',
    ])

    expect(sections.map((section) => section.title)).toEqual([
      'Payment Modes',
      'Payment Providers',
      'Roles & Permissions',
    ])
  })
})
