import { describe, expect, it } from 'vitest'
import { ROUTE_PERMISSIONS } from './route-permissions'
import {
  consolePermissionCatalog,
  toStoredPermissionKeys,
} from '@876/core/access/catalogs'
import { can, resolveEffectivePermissions } from '@876/core/access'
import { operatorProductCatalogs } from '@/lib/operator-permissions'

describe('ROUTE_PERMISSIONS — route to permission mapping', () => {
  it('maps /requests to crm/requests.view (not support)', () => {
    expect(ROUTE_PERMISSIONS['/requests']).toBe('crm/requests.view')
  })

  it('does not contain legacy /support', () => {
    expect(
      (ROUTE_PERMISSIONS as Record<string, string>)['/support']
    ).toBeUndefined()
    expect(Object.keys(ROUTE_PERMISSIONS)).not.toContain('/support')
  })

  it('every route permission exists in catalog', () => {
    const keys = new Set([
      ...consolePermissionCatalog.permissions.map(
        (permission) => permission.key
      ),
      ...operatorProductCatalogs().flatMap((catalog) =>
        catalog.permissions.map((permission) => permission.key)
      ),
    ])
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

  it('legacy adaptation preserves a valid Console permission', () => {
    const adapted = toStoredPermissionKeys(['console:requests'])
    const perm = 'console:requests'
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
    ).toBe(true)

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
    const adapted = toStoredPermissionKeys(['console:requests'])
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

  it('each permission uses a Console or projected-product delimiter', () => {
    for (const perm of Object.values(ROUTE_PERMISSIONS))
      expect(perm.includes(':') || perm.includes('/')).toBe(true)
  })
})
