/**
 * Every expected value here was dumped from `core/org_permissions.py` and is
 * asserted literally, not derived from the module under test. Deriving them
 * would make the suite pass for whatever the port happens to produce; these
 * arrays are seeded into `organization_roles.permissions`, so agreeing with the
 * Python is the only property that matters.
 *
 * Regenerate with (from `apps/api`, with the Python venv):
 *
 *     .venv/bin/python -c "import json,sys; sys.path.insert(0,'.'); \
 *       from core.org_permissions import DEFAULT_ORG_ROLES as R; \
 *       print(json.dumps([{'n':r.name,'p':r.permissions} for r in R], indent=1))"
 */

import { describe, expect, it } from 'vitest'

import {
  ALL_ORG_PERMISSIONS,
  ALL_ORG_PERMISSIONS_SORTED,
  DEFAULT_MEMBER_ROLE_NAME,
  DEFAULT_ORG_ROLES,
  DEFAULT_ORG_ROLES_BY_NAME,
  isValidOrgPermission,
  ORG_PERMISSION_GROUPS,
  SUPER_ADMIN_ROLE_NAME,
  defaultPermissionsForRoleName,
} from '../permissions'

const PY_ALL_SORTED = [
  'apps:assign',
  'apps:provision',
  'apps:read',
  'billing:manage',
  'billing:read',
  'members:invite',
  'members:manage',
  'members:read',
  'org:delete',
  'org:read',
  'org:update',
  'roles:manage',
  'roles:read',
  'structure:manage',
  'structure:read',
]

const PY_ADMIN = [
  'apps:assign',
  'apps:provision',
  'apps:read',
  'members:invite',
  'members:manage',
  'members:read',
  'org:read',
  'org:update',
  'roles:manage',
  'roles:read',
  'structure:manage',
  'structure:read',
]

const PY_STAFF = ['org:read', 'members:read', 'structure:read']

describe('the org permission catalog', () => {
  it('groups the permissions exactly as the Python catalog does', () => {
    expect(ORG_PERMISSION_GROUPS).toEqual({
      Organization: ['org:read', 'org:update', 'org:delete'],
      Billing: ['billing:read', 'billing:manage'],
      Members: ['members:read', 'members:invite', 'members:manage'],
      Roles: ['roles:read', 'roles:manage'],
      Apps: ['apps:read', 'apps:provision', 'apps:assign'],
      Structure: ['structure:read', 'structure:manage'],
    })
  })

  it('holds exactly the 15 catalog permissions', () => {
    expect(ALL_ORG_PERMISSIONS.size).toBe(15)
    expect([...ALL_ORG_PERMISSIONS].sort()).toEqual(PY_ALL_SORTED)
  })

  it('exposes the sorted catalog in the order the super admin role is seeded with', () => {
    expect(ALL_ORG_PERMISSIONS_SORTED).toEqual(PY_ALL_SORTED)
  })

  it('contains no duplicate permission across groups', () => {
    const flat = Object.values(ORG_PERMISSION_GROUPS).flat()
    expect(flat).toHaveLength(ALL_ORG_PERMISSIONS.size)
  })

  it.each(PY_ALL_SORTED)('accepts %s as a valid permission', (permission) => {
    expect(isValidOrgPermission(permission)).toBe(true)
  })

  it.each([
    ['an unknown resource', 'widgets:read'],
    ['an unknown action', 'org:destroy'],
    ['a bare resource', 'org'],
    ['the empty string', ''],
    ['a wildcard', '*'],
    ['a permission with different casing', 'Org:Read'],
    ['a permission with surrounding space', ' org:read '],
  ])('rejects %s', (_label, permission) => {
    expect(isValidOrgPermission(permission)).toBe(false)
  })
})

describe('the default org roles', () => {
  it('defines exactly the three seeded roles, in order', () => {
    expect(DEFAULT_ORG_ROLES.map((role) => role.name)).toEqual([
      'super_admin',
      'admin',
      'staff',
    ])
  })

  it('seeds super admin with the full sorted catalog', () => {
    expect(DEFAULT_ORG_ROLES_BY_NAME.get('super_admin')).toEqual({
      name: 'super_admin',
      displayName: 'Super Admin',
      description:
        'Full control of the organization, including billing and deletion.',
      permissions: PY_ALL_SORTED,
    })
  })

  it('seeds admin with the catalog minus billing and org deletion', () => {
    expect(DEFAULT_ORG_ROLES_BY_NAME.get('admin')).toEqual({
      name: 'admin',
      displayName: 'Admin',
      description:
        'Manages members, roles, apps, and organization details. No billing access.',
      permissions: PY_ADMIN,
    })
  })

  it.each(['billing:read', 'billing:manage', 'org:delete'])(
    'withholds %s from admin',
    (permission) => {
      expect(DEFAULT_ORG_ROLES_BY_NAME.get('admin')?.permissions).not.toContain(
        permission
      )
    }
  )

  it('seeds staff in declaration order', () => {
    expect(DEFAULT_ORG_ROLES_BY_NAME.get('staff')).toEqual({
      name: 'staff',
      displayName: 'Staff',
      description: 'Default role. Views the organization directory.',
      permissions: PY_STAFF,
    })
  })

  it('grants every default role only catalog permissions', () => {
    for (const role of DEFAULT_ORG_ROLES) {
      for (const permission of role.permissions) {
        expect(isValidOrgPermission(permission)).toBe(true)
      }
    }
  })

  it('names staff as the default and super admin as the creator role', () => {
    expect(DEFAULT_MEMBER_ROLE_NAME).toBe('staff')
    expect(SUPER_ADMIN_ROLE_NAME).toBe('super_admin')
    expect(DEFAULT_ORG_ROLES_BY_NAME.has(DEFAULT_MEMBER_ROLE_NAME)).toBe(true)
    expect(DEFAULT_ORG_ROLES_BY_NAME.has(SUPER_ADMIN_ROLE_NAME)).toBe(true)
  })
})

describe('defaultPermissionsForRoleName', () => {
  it.each([
    ['super_admin', PY_ALL_SORTED],
    ['admin', PY_ADMIN],
    ['staff', PY_STAFF],
  ])('resolves %s to its seeded permissions', (roleName, expected) => {
    expect(defaultPermissionsForRoleName(roleName as string)).toEqual(expected)
  })

  it.each([
    ['an unknown role', 'superuser'],
    ['the empty string', ''],
    ['a differently cased known role', 'Super_Admin'],
  ])('falls back to the staff permissions for %s', (_label, roleName) => {
    // An unrecognised name must never widen access — it resolves to the least
    // privileged role, never to super admin.
    expect(defaultPermissionsForRoleName(roleName)).toEqual(PY_STAFF)
  })

  it('returns a copy the caller cannot use to mutate the catalog', () => {
    const first = defaultPermissionsForRoleName('staff')
    first.push('org:delete')

    expect(defaultPermissionsForRoleName('staff')).toEqual(PY_STAFF)
  })
})
