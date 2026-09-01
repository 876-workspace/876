import { describe, expect, it } from 'vitest'

import {
  hasPermission,
  CONSOLE_ACCESS_PERMISSION,
  CONSOLE_DANGER_ZONE_PERMISSION,
  CONSOLE_SUPER_ADMIN_ROLE,
  SYSTEM_ROLE_DEFINITIONS,
} from './permissions'
import { consolePermissionCatalog } from '@876/core/access/catalogs'
import { toStoredPermissionKeys } from '@876/core/access/catalogs'

describe('permissions — console access gate', () => {
  it('CONSOLE_ACCESS_PERMISSION is console:access', () => {
    expect(CONSOLE_ACCESS_PERMISSION).toBe('console:access')
  })

  it('CONSOLE_DANGER_ZONE_PERMISSION is console:danger-zone', () => {
    expect(CONSOLE_DANGER_ZONE_PERMISSION).toBe('console:danger-zone')
  })

  it('hasPermission true when permission held', () => {
    expect(
      hasPermission(
        { permissions: ['console:access', 'users:read'] },
        'console:access'
      )
    ).toBe(true)
  })

  it('hasPermission false when not held', () => {
    expect(
      hasPermission({ permissions: ['users:read'] }, 'console:access')
    ).toBe(false)
  })

  it('hasPermission false for empty', () => {
    expect(hasPermission({ permissions: [] }, 'console:access')).toBe(false)
  })

  it('hasPermission is case-sensitive', () => {
    expect(
      hasPermission({ permissions: ['console:access'] }, 'Console:Access')
    ).toBe(false)
  })

  it('grants the requests permission from a stored canonical key', () => {
    const stored = toStoredPermissionKeys(['console:requests'])

    expect(hasPermission({ permissions: stored }, 'console:requests')).toBe(
      true
    )
    expect(hasPermission({ permissions: stored }, 'console:support')).toBe(
      false
    )
  })

  it('staff can access console and requests but not billing', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'staff')!
    expect(hasPermission(staff, 'console:access')).toBe(true)
    expect(hasPermission(staff, 'console:requests')).toBe(true)
    expect(hasPermission(staff, 'console:billing')).toBe(false)
    expect(hasPermission(staff, 'console:danger-zone')).toBe(false)
  })

  it('admin can access billing and team but not danger-zone', () => {
    const admin = SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'admin')!
    expect(hasPermission(admin, 'console:billing')).toBe(true)
    expect(hasPermission(admin, 'team:invite')).toBe(true)
    expect(hasPermission(admin, 'console:danger-zone')).toBe(false)
  })

  it('super admin can access danger_zone and security', () => {
    const superAdmin = SYSTEM_ROLE_DEFINITIONS.find(
      (role) => role.name === 'super-admin'
    )!
    expect(hasPermission(superAdmin, 'console:danger_zone')).toBe(true)
    expect(hasPermission(superAdmin, 'console:security')).toBe(true)
  })

  it('all system roles have permissions subset of catalog', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      for (const perm of role.permissions) {
        expect(
          catalogKeys.has(perm),
          `role ${role.name} has unknown permission ${perm}`
        ).toBe(true)
      }
    }
  })

  it('no system role still carries the retired support key', () => {
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      expect(role.permissions).not.toContain('console:support')
    }
  })

  it('all roles are deduped', () => {
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      expect(new Set(role.permissions).size).toBe(role.permissions.length)
    }
  })

  it('legacy danger-zone alias resolves to the canonical permission', () => {
    expect(
      hasPermission(
        { permissions: ['console:danger_zone'] },
        'console:danger-zone'
      )
    ).toBe(true)
  })

  it('hasPermission handles weird permission type without throwing', () => {
    expect(() =>
      hasPermission(
        { permissions: ['console:access'] },
        null as unknown as string
      )
    ).not.toThrow()
    expect(
      hasPermission(
        { permissions: ['console:access'] },
        null as unknown as string
      )
    ).toBe(false)
    expect(
      hasPermission({ permissions: ['console:access'] }, '' as string)
    ).toBe(false)
  })

  it('hasPermission with __proto__ does not pollute', () => {
    expect(hasPermission({ permissions: ['__proto__'] }, '__proto__')).toBe(
      true
    )
    expect(
      hasPermission({ permissions: ['console:access'] }, '__proto__')
    ).toBe(false)
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined()
  })
})

describe('SYSTEM_ROLE_DEFINITIONS — hierarchy', () => {
  it('has 3 roles', () => {
    expect(SYSTEM_ROLE_DEFINITIONS.map((r) => r.name)).toEqual([
      'staff',
      'admin',
      'super-admin',
    ])
  })

  it('each higher role superset of lower (staff ⊆ admin)', () => {
    const staffPerms = new Set(
      SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'staff')!.permissions
    )
    const adminPerms = new Set(
      SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'admin')!.permissions
    )
    for (const p of staffPerms) expect(adminPerms.has(p)).toBe(true)
  })

  it('admin ⊆ super_admin', () => {
    const adminPerms = new Set(
      SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'admin')!.permissions
    )
    const superAdminPerms = new Set(
      SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'super-admin')!.permissions
    )
    for (const permission of adminPerms)
      expect(superAdminPerms.has(permission)).toBe(true)
  })

  it('super-admin has all dangerous permissions', () => {
    const superPerms = SYSTEM_ROLE_DEFINITIONS.find(
      (r) => r.name === CONSOLE_SUPER_ADMIN_ROLE
    )!.permissions
    const dangerous = consolePermissionCatalog.permissions
      .filter((p) => p.isDangerous)
      .map((p) => p.key)
    for (const d of dangerous) expect(superPerms).toContain(d)
  })

  it('staff has no dangerous permissions', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find(
      (r) => r.name === 'staff'
    )!.permissions
    const dangerous = new Set(
      consolePermissionCatalog.permissions
        .filter((p) => p.isDangerous)
        .map((p) => p.key)
    )
    for (const p of staff) expect(dangerous.has(p)).toBe(false)
  })
})
