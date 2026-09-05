import { describe, expect, it } from 'vitest'

import { resolveAppAssignmentRole } from './app-assignment-role'

const roles = [
  { id: 'role_super', key: 'super-admin', isDefault: false, deletedAt: null },
  { id: 'role_admin', key: 'admin', isDefault: false, deletedAt: null },
  { id: 'role_staff', key: 'staff', isDefault: true, deletedAt: null },
]

function resolve(
  overrides: Partial<Parameters<typeof resolveAppAssignmentRole>[0]> = {}
) {
  return resolveAppAssignmentRole({
    organizationRole: 'member',
    roles,
    ...overrides,
  })
}

describe('resolveAppAssignmentRole', () => {
  it('maps super_admin to super-admin', () =>
    expect(resolve({ organizationRole: 'super_admin' })).toEqual({
      role: roles[0],
      source: 'organization-role',
    }))
  it('maps super-admin to super-admin', () =>
    expect(resolve({ organizationRole: 'super-admin' })).toEqual({
      role: roles[0],
      source: 'organization-role',
    }))
  it('maps uppercase super admin safely', () =>
    expect(resolve({ organizationRole: 'SUPER_ADMIN' })).toEqual({
      role: roles[0],
      source: 'organization-role',
    }))
  it('maps admin to admin', () =>
    expect(resolve({ organizationRole: 'admin' })).toEqual({
      role: roles[1],
      source: 'organization-role',
    }))
  it('maps ordinary members to default', () =>
    expect(resolve()).toEqual({ role: roles[2], source: 'default' }))
  it('maps missing organization role to default', () =>
    expect(resolve({ organizationRole: null })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('maps malformed organization role to default', () =>
    expect(resolve({ organizationRole: { role: 'admin' } })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('uses a requested live role first', () =>
    expect(
      resolve({ organizationRole: 'member', requestedRoleId: 'role_admin' })
    ).toEqual({ role: roles[1], source: 'requested' }))
  it('falls back after an unknown requested role', () =>
    expect(
      resolve({ organizationRole: 'admin', requestedRoleId: 'missing' })
    ).toEqual({ role: roles[1], source: 'organization-role' }))
  it('does not substitute admin when super-admin is absent', () =>
    expect(
      resolve({ organizationRole: 'super_admin', roles: roles.slice(1) })
    ).toEqual({ role: roles[2], source: 'default' }))
  it('does not use a deleted super-admin role', () =>
    expect(
      resolve({
        organizationRole: 'super_admin',
        roles: [{ ...roles[0], deletedAt: 1 }, roles[2]],
      })
    ).toEqual({ role: roles[2], source: 'default' }))
  it('does not use a deleted requested role', () =>
    expect(
      resolve({
        requestedRoleId: 'role_admin',
        roles: [{ ...roles[1], deletedAt: 1 }, roles[2]],
      })
    ).toEqual({ role: roles[2], source: 'default' }))
  it('returns none with no roles', () =>
    expect(resolve({ roles: [] })).toEqual({ role: null, source: 'none' }))
  it('returns none when all roles are deleted', () =>
    expect(
      resolve({ roles: roles.map((role) => ({ ...role, deletedAt: 1 })) })
    ).toEqual({ role: null, source: 'none' }))
  it('uses the first live default deterministically', () =>
    expect(
      resolve({
        roles: [
          roles[1],
          roles[2],
          { id: 'role_other', key: 'viewer', isDefault: true, deletedAt: null },
        ],
      })
    ).toEqual({ role: roles[2], source: 'default' }))
  it('does not map admin-like names', () =>
    expect(resolve({ organizationRole: 'administrator' })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('does not map member-like names', () =>
    expect(resolve({ organizationRole: 'super_admin_assistant' })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('accepts an undefined requested role', () =>
    expect(resolve({ requestedRoleId: undefined })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('accepts a null requested role', () =>
    expect(resolve({ requestedRoleId: null })).toEqual({
      role: roles[2],
      source: 'default',
    }))
  it('keeps the complete role object in its result', () =>
    expect(resolve({ organizationRole: 'admin' })).toEqual({
      role: {
        id: 'role_admin',
        key: 'admin',
        isDefault: false,
        deletedAt: null,
      },
      source: 'organization-role',
    }))
})
