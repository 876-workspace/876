import { describe, expect, it } from 'vitest'

import type { PermissionCatalog } from '@/types/permissions'

import {
  PERMISSION_CATALOG,
  DEFAULT_ROLE_DEFINITIONS,
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
  'pre-alerts.view',
  'pre-alerts.create',
  'pre-alerts.edit',
  'pre-alerts.delete',
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
    expect(permissionKey('customers', 'export')).toBe('customers.export')
  })

  it('expands module actions before module-specific extras', () => {
    const customers = PERMISSION_CATALOG[1]

    expect(modulePermissionKeys(customers)).toEqual([
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'customers.import',
      'customers.export',
    ])
  })

  it('expands the complete catalog in stable matrix order', () => {
    expect(allPermissionKeys(PERMISSION_CATALOG)).toEqual(ALL_KEYS)
  })

  it('includes every expected canonical module key exactly once', () => {
    const keys = PERMISSION_CATALOG.map((module) => module.key)

    expect(keys).toEqual([
      'items',
      'customers',
      'packages',
      'pre-alerts',
      'warehouse',
      'manifests',
      'deliveries',
      'invoices',
      'payments',
      'reports',
      'settings',
    ])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('limits Reports to view and Settings to view/edit', () => {
    const reports = PERMISSION_CATALOG.find(
      (module) => module.key === 'reports'
    )
    const settings = PERMISSION_CATALOG.find(
      (module) => module.key === 'settings'
    )

    expect(reports?.actions).toEqual(['view'])
    expect(reports?.extras).toEqual([])
    expect(settings?.actions).toEqual(['view', 'edit'])
    expect(settings?.extras).toEqual([])
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

      expect(isValidPermissionKey(catalog, key)).toBe(valid)
    }
  )

  it('gives Admin every catalog permission', () => {
    expect(defaultRolePermissions(PERMISSION_CATALOG, 'admin')).toEqual(ALL_KEYS)
  })

  it('excludes Reports and Settings from Staff permissions', () => {
    const result = defaultRolePermissions(PERMISSION_CATALOG, 'staff')

    expect(result).toEqual(ALL_KEYS.slice(0, -3))
    expect(result).not.toContain('reports.view')
    expect(result).not.toContain('settings.view')
    expect(result).not.toContain('settings.edit')
  })

  it('defines stable default role names and descriptions', () => {
    expect(DEFAULT_ROLE_DEFINITIONS).toEqual({
      admin: {
        name: 'Admin',
        description: 'Unrestricted access to every module.',
      },
      staff: {
        name: 'Staff',
        description: 'Access to every module except Reports and Settings.',
      },
    })
  })

  it('filters invalid stored keys for custom roles', () => {
    const permissions = ['items.view', 'unknown.manage', 'customers.export']

    expect(
      resolveRolePermissions({ systemKey: null, permissions })
    ).toEqual(['items.view', 'customers.export'])
    expect(permissions).toEqual([
      'items.view',
      'unknown.manage',
      'customers.export',
    ])
  })

  it('does not recognize the legacy pre-alert permission', () => {
    expect(isValidPermissionKey(PERMISSION_CATALOG, 'pre_alerts.view')).toBe(
      false
    )
    expect(isValidPermissionKey(PERMISSION_CATALOG, 'pre-alerts.view')).toBe(
      true
    )
  })

  it('rejects malformed stored custom permission arrays', () => {
    expect(
      resolveRolePermissions({
        systemKey: null,
        permissions: ['items.view', 42],
      })
    ).toEqual([])
  })

  it('rejects non-array stored custom permissions', () => {
    expect(
      resolveRolePermissions({
        systemKey: null,
        permissions: { items: true },
      })
    ).toEqual([])
  })

  it.each([
    ['admin', ALL_KEYS],
    ['staff', ALL_KEYS.slice(0, -3)],
  ] as const)(
    'resolves %s from the catalog and ignores stored permissions',
    (systemKey, expected) => {
      expect(
        resolveRolePermissions({
          systemKey,
          permissions: ['invalid.stored'],
        })
      ).toEqual(expected)
    }
  )

  it('does not mutate the catalog while resolving permissions', () => {
    const snapshot = structuredClone(PERMISSION_CATALOG)

    expect(defaultRolePermissions(PERMISSION_CATALOG, 'staff')).toEqual(
      ALL_KEYS.slice(0, -3)
    )
    expect(PERMISSION_CATALOG).toEqual(snapshot)
  })

  it('is pure for repeated allPermissionKeys calls', () => {
    const first = allPermissionKeys(PERMISSION_CATALOG)
    const second = allPermissionKeys(PERMISSION_CATALOG)

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
  })
})
