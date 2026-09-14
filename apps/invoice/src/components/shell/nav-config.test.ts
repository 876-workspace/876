import { can, resolveNavigation, type AccessContext } from '@876/core/access'
import { invoicePermissionCatalog } from '@876/core/access/catalogs'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { navConfig } from './nav-config'

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

/**
 * Reads the permission each destination route actually guards on, so the
 * binding assertion below compares the registry against the source rather than
 * against a hand-maintained copy of it.
 */
function guardedPermissionOf(href: string): string {
  const segment = href === '/' ? '' : href
  const candidates = [
    `src/app/(app)${segment}/layout.tsx`,
    `src/app/(app)${segment}/page.tsx`,
  ]

  for (const candidate of candidates) {
    const file = join(process.cwd(), candidate)
    if (!existsSync(file)) continue

    const source = readFileSync(file, 'utf8')
    const direct = source.match(/requireAppPermission\(\s*'([^']+)'/)
    if (direct) return direct[1]

    const capability = source.match(
      /requireAppCapability\(\s*\{[\s\S]*?permission:\s*'([^']+)'/
    )
    if (capability) return capability[1]
  }

  throw new Error(`No Invoice app guard found for ${href}`)
}

describe('Invoice navigation access binding', () => {
  it('shows the exact permission-rich href set without optional feature surfaces', () => {
    expect(
      resolveNavigation(
        navConfig,
        context(invoicePermissionCatalog.permissions.map(({ key }) => key))
      ).flatMap((group) => group.entries.map(({ href }) => href))
    ).toEqual([
      '/',
      '/customers',
      '/items',
      '/quotes',
      '/invoices',
      '/recurring-invoices',
      '/sales-receipts',
      '/payments',
      '/expenses',
      '/time-tracking',
      '/reports',
      '/settings',
    ])
  })

  it('shows Requests only when requests.view and invoice-requests are both present', () => {
    const withPermissionOnly = resolveNavigation(
      navConfig,
      context(['requests.view'])
    ).flatMap((group) => group.entries)
    const withFeatureOnly = resolveNavigation(
      navConfig,
      context([], ['invoice-requests'])
    ).flatMap((group) => group.entries)
    const enabled = resolveNavigation(
      navConfig,
      context(['requests.view'], ['invoice-requests'])
    ).flatMap((group) => group.entries)

    expect(withPermissionOnly.find((entry) => entry.key === 'requests')).toBeUndefined()
    expect(withFeatureOnly.find((entry) => entry.key === 'requests')).toBeUndefined()
    expect(enabled.find((entry) => entry.key === 'requests')).toMatchObject({
      href: '/requests',
      children: [
        { href: '/requests' },
        { href: '/requests/customers' },
        { href: '/requests/forms' },
      ],
    })
  })

  it('shows only the dashboard to a dashboard-only member', () => {
    expect(
      resolveNavigation(navConfig, context(['dashboard.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).toEqual(['/'])
  })

  it('removes entries whose permission is absent', () => {
    expect(
      resolveNavigation(navConfig, context(['dashboard.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).not.toContain('/invoices')
  })

  it('returns structurally cloneable server output without mutating the registry', () => {
    const before = structuredClone(navConfig)
    const resolved = resolveNavigation(navConfig, context(['dashboard.view']))
    expect(structuredClone(resolved)).toEqual(resolved)
    expect(navConfig).toEqual(before)
  })

  it('binds every navigation permission to the destination route guard', () => {
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(entry.requires?.permission).toBe(guardedPermissionOf(entry.href))
  })

  it('requires only permissions granted by a seeded role template', () => {
    const superAdminPermissions = invoicePermissionCatalog.permissions.map(
      ({ key }) => key
    )
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(superAdminPermissions).toContain(entry.requires?.permission)
  })

  it('does not treat a feature as a permission', () => {
    expect(can(context([], ['invoice-reports']), 'reports.view')).toBe(false)
  })
})
