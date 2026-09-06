import { describe, expect, it } from 'vitest'

import { BILLING_MODULE_SETTINGS_GROUP } from './module-settings-group'

describe('billing module settings navigation', () => {
  it('adds canonical module settings destinations', () => {
    expect(
      BILLING_MODULE_SETTINGS_GROUP.items.map(({ label, href }) => ({
        label,
        href,
      }))
    ).toEqual([
      { label: 'Invoices settings', href: '/settings/modules/invoices' },
      { label: 'Quotes settings', href: '/settings/modules/quotes' },
      { label: 'Payments settings', href: '/settings/modules/payments' },
      { label: 'Expenses settings', href: '/settings/modules/expenses' },
      { label: 'Items settings', href: '/settings/modules/items' },
      {
        label: 'Sales receipts settings',
        href: '/settings/modules/sales-receipts',
      },
      {
        label: 'Time tracking settings',
        href: '/settings/modules/time-tracking',
      },
      { label: 'Customers settings', href: '/settings/modules/customers' },
      {
        label: 'Subscriptions settings',
        href: '/settings/modules/subscriptions',
      },
      { label: 'Banking settings', href: '/settings/modules/banking' },
      {
        label: 'Credit notes settings',
        href: '/settings/modules/credit-notes',
      },
      { label: 'Purchases settings', href: '/settings/modules/purchases' },
      { label: 'Payroll settings', href: '/settings/modules/payroll' },
      { label: 'Price lists settings', href: '/settings/modules/price-lists' },
      { label: 'Discounts settings', href: '/settings/modules/discounts' },
    ])
  })

  it('keeps exported module navigation structurally cloneable', () => {
    expect(() => structuredClone(BILLING_MODULE_SETTINGS_GROUP)).not.toThrow()
  })
})
