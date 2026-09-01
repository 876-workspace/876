import { consolePermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import {
  CONSOLE_ACCESS_PERMISSION,
  CONSOLE_DANGER_ZONE_PERMISSION,
  hasPermission,
  PERMISSION_GROUPS,
  permissionsForRole,
  SUPER_ADMIN_ROLE,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
} from './permissions'

const EXPECTED_ROLE_COUNTS = {
  staff: 15,
  admin: 39,
  super_admin: 46,
} as const

describe('Console permission catalog', () => {
  it('publishes the built-in roles in privilege order', () => {
    expect(SYSTEM_ROLE_NAMES).toEqual(['staff', 'admin', 'super_admin'])
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
      EXPECTED_ROLE_COUNTS.super_admin
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
    ).toEqual(['super_admin'])
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

  it('keeps every system-role permission inside the canonical catalog', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((permission) => permission.key)
    )
    const unknown = SYSTEM_ROLE_DEFINITIONS.flatMap((role) =>
      role.permissions.filter((permission) => !catalogKeys.has(permission))
    )

    expect(unknown).toEqual([])
  })

  it('grants super admin every permission the catalog declares', () => {
    const superAdmin = SYSTEM_ROLE_DEFINITIONS.find(
      (role) => role.name === SUPER_ADMIN_ROLE
    )
    const missing = consolePermissionCatalog.permissions
      .map((permission) => permission.key)
      .filter((permission) => !superAdmin?.permissions.includes(permission))

    expect(missing).toEqual([])
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

  it('derives editor groups in the same module order as the catalog', () => {
    expect(PERMISSION_GROUPS.map((group) => group.label)).toEqual([
      'Console',
      'Users',
      'Organizations',
      'Memberships',
      'Apps',
      'Roles',
      'Team',
    ])
  })

  it('derives every editor permission from the canonical catalog', () => {
    const editorValues = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.value)
    ).sort()
    const catalogValues = consolePermissionCatalog.permissions
      .map((permission) => permission.key)
      .sort()

    expect(editorValues).toEqual(catalogValues)
  })

  it('contains no editor permission outside the canonical catalog', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((permission) => permission.key)
    )
    const extra = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions
        .map((permission) => permission.value)
        .filter((permission) => !catalogKeys.has(permission))
    )

    expect(extra).toEqual([])
  })

  it('contains unique permission values in the editor catalog', () => {
    const values = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.value)
    )

    expect(new Set(values).size).toBe(46)
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
