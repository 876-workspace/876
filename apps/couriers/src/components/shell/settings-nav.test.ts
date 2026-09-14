import { describe, expect, it } from 'vitest'

import {
  isSettingsPath,
  resolveSettingsActiveKey,
  settingsContext,
} from './settings-nav'

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
        group: 'Product',
        title: 'Modules',
        href: '/island-logistics/settings/modules',
      },
      {
        group: 'Product',
        title: 'Customer portal',
        href: '/island-logistics/settings/portal',
      },
      {
        group: 'Product',
        title: 'Finance',
        href: '/island-logistics/settings/finance',
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
    ['/island-logistics/settings/modules/invoices', 'modules'],
    ['/island-logistics/settings/finance', 'finance'],
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
})
