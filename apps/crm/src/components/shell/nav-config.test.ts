import { can, resolveNavigation, type AccessContext } from '@876/core/access'
import { crmPermissionCatalog } from '@876/core/access/catalogs'
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
 * against a hand-maintained copy of it. A hand-written map drifts silently the
 * moment a route's guard changes, which is the exact failure this test exists
 * to catch.
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

    const guard = readFileSync(file, 'utf8').match(
      /requireAppPermission\(\s*'([^']+)'/
    )
    if (guard) return guard[1]
  }

  throw new Error(`No requireAppPermission guard found for ${href}`)
}

describe('CRM navigation access binding', () => {
  it('shows the exact permission-rich href set', () => {
    expect(
      resolveNavigation(
        navConfig,
        context(crmPermissionCatalog.permissions.map(({ key }) => key))
      ).flatMap((group) => group.entries.map(({ href }) => href))
    ).toEqual([
      '/',
      '/requests',
      '/customers',
      '/forms',
      '/settings/teams',
      '/settings/categories',
      '/settings/priorities',
      '/settings',
    ])
  })
  it('shows only request destinations to a request-only member', () => {
    expect(
      resolveNavigation(navConfig, context(['requests.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).toEqual(['/', '/requests'])
  })
  it('removes entries whose permission is absent', () => {
    expect(
      resolveNavigation(navConfig, context(['requests.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).not.toContain('/customers')
  })
  it('returns structurally cloneable server output without mutating the registry', () => {
    const before = structuredClone(navConfig)
    const resolved = resolveNavigation(navConfig, context(['requests.view']))
    expect(structuredClone(resolved)).toEqual(resolved)
    expect(navConfig).toEqual(before)
  })
  it('binds every navigation permission to the destination route guard', () => {
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(entry.requires?.permission).toBe(guardedPermissionOf(entry.href))
  })
  it('requires only permissions granted by a seeded role template', () => {
    const superAdminPermissions = crmPermissionCatalog.permissions.map(
      ({ key }) => key
    )
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(superAdminPermissions).toContain(entry.requires?.permission)
  })
  it('does not treat a feature as a permission', () => {
    expect(can(context([], ['crm-search-bar']), 'requests.view')).toBe(false)
  })
  it('resolves distinct icon keys for every visible entry in the rendered rail', () => {
    const iconKeys = navConfig.flatMap((group) =>
      group.entries.map((entry) => entry.icon)
    )
    expect(new Set(iconKeys).size).toBe(iconKeys.length)
  })
})
