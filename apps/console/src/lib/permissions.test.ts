import { describe, expect, it } from 'vitest'

import {
  CONSOLE_ACCESS_PERMISSION,
  CONSOLE_DANGER_ZONE_PERMISSION,
  PERMISSION_GROUPS,
  permissionsForRole,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
} from './permissions'

describe('Console permission catalog', () => {
  it('publishes the built-in roles in privilege order', () => {
    expect(SYSTEM_ROLE_NAMES).toEqual([
      'staff',
      'admin',
      'owner',
      'super_admin',
    ])
  })

  it('grants Console access to every built-in role', () => {
    expect(
      SYSTEM_ROLE_DEFINITIONS.every((role) =>
        role.permissions.includes(CONSOLE_ACCESS_PERMISSION)
      )
    ).toBe(true)
  })

  it('reserves danger-zone access for owner and super admin', () => {
    expect(
      SYSTEM_ROLE_DEFINITIONS.filter((role) =>
        role.permissions.includes(CONSOLE_DANGER_ZONE_PERMISSION)
      ).map((role) => role.name)
    ).toEqual(['owner', 'super_admin'])
  })

  it('returns a defensive copy of fallback permissions', () => {
    const first = permissionsForRole('staff')
    first.push('mutated')

    const second = permissionsForRole('staff')

    expect(second).not.toContain('mutated')
    expect(second).toEqual(SYSTEM_ROLE_DEFINITIONS[0].permissions)
  })

  it.each([null, undefined, ''])(
    'returns no permissions for role %j',
    (role) => {
      expect(permissionsForRole(role)).toEqual([])
    }
  )

  it('returns no permissions for an unknown role', () => {
    expect(permissionsForRole('unknown')).toEqual([])
  })

  it('uses the supplied runtime role catalog', () => {
    const catalog = { auditor: ['users:read', 'users:list'] }

    const result = permissionsForRole('auditor', catalog)

    expect(result).toEqual(['users:read', 'users:list'])
    expect(result).not.toBe(catalog.auditor)
  })

  it('contains unique permission values in the editor catalog', () => {
    const values = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((permission) => permission.value)
    )

    expect(new Set(values).size).toBe(values.length)
  })
})
