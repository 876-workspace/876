import { appPermissionCatalogs } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import {
  hasAnyProductPermission,
  operatorExclusiveCatalog,
  operatorExclusivePermissionKeys,
  operatorPermissions,
  operatorProductCatalogs,
  projectedPermissionKeys,
} from './operator-permissions'

describe('operatorProductCatalogs', () => {
  it('excludes the console catalog itself', () => {
    const apps = operatorProductCatalogs().map((catalog) => catalog.app)

    expect(apps).not.toContain('console')
  })

  it('covers every non-console app declared in the platform catalog registry', () => {
    const expectedApps = Object.keys(appPermissionCatalogs)
      .filter((slug) => slug !== 'console')
      .map((slug) => slug.replace(/^876-/, ''))
      .sort()

    const apps = operatorProductCatalogs()
      .map((catalog) => catalog.app)
      .sort()

    expect(apps).toEqual(expectedApps)
  })

  it('strips the 876- app-slug prefix from the namespace', () => {
    const apps = operatorProductCatalogs().map((catalog) => catalog.app)

    expect(apps.every((app) => !app.startsWith('876-'))).toBe(true)
  })

  it('namespaces every projected key under its product, preserving the tail', () => {
    const crm = operatorProductCatalogs().find(
      (catalog) => catalog.app === 'crm'
    )
    const rawCrm = appPermissionCatalogs['876-crm']!

    expect(crm?.permissions.map((permission) => permission.key)).toEqual(
      rawCrm.permissions.map((permission) => `crm/${permission.key}`)
    )
  })

  it('namespaces module-level permission keys the same way as the flat list', () => {
    const crm = operatorProductCatalogs().find(
      (catalog) => catalog.app === 'crm'
    )

    const moduleKeys = crm?.modules.flatMap((productModule) =>
      productModule.permissions.map((permission) => permission.key)
    )

    expect(moduleKeys?.sort()).toEqual(
      crm?.permissions.map((permission) => permission.key).sort()
    )
  })

  it('preserves every non-key field of the source permission untouched', () => {
    const crm = operatorProductCatalogs().find(
      (catalog) => catalog.app === 'crm'
    )
    const rawCrm = appPermissionCatalogs['876-crm']!

    expect(crm?.permissions[0]?.action).toBe(rawCrm.permissions[0]?.action)
    expect(crm?.permissions[0]?.label).toBe(rawCrm.permissions[0]?.label)
    expect(crm?.permissions[0]?.moduleKey).toBe(
      rawCrm.permissions[0]?.moduleKey
    )
  })
})

describe('operatorExclusiveCatalog', () => {
  it('declares exactly one purge permission per non-console product', () => {
    const catalog = operatorExclusiveCatalog()
    const expectedCount = Object.keys(appPermissionCatalogs).filter(
      (slug) => slug !== 'console'
    ).length

    expect(catalog.permissions).toHaveLength(expectedCount)
    expect(
      catalog.permissions.every((permission) => permission.action === 'purge')
    ).toBe(true)
  })

  it('namespaces every operator-exclusive key under console:, never a product namespace', () => {
    const catalog = operatorExclusiveCatalog()

    for (const permission of catalog.permissions) {
      expect(permission.key.startsWith('console:')).toBe(true)
      expect(permission.key).not.toMatch(/^[a-z]+\//)
    }
  })

  it('marks every operator-exclusive permission as dangerous', () => {
    const catalog = operatorExclusiveCatalog()

    expect(
      catalog.permissions.every((permission) => permission.isDangerous)
    ).toBe(true)
  })

  it('never reuses a key a product catalog already declares', () => {
    const exclusiveKeys = new Set(operatorExclusivePermissionKeys())
    const productKeys = operatorProductCatalogs().flatMap((catalog) =>
      catalog.permissions.map((permission) => permission.key)
    )

    const collisions = productKeys.filter((key) => exclusiveKeys.has(key))

    expect(collisions).toEqual([])
  })
})

describe('operatorPermissions', () => {
  it('unions the console, product, and operator-exclusive catalogs with no duplicates', () => {
    const consoleCatalog = appPermissionCatalogs.console!
    const permissions = operatorPermissions(consoleCatalog)
    const keys = permissions.map((permission) => permission.key)

    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(
      expect.arrayContaining([
        'console:access',
        ...projectedPermissionKeys(),
        ...operatorExclusivePermissionKeys(),
      ])
    )
  })
})

describe('hasAnyProductPermission', () => {
  it('returns true when a permission carries the product namespace prefix', () => {
    expect(hasAnyProductPermission(['crm/requests.view'], '876-crm')).toBe(true)
  })

  it('returns false when every permission belongs to a different product', () => {
    expect(hasAnyProductPermission(['billing/customers.view'], '876-crm')).toBe(
      false
    )
  })

  it('returns false for an empty permission list', () => {
    expect(hasAnyProductPermission([], '876-crm')).toBe(false)
  })

  it('does not match on a bare product name with no namespace separator', () => {
    // "crmish/foo.view" starts with "crm" but not "crm/" — must not match.
    expect(hasAnyProductPermission(['crmish/foo.view'], '876-crm')).toBe(false)
  })

  it('accepts the app slug with or without the 876- prefix', () => {
    const permissions = ['crm/requests.view']

    expect(hasAnyProductPermission(permissions, '876-crm')).toBe(true)
    expect(hasAnyProductPermission(permissions, 'crm')).toBe(true)
  })
})

describe('projectedPermissionKeys', () => {
  it('returns every projected key with no filter', () => {
    const keys = projectedPermissionKeys()
    const total = operatorProductCatalogs().flatMap(
      (catalog) => catalog.permissions
    ).length

    expect(keys).toHaveLength(total)
  })

  it('narrows to only the keys whose action passes the filter', () => {
    const viewKeys = projectedPermissionKeys((action) => action === 'view')

    expect(viewKeys.length).toBeGreaterThan(0)
    expect(
      viewKeys.every((key) => {
        const catalog = operatorProductCatalogs().find((c) =>
          c.permissions.some((permission) => permission.key === key)
        )
        const permission = catalog?.permissions.find((p) => p.key === key)
        return permission?.action === 'view'
      })
    ).toBe(true)
  })

  it('returns an empty array when no permission satisfies the filter', () => {
    expect(projectedPermissionKeys(() => false)).toEqual([])
  })
})
