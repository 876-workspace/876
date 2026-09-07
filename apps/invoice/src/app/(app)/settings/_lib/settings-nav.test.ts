import { SETTINGS_HUB_ICON_KEYS } from '@876/ui/settings-hub'

import {
  FINANCE_READ_PERMISSIONS,
  ROLES_READ_PERMISSION,
  SETTINGS_GROUPS,
  isSettingsItemVisible,
} from './settings-nav'

describe('invoice settings navigation', () => {
  it('exports a non-empty settings list', () => {
    expect(SETTINGS_GROUPS.length).toBeGreaterThan(0)
  })

  it('gives every item a label and a supported icon key', () => {
    const items = SETTINGS_GROUPS.flatMap((group) => group.items)

    expect(items.every((item) => item.label.length > 0)).toBe(true)
    expect(
      items.every((item) => SETTINGS_HUB_ICON_KEYS.includes(item.icon))
    ).toBe(true)
  })

  it('does not expose an available item without a destination', () => {
    const availableItems = SETTINGS_GROUPS.flatMap(
      (group) => group.items
    ).filter((item) => item.availability === 'available')

    expect(availableItems.every((item) => Boolean(item.href))).toBe(true)
  })

  it('marks Users as an available destination', () => {
    const users = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.label === 'Users'
    )

    expect(users).toMatchObject({
      availability: 'available',
      href: '/settings/users',
    })
  })

  it('binds the Roles navigation requirement to the roles route guard permission', () => {
    const roles = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/roles'
    )

    expect(roles?.requires?.permission).toBe(ROLES_READ_PERMISSION)
    expect(ROLES_READ_PERMISSION).toBe('roles:read')
  })

  it('uses unique group labels', () => {
    const labels = SETTINGS_GROUPS.map((group) => group.label)

    expect(new Set(labels).size).toBe(labels.length)
  })

  it('adds canonical module settings destinations', () => {
    const modules = SETTINGS_GROUPS.find((group) => group.label === 'Modules')

    expect(modules?.items.map(({ label, href }) => ({ label, href }))).toEqual([
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
      { label: 'CRM settings', href: '/settings/modules/crm' },
    ])
  })

  it('condenses currencies, payment modes, and taxes into one Finance destination', () => {
    const money = SETTINGS_GROUPS.find((group) => group.label === 'Money')

    expect(money?.items.map(({ label, href }) => ({ label, href }))).toEqual([
      { label: 'Finance', href: '/settings/finance' },
    ])
  })

  it('binds the Finance requirement to the three reads its route enforces', () => {
    const finance = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/finance'
    )

    expect(finance?.requires?.anyPermission).toEqual([
      'currencies:read',
      'payments:read',
      'taxes:read',
    ])
    expect(FINANCE_READ_PERMISSIONS).toEqual([
      'currencies:read',
      'payments:read',
      'taxes:read',
    ])
  })

  it('shows Finance to a viewer holding only one of the three reads', () => {
    const finance = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/finance'
    )

    expect(isSettingsItemVisible(finance!, ['taxes:read'])).toBe(true)
    expect(isSettingsItemVisible(finance!, ['payments:read'])).toBe(true)
    expect(isSettingsItemVisible(finance!, ['currencies:read'])).toBe(true)
  })

  it('hides Finance from a viewer holding none of the three reads', () => {
    const finance = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/finance'
    )

    expect(isSettingsItemVisible(finance!, ['roles:read'])).toBe(false)
    expect(isSettingsItemVisible(finance!, [])).toBe(false)
  })

  it('still honours a single-permission requirement', () => {
    const roles = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/roles'
    )

    expect(isSettingsItemVisible(roles!, ['roles:read'])).toBe(true)
    expect(isSettingsItemVisible(roles!, ['taxes:read'])).toBe(false)
  })

  it('shows an item that declares no requirement', () => {
    const users = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.href === '/settings/users'
    )

    expect(isSettingsItemVisible(users!, [])).toBe(true)
  })

  it('keeps exported settings navigation structurally cloneable', () => {
    expect(() => structuredClone(SETTINGS_GROUPS)).not.toThrow()
  })
})
