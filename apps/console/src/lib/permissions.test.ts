import { consolePermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import {
  operatorExclusiveCatalog,
  operatorExclusivePermissionKeys,
  operatorProductCatalogs,
} from './operator-permissions'
import {
  CONSOLE_ACCESS_PERMISSION,
  CONSOLE_DANGER_ZONE_PERMISSION,
  CONSOLE_SUPER_ADMIN_ROLE,
  hasPermission,
  PERMISSION_GROUPS,
  permissionsForRole,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
} from './permissions'

// Every role/editor test below is checked against this full universe, not
// just `consolePermissionCatalog` — since §6.1, a role may also hold a
// product's projected keys (`crm/requests.view`) and the Console-only
// operator-exclusive keys (`console:crm.purge`), neither of which the plain
// Console catalog declares.
const OPERATOR_UNIVERSE_KEYS = new Set([
  ...consolePermissionCatalog.permissions.map((permission) => permission.key),
  ...operatorProductCatalogs().flatMap((catalog) =>
    catalog.permissions.map((permission) => permission.key)
  ),
  ...operatorExclusiveCatalog().permissions.map((permission) => permission.key),
])

const EXPECTED_ROLE_COUNTS = {
  staff: 70,
  admin: 229,
  'super-admin': 241,
} as const

describe('Console permission catalog', () => {
  it('publishes the built-in roles in privilege order', () => {
    expect(SYSTEM_ROLE_NAMES).toEqual(['staff', 'admin', 'super-admin'])
  })

  it('pins the exact staff permission count', () => {
    expect(SYSTEM_ROLE_DEFINITIONS[0]?.permissions.length).toBe(
      EXPECTED_ROLE_COUNTS.staff
    )
  })

  it('pins the exact admin permission count', () => {
    expect(SYSTEM_ROLE_DEFINITIONS[1]?.permissions.length).toBe(
      EXPECTED_ROLE_COUNTS.admin
    )
  })

  it('pins the exact super-admin permission count', () => {
    expect(SYSTEM_ROLE_DEFINITIONS[2]?.permissions.length).toBe(
      EXPECTED_ROLE_COUNTS['super-admin']
    )
  })

  it('grants Console access to every built-in role', () => {
    expect(
      SYSTEM_ROLE_DEFINITIONS.filter(
        (role) => !role.permissions.includes(CONSOLE_ACCESS_PERMISSION)
      ).map((role) => role.name)
    ).toEqual([])
  })

  it('reserves danger-zone access for super admin', () => {
    expect(
      SYSTEM_ROLE_DEFINITIONS.filter((role) =>
        role.permissions.includes(CONSOLE_DANGER_ZONE_PERMISSION)
      ).map((role) => role.name)
    ).toEqual(['super-admin'])
  })

  it('keeps staff free of delete permissions', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((role) => role.name === 'staff')

    expect(
      staff?.permissions.filter((permission) => permission.endsWith(':delete'))
    ).toEqual([])
  })

  it('keeps staff out of the danger zone', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((role) => role.name === 'staff')

    expect(staff?.permissions.includes(CONSOLE_DANGER_ZONE_PERMISSION)).toBe(
      false
    )
  })

  it('keeps every system-role permission inside the operator permission universe', () => {
    const unknown = SYSTEM_ROLE_DEFINITIONS.flatMap((role) =>
      role.permissions.filter(
        (permission) => !OPERATOR_UNIVERSE_KEYS.has(permission)
      )
    )

    expect(unknown).toEqual([])
  })

  it('grants super admin every permission the operator universe declares', () => {
    const superAdmin = SYSTEM_ROLE_DEFINITIONS.find(
      (role) => role.name === CONSOLE_SUPER_ADMIN_ROLE
    )
    const missing = [...OPERATOR_UNIVERSE_KEYS].filter(
      (permission) => !superAdmin?.permissions.includes(permission)
    )

    expect(missing).toEqual([])
  })

  it('reserves every operator-exclusive (purge) key for super admin alone', () => {
    const exclusiveKeys = operatorExclusivePermissionKeys()

    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      const held = role.permissions.filter((permission) =>
        exclusiveKeys.includes(permission)
      )

      if (role.name === CONSOLE_SUPER_ADMIN_ROLE) {
        expect(held.sort()).toEqual([...exclusiveKeys].sort())
      } else {
        expect(held).toEqual([])
      }
    }
  })

  it('does not let an operator-exclusive key imply any projected read key', () => {
    // §6.4: implication is how privilege quietly widens. Holding
    // `console:crm.purge` must not, by itself, grant `crm/requests.view` —
    // super admin holds both only because PRODUCT_ALL is granted
    // independently, not because purge implies read.
    const exclusiveOnlyRole = {
      name: 'exclusive-only-probe',
      permissions: operatorExclusivePermissionKeys(),
    }
    const productReadKeys = operatorProductCatalogs().flatMap((catalog) =>
      catalog.permissions.map((permission) => permission.key)
    )

    const impliedReads = productReadKeys.filter((key) =>
      exclusiveOnlyRole.permissions.includes(key)
    )

    expect(impliedReads).toEqual([])
  })

  it('withholds team management and security from staff', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((role) => role.name === 'staff')

    expect(staff?.permissions).not.toContain('team:list')
    expect(staff?.permissions).not.toContain('team:revoke')
    expect(staff?.permissions).not.toContain('console:security')
    expect(staff?.permissions).not.toContain('console:danger-zone')
  })

  it('withholds security and the danger zone from admin', () => {
    const admin = SYSTEM_ROLE_DEFINITIONS.find((role) => role.name === 'admin')

    expect(admin?.permissions).toContain('team:revoke')
    expect(admin?.permissions).not.toContain('console:security')
    expect(admin?.permissions).not.toContain('console:danger-zone')
  })

  it('checks a supplied permission list through the core access primitive', () => {
    const access = { permissions: ['console:access', 'users:update'] }

    const result = hasPermission(access, 'users:update')

    expect(result).toBe(true)
  })

  it('accepts the exact legacy danger-zone permission during the migration', () => {
    expect(
      hasPermission(
        { permissions: ['console:danger_zone'] },
        CONSOLE_DANGER_ZONE_PERMISSION
      )
    ).toBe(true)
  })

  it('normalizes the exact legacy super-admin role during the migration', () => {
    const legacyCatalog = {
      super_admin: ['console:access', 'console:danger_zone'],
    }

    expect(permissionsForRole('super_admin', legacyCatalog)).toEqual([
      'console:access',
      'console:danger-zone',
    ])
  })

  it('returns false when a supplied permission list omits the key', () => {
    const access = { permissions: ['console:access', 'users:update'] }

    const result = hasPermission(access, 'users:delete')

    expect(result).toBe(false)
  })

  it('does not match a permission prefix', () => {
    const access = { permissions: ['users:reading'] }

    const result = hasPermission(access, 'users:read')

    expect(result).toBe(false)
  })

  it('returns a defensive copy of fallback permissions', () => {
    const first = permissionsForRole('staff')
    first.push('mutated')

    const second = permissionsForRole('staff')

    expect(second).toEqual(SYSTEM_ROLE_DEFINITIONS[0]?.permissions)
  })

  it.each([null, undefined, ''])(
    'returns no permissions for role %j',
    (role) => {
      const result = permissionsForRole(role)

      expect(result).toEqual([])
    }
  )

  it('returns no permissions for an unknown role', () => {
    const result = permissionsForRole('unknown')

    expect(result).toEqual([])
  })

  it('uses the supplied runtime role catalog', () => {
    const catalog = { auditor: ['users:read', 'users:list'] }

    const result = permissionsForRole('auditor', catalog)

    expect(result).toEqual(['users:read', 'users:list'])
    expect(result).not.toBe(catalog.auditor)
  })

  it('derives Console editor groups in the same module order as the catalog, followed by each product then operator-exclusive actions', () => {
    expect(PERMISSION_GROUPS.map((group) => group.label)).toEqual([
      'Console',
      'Users',
      'Organizations',
      'Memberships',
      'Apps',
      'Roles',
      'Team',
      'Billing · Dashboard',
      'Billing · Customers',
      'Billing · Catalog',
      'Billing · Sales',
      'Billing · Subscriptions',
      'Billing · Reports',
      'Billing · Currencies',
      'Billing · Taxes',
      'Billing · Vendors',
      'Billing · Purchases',
      'Billing · Banking',
      'Billing · Payments',
      'Billing · Payment methods',
      'Billing · Settings',
      'Couriers · Items',
      'Couriers · Customers',
      'Couriers · Packages',
      'Couriers · Pre-alerts',
      'Couriers · Warehouse',
      'Couriers · Manifests',
      'Couriers · Deliveries',
      'Couriers · Invoices',
      'Couriers · Payments',
      'Couriers · Reports',
      'Couriers · Settings',
      'CRM · Requests',
      'CRM · Customers',
      'CRM · Tasks',
      'CRM · Reminders',
      'CRM · Events',
      'CRM · Calendars',
      'CRM · My Work',
      'CRM · Notes',
      'CRM · Teams',
      'CRM · Categories',
      'CRM · Priorities',
      'CRM · Request forms',
      'CRM · Reports',
      'CRM · Settings',
      'Invoice · Dashboard',
      'Invoice · Customers',
      'Invoice · Items',
      'Invoice · Invoices',
      'Invoice · Estimates',
      'Invoice · Payments',
      'Invoice · Reports',
      'Invoice · Settings',
      'Projects · Dashboard',
      'Projects · Projects',
      'Projects · Issues',
      'Projects · Comments',
      'Projects · Labels',
      'Projects · Members',
      'Projects · Reports',
      'Projects · Settings',
      'Billing · Operator actions',
      'Couriers · Operator actions',
      'CRM · Operator actions',
      'Invoice · Operator actions',
      'Projects · Operator actions',
    ])
  })

  it('derives every editor permission from the operator permission universe', () => {
    const editorValues = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.value)
    ).sort()
    const universeValues = [...OPERATOR_UNIVERSE_KEYS].sort()

    expect(editorValues).toEqual(universeValues)
  })

  it('contains no editor permission outside the operator permission universe', () => {
    const extra = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions
        .map((permission) => permission.value)
        .filter((permission) => !OPERATOR_UNIVERSE_KEYS.has(permission))
    )

    expect(extra).toEqual([])
  })

  it('contains unique permission values in the editor catalog', () => {
    const values = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.value)
    )

    expect(new Set(values).size).toBe(OPERATOR_UNIVERSE_KEYS.size)
  })

  it('renders action-only labels inside an already-labelled module group', () => {
    const roles = PERMISSION_GROUPS.find((group) => group.label === 'Roles')

    expect(roles?.permissions.map((permission) => permission.label)).toEqual([
      'Read',
      'List',
      'Create',
      'Update',
      'Delete',
    ])
  })
})
