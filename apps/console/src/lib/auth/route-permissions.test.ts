import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import { consolePermissionCatalog } from '@876/core/access/catalogs'
import { navConfig } from '@/components/shell/nav-config'
import { SETTINGS_NAVIGATION } from '@/components/shell/settings-options'
import { SYSTEM_ROLE_DEFINITIONS } from '@/lib/permissions'
import { ROUTE_PERMISSIONS } from './route-permissions'

const APP_ROOT = resolve(process.cwd(), 'src/app/(app)')
const NEWLY_GUARDED = [
  '/support',
  '/security',
  '/storage',
  '/reports',
  '/settings/users',
  '/settings/users/roles',
  '/settings/security',
] as const

function layoutFile(route: string): string {
  return join(APP_ROOT, route.slice(1), 'layout.tsx')
}
function nearestRoutePermission(href: string): string | null {
  const path = Object.keys(ROUTE_PERMISSIONS)
    .filter(
      (candidate) => href === candidate || href.startsWith(`${candidate}/`)
    )
    .sort((left, right) => right.length - left.length)[0]
  return path ? ROUTE_PERMISSIONS[path as keyof typeof ROUTE_PERMISSIONS] : null
}
function walkPages(directory: string): string[] {
  const pages: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) pages.push(...walkPages(full))
    else if (entry.name === 'page.tsx') pages.push(full)
  }
  return pages
}
function routePattern(file: string): string[] {
  const directory = relative(APP_ROOT, file.slice(0, -'/page.tsx'.length))
  if (!directory) return []
  return directory
    .split(sep)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
}
function routeMatches(href: string, pattern: string[]): boolean {
  const segments = href === '/' ? [] : href.slice(1).split('/')
  if (segments.length !== pattern.length) return false
  return pattern.every(
    (segment, index) =>
      (segment.startsWith('[') && segment.endsWith(']')) ||
      segment === segments[index]
  )
}
function allNavigationEntries() {
  return [...navConfig, ...SETTINGS_NAVIGATION].flatMap(
    (group) => group.entries
  )
}
function roleCanReach(roleName: string, path: string): boolean {
  const role = SYSTEM_ROLE_DEFINITIONS.find((entry) => entry.name === roleName)
  if (!role) throw new Error(`Unknown system role: ${roleName}`)
  const granted = new Set(role.permissions)
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([route]) => path === route || path.startsWith(`${route}/`))
    .every(([, permission]) => granted.has(permission))
}
function reachablePaths(roleName: string): string[] {
  return Object.keys(ROUTE_PERMISSIONS).filter((path) =>
    roleCanReach(roleName, path)
  )
}

describe('ROUTE_PERMISSIONS', () => {
  it('declares the complete route-enforcement map', () => {
    expect(ROUTE_PERMISSIONS).toEqual({
      '/users': 'console:users',
      '/orgs': 'console:organizations',
      '/apps': 'console:apps',
      '/widgets': 'console:widgets',
      '/features': 'console:features',
      '/support': 'console:support',
      '/security': 'console:security',
      '/storage': 'console:storage',
      '/reports': 'console:reports',
      '/settings': 'console:settings',
      '/settings/users': 'team:list',
      '/settings/users/roles': 'roles:list',
      '/settings/security': 'console:security',
    })
  })
  it('backs every declared route subtree with a permission-checking layout', () => {
    for (const route of Object.keys(ROUTE_PERMISSIONS)) {
      const file = layoutFile(route)
      expect(existsSync(file), route).toBe(true)
      expect(readFileSync(file, 'utf8'), route).toContain(
        'requireConsolePermission'
      )
    }
  })
  it('binds each permission-gated navigation entry to the same route permission', () => {
    for (const entry of allNavigationEntries()) {
      if (!entry.requires?.permission) continue
      expect(nearestRoutePermission(entry.href), entry.href).toBe(
        entry.requires.permission
      )
    }
  })
  it('uses only permissions present in the canonical Console catalog', () => {
    const catalog = new Set(
      consolePermissionCatalog.permissions.map((permission) => permission.key)
    )
    expect(
      Object.values(ROUTE_PERMISSIONS).filter(
        (permission) => !catalog.has(permission)
      )
    ).toEqual([])
  })
  it('uses only permissions granted by at least one system role', () => {
    const granted = new Set(
      SYSTEM_ROLE_DEFINITIONS.flatMap((role) => role.permissions)
    )
    expect(
      Object.values(ROUTE_PERMISSIONS).filter(
        (permission) => !granted.has(permission)
      )
    ).toEqual([])
  })
  it('binds every navigation href to a real App Router page', () => {
    const patterns = walkPages(APP_ROOT).map(routePattern)
    for (const entry of allNavigationEntries())
      expect(
        patterns.some((pattern) => routeMatches(entry.href, pattern)),
        entry.href
      ).toBe(true)
  })
  it('gives staff the exact guarded route set their cumulative permissions allow', () => {
    expect(reachablePaths('staff')).toEqual(['/support', '/reports'])
  })
  it('gives admin the exact guarded route set their cumulative permissions allow', () => {
    expect(reachablePaths('admin')).toEqual([
      '/users',
      '/orgs',
      '/apps',
      '/widgets',
      '/features',
      '/support',
      '/storage',
      '/reports',
      '/settings',
      '/settings/users',
      '/settings/users/roles',
    ])
  })
  it('gives owner the exact guarded route set their cumulative permissions allow', () => {
    expect(reachablePaths('owner')).toEqual(Object.keys(ROUTE_PERMISSIONS))
  })
  it('gives super_admin the exact guarded route set their cumulative permissions allow', () => {
    expect(reachablePaths('super_admin')).toEqual(
      Object.keys(ROUTE_PERMISSIONS)
    )
  })
  it('keeps a permission guard in the support layout', () => {
    expect(readFileSync(layoutFile('/support'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/support']"
    )
  })
  it('keeps a permission guard in the security layout', () => {
    expect(readFileSync(layoutFile('/security'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/security']"
    )
  })
  it('keeps a permission guard in the storage layout', () => {
    expect(readFileSync(layoutFile('/storage'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/storage']"
    )
  })
  it('keeps a permission guard in the reports layout', () => {
    expect(readFileSync(layoutFile('/reports'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/reports']"
    )
  })
  it('keeps a permission guard in the Team layout', () => {
    expect(readFileSync(layoutFile('/settings/users'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/settings/users']"
    )
  })
  it('keeps a permission guard in the Roles layout', () => {
    expect(readFileSync(layoutFile('/settings/users/roles'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/settings/users/roles']"
    )
  })
  it('keeps a permission guard in the Settings Security layout', () => {
    expect(readFileSync(layoutFile('/settings/security'), 'utf8')).toContain(
      "ROUTE_PERMISSIONS['/settings/security']"
    )
  })
  it('tracks exactly the seven subtrees added in this phase', () => {
    expect([...NEWLY_GUARDED]).toEqual([
      '/support',
      '/security',
      '/storage',
      '/reports',
      '/settings/users',
      '/settings/users/roles',
      '/settings/security',
    ])
  })
})
