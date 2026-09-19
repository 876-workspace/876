import { describe, expect, it } from 'vitest'
import { consolePermissionCatalog } from '@876/core/access/catalogs'

import { moduleStyle } from '@/components/patterns/permission-module-style'
import type { PermissionGroup } from '@/types/permission'

import {
  permissionGroupRollup,
  permissionModuleRollup,
  setPermissionGroupSelection,
} from '../permission-grouping'
import { PERMISSION_GROUPS, permissionGroupKeys } from '../permissions'
import {
  operatorExclusiveCatalog,
  operatorProductCatalogs,
} from '../operator-permissions'

const GROUP: PermissionGroup = {
  key: 'billing',
  label: '876 Billing',
  modules: [
    {
      key: 'catalog',
      label: 'Catalog',
      permissions: [
        { value: 'billing/catalog.view', label: 'View' },
        { value: 'billing/catalog.edit', label: 'Edit' },
      ],
    },
    {
      key: 'sales',
      label: 'Sales',
      permissions: [{ value: 'billing/sales.view', label: 'View' }],
    },
  ],
}

describe('permission grouping', () => {
  it('reports a module roll-up of zero when no permissions are held', () => {
    expect(permissionModuleRollup(GROUP.modules[0], new Set())).toEqual({
      granted: 0,
      total: 2,
    })
  })

  it('reports a module roll-up when all permissions are held', () => {
    expect(
      permissionModuleRollup(
        GROUP.modules[0],
        new Set(['billing/catalog.view', 'billing/catalog.edit'])
      )
    ).toEqual({ granted: 2, total: 2 })
  })

  it('rolls module grants up to the owning product', () => {
    expect(
      permissionGroupRollup(
        GROUP,
        new Set(['billing/catalog.view', 'billing/sales.view'])
      )
    ).toEqual({ granted: 2, total: 3 })
  })

  it('reports a product roll-up of zero when no permissions are held', () => {
    expect(permissionGroupRollup(GROUP, new Set())).toEqual({
      granted: 0,
      total: 3,
    })
  })

  it('reports a complete product roll-up when all permissions are held', () => {
    expect(
      permissionGroupRollup(
        GROUP,
        new Set([
          'billing/catalog.view',
          'billing/catalog.edit',
          'billing/sales.view',
        ])
      )
    ).toEqual({ granted: 3, total: 3 })
  })

  it('selects every permission in a product without changing outside keys', () => {
    expect(
      setPermissionGroupSelection(GROUP, new Set(['users:read']), true)
    ).toEqual(
      new Set([
        'users:read',
        'billing/catalog.view',
        'billing/catalog.edit',
        'billing/sales.view',
      ])
    )
  })

  it('clears every permission in a product without changing outside keys', () => {
    expect(
      setPermissionGroupSelection(
        GROUP,
        new Set([
          'users:read',
          'billing/catalog.view',
          'billing/catalog.edit',
          'billing/sales.view',
        ]),
        false
      )
    ).toEqual(new Set(['users:read']))
  })

  it('matches the full snapshot of durable permission keys from every catalog', () => {
    const catalogSnapshot = [
      ...consolePermissionCatalog.permissions.map(
        (permission) => permission.key
      ),
      ...operatorProductCatalogs().flatMap((catalog) =>
        catalog.permissions.map((permission) => permission.key)
      ),
      ...operatorExclusiveCatalog().permissions.map(
        (permission) => permission.key
      ),
    ].sort()

    expect(permissionGroupKeys(PERMISSION_GROUPS).sort()).toEqual(
      catalogSnapshot
    )
  })

  it('resolves shared module names within their owning product instead of colliding', () => {
    expect(moduleStyle('billing', 'customers').tile).not.toBe(
      moduleStyle('couriers', 'customers').tile
    )
  })
})
