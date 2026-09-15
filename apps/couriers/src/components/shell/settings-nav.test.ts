import { describe, expect, it } from 'vitest'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

import {
  isSettingsPath,
  resolveSettingsActiveKey,
  SETTINGS_NAV_GROUPS,
  settingsContext,
} from './settings-nav'
import { resolveSettingsNavIcon, SETTINGS_NAV_ICONS } from './nav-icons'

describe('isSettingsPath', () => {
  it.each([
    ['/island-logistics', '/island-logistics', false],
    ['/island-logistics/customers', '/island-logistics', false],
    ['/island-logistics/customers/cus_123', '/island-logistics', false],
    ['/island-logistics/requests', '/island-logistics', false],
    ['/island-logistics/settings', '/island-logistics', true],
    ['/island-logistics/settings/', '/island-logistics', true],
    ['/island-logistics/settings/orgprofile', '/island-logistics', true],
    ['/island-logistics/settings/users/roles/new', '/island-logistics', true],
    ['/island-logistics/settingsx', '/island-logistics', false],
    ['/island-logistics/settings-finance', '/island-logistics', false],
    ['/montego-express/settings/branding', '/montego-express', true],
    ['/montego-express/settings/branding', '/island-logistics', false],
  ])('resolves %s against %s as %s', (pathname, basePath, expected) => {
    expect(isSettingsPath(pathname, basePath)).toBe(expected)
  })
})

describe('settingsContext', () => {
  it('lists the condensed one-page-per-item navigation with org-scoped hrefs', () => {
    const context = settingsContext('/island-logistics')
    const rendered = context.groups.flatMap((group) =>
      group.entries.map((entry) => ({
        group: group.label,
        title: entry.title,
        href: entry.href,
      }))
    )

    expect(rendered).toEqual([
      {
        group: 'Organization',
        title: 'Organization profile',
        href: '/island-logistics/settings/orgprofile',
      },
      {
        group: 'Organization',
        title: 'Branding',
        href: '/island-logistics/settings/branding',
      },
      {
        group: 'Organization',
        title: 'Branches & locations',
        href: '/island-logistics/settings/locations',
      },
      {
        group: 'Organization',
        title: 'Users',
        href: '/island-logistics/settings/users',
      },
      {
        group: 'Organization',
        title: 'Roles',
        href: '/island-logistics/settings/users/roles',
      },
      {
        group: 'Organization',
        title: 'Subscription',
        href: '/island-logistics/settings/subscription',
      },
      {
        group: 'Modules',
        title: 'Items',
        href: '/island-logistics/settings/modules/items',
      },
      {
        group: 'Modules',
        title: 'Warehouse',
        href: '/island-logistics/settings/modules/warehouse',
      },
      {
        group: 'Modules',
        title: 'Manifests',
        href: '/island-logistics/settings/modules/manifests',
      },
      {
        group: 'Modules',
        title: 'Deliveries',
        href: '/island-logistics/settings/modules/deliveries',
      },
      {
        group: 'Modules',
        title: 'Invoices',
        href: '/island-logistics/settings/modules/invoices',
      },
      {
        group: 'Modules',
        title: 'Payments',
        href: '/island-logistics/settings/modules/payments',
      },
      {
        group: 'Modules',
        title: 'Customer portal',
        href: '/island-logistics/settings/modules/portal',
      },
      {
        group: 'Product',
        title: 'Finance',
        href: '/island-logistics/settings/finance',
      },
      {
        group: 'Product',
        title: 'Templates',
        href: '/island-logistics/settings/templates',
      },
      {
        group: 'Product',
        title: 'Customization',
        href: '/island-logistics/settings/customization',
      },
      {
        group: 'Product',
        title: 'Notifications',
        href: '/island-logistics/settings/notifications',
      },
      {
        group: 'Developer',
        title: 'Integrations',
        href: '/island-logistics/settings/integrations',
      },
      {
        group: 'Developer',
        title: 'Automation',
        href: '/island-logistics/settings/automation',
      },
    ])
  })

  it('keeps every entry icon a serializable string key', () => {
    const context = settingsContext('/island-logistics')

    for (const group of context.groups) {
      for (const entry of group.entries) {
        expect(typeof entry.icon).toBe('string')
      }
    }
  })
})

describe('resolveSettingsActiveKey', () => {
  it.each([
    ['/island-logistics/settings/orgprofile', 'orgprofile'],
    ['/island-logistics/settings/branding', 'branding'],
    ['/island-logistics/settings/locations/new', 'locations'],
    ['/island-logistics/settings/users', 'users'],
    ['/island-logistics/settings/users/usr_123', 'users'],
    ['/island-logistics/settings/users/roles', 'roles'],
    ['/island-logistics/settings/users/roles/new', 'roles'],
    ['/island-logistics/settings/users/roles/role_admin', 'roles'],
    ['/island-logistics/settings/modules/invoices', 'module-invoices'],
    ['/island-logistics/settings/finance', 'finance'],
    ['/island-logistics/settings/templates', 'templates'],
    ['/island-logistics/settings/templates/new', 'templates'],
    ['/island-logistics/settings', null],
    ['/island-logistics/customers', null],
  ])('resolves %s to %s', (pathname, expected) => {
    expect(resolveSettingsActiveKey(pathname, '/island-logistics')).toBe(
      expected
    )
  })

  it('resolves under a different org slug', () => {
    expect(
      resolveSettingsActiveKey(
        '/montego-express/settings/users/roles/new',
        '/montego-express'
      )
    ).toBe('roles')
  })

  it("resolves the portal module page to 'module-portal'", () => {
    expect(
      resolveSettingsActiveKey(
        '/island-logistics/settings/modules/portal',
        '/island-logistics'
      )
    ).toBe('module-portal')
  })
})

describe('settings modules group', () => {
  it('links every entry to /settings/modules/<key> for a catalog key, excluding general', () => {
    const catalogKeys = new Set<string>(
      COURIERS_MODULE_CATALOG.map((module) => module.key)
    )
    const modulesGroup = SETTINGS_NAV_GROUPS.find(
      (group) => group.key === 'modules'
    )
    expect(modulesGroup?.label).toBe('Modules')
    expect(modulesGroup?.entries.length).toBeGreaterThan(0)

    for (const entry of modulesGroup?.entries ?? []) {
      const moduleKey = entry.href.replace('/settings/modules/', '')
      expect(entry.href).toBe(`/settings/modules/${moduleKey}`)
      expect(moduleKey).not.toBe('general')
      expect(catalogKeys.has(moduleKey)).toBe(true)
    }
  })

  it('lists exactly the specified sidebar modules, each once (anti-drift)', () => {
    // NOTE: the runtime catalog holds three extra core-spread modules
    // (customers, packages, pre-alerts) that intentionally have no sidebar
    // entry — the Modules group is a hand-maintained literal, so this pins
    // that literal instead of mirroring the catalog one-to-one.
    const modulesGroup = SETTINGS_NAV_GROUPS.find(
      (group) => group.key === 'modules'
    )
    const hrefs = modulesGroup?.entries.map((entry) => entry.href) ?? []
    const expected = [
      '/settings/modules/items',
      '/settings/modules/warehouse',
      '/settings/modules/manifests',
      '/settings/modules/deliveries',
      '/settings/modules/invoices',
      '/settings/modules/payments',
      '/settings/modules/portal',
    ]

    expect(hrefs).toHaveLength(expected.length)
    expect([...hrefs].sort()).toEqual([...expected].sort())
  })

  it('resolves every entry icon to a registered component, never the fallback', () => {
    for (const group of SETTINGS_NAV_GROUPS) {
      for (const entry of group.entries) {
        expect(
          Object.prototype.hasOwnProperty.call(SETTINGS_NAV_ICONS, entry.icon)
        ).toBe(true)
        expect(resolveSettingsNavIcon(entry.icon)).toBe(
          SETTINGS_NAV_ICONS[entry.icon]
        )
      }
    }
  })
})
