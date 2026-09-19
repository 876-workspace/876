import { describe, expect, it } from 'vitest'
import { consolePermissionCatalog } from '@876/core/access/catalogs'
import {
  operatorExclusiveCatalog,
  operatorProductCatalogs,
} from '../operator-permissions'
import {
  CONSOLE_ACCESS_PERMISSION,
  CONSOLE_DANGER_ZONE_PERMISSION,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
  hasPermission,
  permissionsForRole,
  permissionGroupKeys,
} from '../permissions'

describe('permissions — weird edge cases', () => {
  it('hasPermission is case-sensitive (users:read vs USERS:READ)', () => {
    expect(hasPermission({ permissions: ['users:read'] }, 'USERS:READ')).toBe(
      false
    )
  })
  it('hasPermission handles empty permission string', () => {
    expect(hasPermission({ permissions: ['users:read'] }, '')).toBe(false)
  })
  it('hasPermission handles null permission', () => {
    expect(
      hasPermission({ permissions: ['users:read'] }, null as unknown as string)
    ).toBe(false)
  })
  it('hasPermission handles numeric permission', () => {
    expect(
      hasPermission({ permissions: ['users:read'] }, 42 as unknown as string)
    ).toBe(false)
  })
  it('hasPermission handles symbol permission', () => {
    expect(
      hasPermission(
        { permissions: ['users:read'] },
        Symbol('users:read') as unknown as string
      )
    ).toBe(false)
  })
  it('hasPermission handles permission with spaces', () => {
    expect(hasPermission({ permissions: ['users:read'] }, ' users:read ')).toBe(
      false
    )
  })
  it('hasPermission handles permission with null char', () => {
    expect(
      hasPermission({ permissions: ['users:read'] }, 'users:read\u0000')
    ).toBe(false)
  })
  it('hasPermission handles emoji permission', () => {
    expect(hasPermission({ permissions: ['😀:read'] }, '😀:read')).toBe(true)
    expect(hasPermission({ permissions: ['users:read'] }, '😀:read')).toBe(
      false
    )
  })
  it('hasPermission handles extremely long permission (10k)', () => {
    const long = 'a'.repeat(10000)
    expect(hasPermission({ permissions: [long] }, long)).toBe(true)
  })
  it('hasPermission handles __proto__ as legit permission', () => {
    expect(hasPermission({ permissions: ['__proto__'] }, '__proto__')).toBe(
      true
    )
  })
  it('hasPermission is polluted via Object.prototype (current impl)', () => {
    // @ts-expect-error deliberate runtime type violation under test
    Object.prototype.permissions = ['pwned']
    const res = hasPermission(
      {} as unknown as { permissions: string[] },
      'pwned'
    )
    delete (Object.prototype as unknown as Record<string, unknown>).permissions
    expect(res).toBe(true)
  })
  it('hasPermission handles sparse permissions array', () => {
    const sparse = Array(3) as unknown as string[]
    sparse[1] = 'users:read'
    expect(hasPermission({ permissions: sparse }, 'users:read')).toBe(true)
  })
  it('hasPermission handles Uint8Array (not array -> false)', () => {
    expect(
      hasPermission(
        { permissions: new Uint8Array([1]) as unknown as string[] },
        'users:read'
      )
    ).toBe(false)
  })
  it('hasPermission handles array-like object with length', () => {
    const fake = { 0: 'users:read', length: 1 } as unknown as string[]
    expect(hasPermission({ permissions: fake }, 'users:read')).toBe(false)
  })
  it('hasPermission handles frozen permissions', () => {
    expect(
      hasPermission(
        { permissions: Object.freeze(['users:read']) as unknown as string[] },
        'users:read'
      )
    ).toBe(true)
  })
  it('hasPermission handles Object.create(null) access object', () => {
    const acc = Object.create(null) as { permissions: string[] }
    acc.permissions = ['users:read']
    expect(hasPermission(acc, 'users:read')).toBe(true)
  })
  it('hasPermission does not match prefix (users:reading vs users:read)', () => {
    expect(
      hasPermission({ permissions: ['users:reading'] }, 'users:read')
    ).toBe(false)
  })
  it('hasPermission handles permission with RTL override', () => {
    expect(
      hasPermission({ permissions: ['users\u202e:read'] }, 'users\u202e:read')
    ).toBe(true)
  })
  it('hasPermission handles permissions containing duplicates', () => {
    expect(
      hasPermission({ permissions: ['users:read', 'users:read'] }, 'users:read')
    ).toBe(true)
  })
  it('hasPermission handles permissions containing null/undefined/symbol', () => {
    const perms = [
      'users:read',
      null as unknown as string,
      undefined as unknown as string,
      42 as unknown as string,
    ]
    expect(hasPermission({ permissions: perms }, 'users:read')).toBe(true)
    expect(hasPermission({ permissions: perms }, '42')).toBe(false)
  })
  it('CONSOLE_ACCESS_PERMISSION is stable colon-delimited', () => {
    expect(CONSOLE_ACCESS_PERMISSION).toBe('console:access')
    expect(CONSOLE_ACCESS_PERMISSION.includes(':')).toBe(true)
    expect(CONSOLE_ACCESS_PERMISSION.includes('.')).toBe(false)
  })
  it('CONSOLE_DANGER_ZONE_PERMISSION is canonical kebab-case', () => {
    expect(CONSOLE_DANGER_ZONE_PERMISSION).toBe('console:danger-zone')
  })
  it('legacy danger-zone permission is accepted during migration', () => {
    expect(
      hasPermission(
        { permissions: ['console:danger_zone'] },
        'console:danger-zone'
      )
    ).toBe(true)
  })
  it('permissionsForRole rejects inherited __proto__ role keys', () => {
    expect(permissionsForRole('__proto__')).toEqual([])
  })
  it('permissionsForRole rejects inherited constructor role keys', () => {
    expect(permissionsForRole('constructor')).toEqual([])
  })
  it('permissionsForRole handles empty string', () => {
    expect(permissionsForRole('')).toEqual([])
  })
  it('permissionsForRole handles spaces', () => {
    expect(permissionsForRole(' admin ')).toEqual([])
  })
  it('permissionsForRole handles numeric role', () => {
    expect(permissionsForRole(42 as unknown as string)).toEqual([])
  })
  it('permissionsForRole is case-sensitive', () => {
    expect(permissionsForRole('Staff')).toEqual([])
    expect(permissionsForRole('staff').length).toBeGreaterThan(0)
  })
  it('permissionsForRole handles legacy super_admin role during migration', () => {
    expect(permissionsForRole('super_admin')).toEqual(
      permissionsForRole('super-admin')
    )
  })
  it('permissionsForRole handles 10k role name', () => {
    expect(permissionsForRole('a'.repeat(10000))).toEqual([])
  })
  it('permissionsForRole returns defensive copy (mutating does not affect fallback)', () => {
    const before = permissionsForRole('staff')
    const stolen = permissionsForRole('staff')
    stolen.push('evil:perm')
    expect(permissionsForRole('staff')).toEqual(before)
  })
  it('permissionsForRole handles injected catalog with __proto__ as own property', () => {
    const catalog: Record<string, string[]> = Object.create(null)
    catalog['__proto__'] = ['pwned']
    catalog['staff'] = ['users:read']
    expect(permissionsForRole('staff', catalog)).toEqual(['users:read'])
    expect(permissionsForRole('__proto__', catalog)).toEqual(['pwned'])
  })
  it('permissionsForRole throws when catalog is null (runtime)', () => {
    // @ts-expect-error deliberate runtime null under test
    expect(() => permissionsForRole('staff', null)).toThrow(TypeError)
  })
  it('SYSTEM_ROLE_NAMES is in privilege order (staff first, super-admin last)', () => {
    expect(SYSTEM_ROLE_NAMES).toEqual(['staff', 'admin', 'super-admin'])
  })
  it('SYSTEM_ROLE_DEFINITIONS contains no unknown permissions (weird check with empty catalog)', () => {
    // §6.1: a role may also hold a product's projected key (`crm/requests.view`)
    // or a Console-only operator-exclusive key (`console:crm.purge`), neither
    // of which `consolePermissionCatalog` alone declares.
    const keys = new Set([
      ...consolePermissionCatalog.permissions.map((p) => p.key),
      ...operatorProductCatalogs().flatMap((catalog) =>
        catalog.permissions.map((p) => p.key)
      ),
      ...operatorExclusiveCatalog().permissions.map((p) => p.key),
    ])
    for (const role of SYSTEM_ROLE_DEFINITIONS) {
      for (const p of role.permissions) {
        expect(keys.has(p)).toBe(true)
      }
    }
  })
  it('SYSTEM_ROLE_DEFINITIONS staff does not contain team perms even when queried weirdly', () => {
    const staff = SYSTEM_ROLE_DEFINITIONS.find((r) => r.name === 'staff')!
    expect(staff.permissions.some((p) => p.startsWith('team:'))).toBe(false)
    expect(staff.permissions.includes('team:list' as string)).toBe(false)
  })
  it('PERMISSION_GROUPS labels are non-empty and unique', () => {
    const labels = PERMISSION_GROUPS.map((g) => g.label)
    expect(labels.every((l) => l.trim().length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })
  it('PERMISSION_GROUPS values are either Console colon-keys or product/operator-exclusive keys, and match the operator universe', () => {
    // Console's own vocabulary stays `module:action`. A projected product key
    // is `product/module.action` (no colon), and an operator-exclusive key is
    // `console:product.action` (both a colon and a dot) — §6.1's three planes.
    const universeKeys = new Set([
      ...consolePermissionCatalog.permissions.map((p) => p.key),
      ...operatorProductCatalogs().flatMap((catalog) =>
        catalog.permissions.map((p) => p.key)
      ),
      ...operatorExclusiveCatalog().permissions.map((p) => p.key),
    ])
    for (const p of permissionGroupKeys(PERMISSION_GROUPS).map((value) => ({
      value,
      label: value,
    }))) {
      expect(p.value.includes(':') || p.value.includes('/')).toBe(true)
      expect(universeKeys.has(p.value)).toBe(true)
      expect(p.label.trim().length).toBeGreaterThan(0)
    }
  })
  it('PERMISSION_GROUPS exposes canonical dangerous permissions', () => {
    const all = permissionGroupKeys(PERMISSION_GROUPS)
    expect(all.includes('console:danger-zone')).toBe(true)
    expect(all.includes('console:danger_zone')).toBe(false)
    expect(all.includes('users:delete')).toBe(true)
  })
  it('PERMISSION_GROUPS handles RTL override in label (still preserves)', () => {
    const found = PERMISSION_GROUPS.flatMap((g) =>
      g.modules.flatMap((module) => module.permissions)
    ).find((p) => p.value === 'users:read')
    expect(found?.label).toBe('Read')
  })
  it('hasPermission handles permission with newline', () => {
    expect(hasPermission({ permissions: ['users:read'] }, 'users:read\n')).toBe(
      false
    )
  })
  it('handles permissions with prototype pollution attempt in array', () => {
    const polluted = ['users:read'] as string[] & Record<string, unknown>
    ;(polluted.__proto__ as string[]).push('pwned')
    expect(hasPermission({ permissions: ['users:read'] }, 'pwned')).toBe(false)
  })
})
