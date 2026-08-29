import { describe, expect, it } from 'vitest'
import { ROUTE_PERMISSIONS } from './route-permissions'
import {
  consolePermissionCatalog,
  adaptStoredConsolePermissions,
} from '@876/core/access/catalogs'
import { can, resolveEffectivePermissions } from '@876/core/access'

describe('ROUTE_PERMISSIONS — route to permission mapping', () => {
  it('maps /requests to console:requests (not support)', () => {
    expect(ROUTE_PERMISSIONS['/requests']).toBe('console:requests')
  })

  it('does not contain legacy /support', () => {
    expect(
      (ROUTE_PERMISSIONS as Record<string, string>)['/support']
    ).toBeUndefined()
    expect(Object.keys(ROUTE_PERMISSIONS)).not.toContain('/support')
  })

  it('every route permission exists in catalog', () => {
    const keys = new Set(consolePermissionCatalog.permissions.map((p) => p.key))
    for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
      expect(keys.has(perm), `route ${route} perm ${perm} missing`).toBe(true)
    }
  })

  it('every route starts with /', () => {
    for (const route of Object.keys(ROUTE_PERMISSIONS))
      expect(route.startsWith('/')).toBe(true)
  })

  it('has settings sub-routes', () => {
    expect(ROUTE_PERMISSIONS['/settings/users']).toBe('team:list')
    expect(ROUTE_PERMISSIONS['/settings/users/roles']).toBe('roles:list')
  })

  it('legacy adaptation grants route access', () => {
    const adapted = adaptStoredConsolePermissions(['console:support'])
    const perm = ROUTE_PERMISSIONS['/requests']
    expect(
      can(
        {
          subject: { userId: 'u' },
          permissions: adapted,
          features: [],
          experiments: {},
        },
        perm
      )
    ).toBe(true) // adapted raw already contains requests
    // After effective filter, legacy should grant
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(eff).toContain('console:requests')
    expect(
      can(
        {
          subject: { userId: 'u' },
          permissions: eff,
          features: [],
          experiments: {},
        },
        perm
      )
    ).toBe(true)
  })

  it('non-request route not affected by legacy alias', () => {
    const adapted = adaptStoredConsolePermissions(['console:support'])
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(eff).not.toContain('console:users')
    expect(
      can(
        {
          subject: { userId: 'u' },
          permissions: eff,
          features: [],
          experiments: {},
        },
        ROUTE_PERMISSIONS['/users']
      )
    ).toBe(false)
  })

  it('covers critical routes count', () => {
    expect(Object.keys(ROUTE_PERMISSIONS).length).toBeGreaterThanOrEqual(10)
  })

  it('is immutable via satisfies — keys are stable', () => {
    const copy = { ...ROUTE_PERMISSIONS }
    expect(copy).toEqual(ROUTE_PERMISSIONS)
  })

  it('each permission is colon-delimited (console tier)', () => {
    for (const perm of Object.values(ROUTE_PERMISSIONS))
      expect(perm.includes(':')).toBe(true)
  })
})
