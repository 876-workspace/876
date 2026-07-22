import { describe, expect, it } from 'vitest'

import type { PermissionCatalog } from '@/types/permissions'

import {
  PERMISSION_CATALOG,
  allPermissionKeys,
  defaultRolePermissions,
  isValidPermissionKey,
  modulePermissionKeys,
  permissionKey,
  resolveRolePermissions,
} from './catalog'

const ALL_KEYS = [
  'items.view',
  'items.create',
  'items.edit',
  'items.delete',
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  'customers.import',
  'customers.export',
  'packages.view',
  'packages.create',
  'packages.edit',
  'packages.delete',
  'packages.export',
  'pre_alerts.view',
  'pre_alerts.create',
  'pre_alerts.edit',
  'pre_alerts.delete',
  'warehouse.view',
  'warehouse.create',
  'warehouse.edit',
  'warehouse.delete',
  'manifests.view',
  'manifests.create',
  'manifests.edit',
  'manifests.delete',
  'deliveries.view',
  'deliveries.create',
  'deliveries.edit',
  'deliveries.delete',
  'invoices.view',
  'invoices.create',
  'invoices.edit',
  'invoices.delete',
  'payments.view',
  'payments.create',
  'payments.edit',
  'payments.delete',
  'reports.view',
  'settings.view',
  'settings.edit',
] as const

describe('permission catalog', () => {
  it('builds a permission key from module and action segments', () => {
    const result = permissionKey('customers', 'export')

    expect(result).toBe('customers.export')
  })

  it('expands module actions before module-specific extras', () => {
    const customers = PERMISSION_CATALOG[1]

    const result = modulePermissionKeys(customers)

    expect(result).toEqual([
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'customers.import',
      'customers.export',
    ])
  })

  it('expands the complete catalog in stable matrix order', () => {
    const result = allPermissionKeys(PERMISSION_CATALOG)

    expect(result).toEqual(ALL_KEYS)
  })

  it.each([
    ['parcels.scan', true],
    ['packages.export', false],
  ] as const)(
    'validates %s against only the supplied catalog',
    (key, valid) => {
      const catalog: PermissionCatalog = [
        {
          key: 'parcels',
          label: 'Parcels',
          actions: ['view'],
          extras: [{ key: 'scan', label: 'Scan parcels' }],
        },
      ]

      const result = isValidPermissionKey(catalog, key)

      expect(result).toBe(valid)
    }
  )

  it('gives Admin every catalog permission', () => {
    const result = defaultRolePermissions(PERMISSION_CATALOG, 'admin')

    expect(result).toEqual(ALL_KEYS)
  })

  it('excludes Reports and Settings from Staff permissions', () => {
    const result = defaultRolePermissions(PERMISSION_CATALOG, 'staff')

    expect(result).toEqual(ALL_KEYS.slice(0, -3))
  })

  it('filters invalid stored keys for custom roles', () => {
    const permissions = ['items.view', 'unknown.manage', 'customers.export']

    const result = resolveRolePermissions({
      systemKey: null,
      permissions,
    })

    expect(result).toEqual(['items.view', 'customers.export'])
    expect(permissions).toEqual([
      'items.view',
      'unknown.manage',
      'customers.export',
    ])
  })

  it('rejects malformed stored custom permission arrays', () => {
    const result = resolveRolePermissions({
      systemKey: null,
      permissions: ['items.view', 42],
    })

    expect(result).toEqual([])
  })

  it.each([
    ['admin', ALL_KEYS],
    ['staff', ALL_KEYS.slice(0, -3)],
  ] as const)(
    'resolves %s from the catalog and ignores stored permissions',
    (systemKey, expected) => {
      const result = resolveRolePermissions({
        systemKey,
        permissions: ['invalid.stored'],
      })

      expect(result).toEqual(expected)
    }
  )

  it('does not mutate the catalog while resolving permissions', () => {
    const snapshot = structuredClone(PERMISSION_CATALOG)

    const result = defaultRolePermissions(PERMISSION_CATALOG, 'staff')

    expect(result).toEqual(ALL_KEYS.slice(0, -3))
    expect(PERMISSION_CATALOG).toEqual(snapshot)
  })
})
