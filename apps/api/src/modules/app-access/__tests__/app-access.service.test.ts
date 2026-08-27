import { describe, expect, it } from 'vitest'

import { resolveEffectiveAppPermissions } from '../app-access.service'

const catalog = [
  { key: 'requests.view' },
  { key: 'requests.create' },
  { key: 'requests.edit' },
  { key: 'requests.delete' },
  { key: 'customers.view' },
  { key: 'customers.edit' },
]

const entitlement = { status: 'active' }
const assignment = {
  status: 'active',
  deletedAt: null,
  revokedAt: null,
  permissionGrants: [],
  permissionDenies: [],
}
const role = {
  id: 'rol_8a91b72d',
  appId: 'rap_crm876',
  organizationId: 'org_kingstonlabs',
  key: 'agent',
  name: 'Agent',
  description: 'Handles customer requests.',
  permissions: ['requests.view', 'requests.create', 'customers.view'],
  isSystem: true,
  isDefault: false,
  templateKey: 'agent',
  position: 20,
  deletedAt: null,
  deletedBy: null,
  deletionReason: null,
  createdAt: 1n,
  updatedAt: 1n,
}

function resolve(
  overrides: {
    entitlement?: unknown
    assignment?: unknown
    appRole?: unknown
    catalog?: unknown
  } = {}
) {
  // `in` rather than `??`: an explicit `null` override is the whole point of
  // these fail-closed cases, and `??` would silently restore the default.
  return resolveEffectiveAppPermissions({
    entitlement:
      'entitlement' in overrides ? overrides.entitlement : entitlement,
    assignment: 'assignment' in overrides ? overrides.assignment : assignment,
    appRole: 'appRole' in overrides ? overrides.appRole : role,
    catalog: 'catalog' in overrides ? overrides.catalog : catalog,
  })
}

describe('resolveEffectiveAppPermissions', () => {
  it('returns the sorted role permission subset for an active entitled assignment', () => {
    const result = resolve()

    expect(result).toEqual({
      entitled: true,
      assigned: true,
      role,
      permissions: ['customers.view', 'requests.create', 'requests.view'],
    })
  })

  it.each([
    ['missing entitlement', null],
    ['undefined entitlement', undefined],
    ['cancelled entitlement', { status: 'cancelled' }],
    ['past-due entitlement', { status: 'past_due' }],
    ['paused entitlement', { status: 'paused' }],
    ['malformed entitlement', 'active'],
  ])('fails closed for %s', (_label, value) => {
    const result = resolveEffectiveAppPermissions({
      entitlement: value,
      assignment,
      appRole: role,
      catalog,
    })

    expect(result).toEqual({
      entitled: false,
      assigned: false,
      role: null,
      permissions: [],
    })
  })

  it('accepts a trialing entitlement', () => {
    const result = resolve({ entitlement: { status: 'trialing' } })

    expect(result.entitled).toBe(true)
    expect(result.assigned).toBe(true)
    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it.each([
    ['missing assignment', null],
    ['pending assignment', { ...assignment, status: 'pending' }],
    ['revoked assignment status', { ...assignment, status: 'revoked' }],
    ['soft-deleted assignment', { ...assignment, deletedAt: 1n }],
    ['revoked timestamp', { ...assignment, revokedAt: 1n }],
    ['malformed assignment', 'active'],
  ])('returns no assignment permissions for %s', (_label, value) => {
    const result = resolve({ assignment: value })

    expect(result).toEqual({
      entitled: true,
      assigned: false,
      role: null,
      permissions: [],
    })
  })

  it('fails closed to no base permissions when the role is missing', () => {
    const result = resolve({ appRole: null })

    expect(result).toEqual({
      entitled: true,
      assigned: true,
      role: null,
      permissions: [],
    })
  })

  it('fails closed to no base permissions when the role is soft-deleted', () => {
    const result = resolve({ appRole: { ...role, deletedAt: 3n } })

    expect(result.entitled).toBe(true)
    expect(result.assigned).toBe(true)
    expect(result.role).toBeNull()
    expect(result.permissions).toEqual([])
  })

  it('adds explicit grants on top of role permissions', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: ['requests.edit', 'customers.edit'],
      },
    })

    expect(result.permissions).toEqual([
      'customers.edit',
      'customers.view',
      'requests.create',
      'requests.edit',
      'requests.view',
    ])
  })

  it('removes a role permission with an explicit denial', () => {
    const result = resolve({
      assignment: { ...assignment, permissionDenies: ['requests.create'] },
    })

    expect(result.permissions).toEqual(['customers.view', 'requests.view'])
  })

  it('lets a denial beat an explicit grant of the same permission', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: ['requests.edit'],
        permissionDenies: ['requests.edit'],
      },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('lets a denial beat both a role permission and a duplicate grant', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: ['requests.view'],
        permissionDenies: ['requests.view'],
      },
    })

    expect(result.permissions).toEqual(['customers.view', 'requests.create'])
  })

  it('silently drops a stale role permission that is absent from the catalog', () => {
    const result = resolve({
      appRole: { ...role, permissions: [...role.permissions, 'legacy.root'] },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('silently drops a stale grant that is absent from the catalog', () => {
    const result = resolve({
      assignment: { ...assignment, permissionGrants: ['legacy.export'] },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('deduplicates duplicate role permissions', () => {
    const result = resolve({
      appRole: {
        ...role,
        permissions: ['requests.view', 'requests.view', 'customers.view'],
      },
    })

    expect(result.permissions).toEqual(['customers.view', 'requests.view'])
  })

  it('deduplicates duplicate grants', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: ['requests.edit', 'requests.edit'],
      },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.edit',
      'requests.view',
    ])
  })

  it('returns permissions sorted lexicographically regardless of storage order', () => {
    const result = resolve({
      appRole: {
        ...role,
        permissions: ['requests.view', 'customers.edit', 'requests.delete'],
      },
    })

    expect(result.permissions).toEqual([
      'customers.edit',
      'requests.delete',
      'requests.view',
    ])
  })

  it('treats a string role permission field as malformed rather than iterating it', () => {
    const result = resolve({
      appRole: {
        ...role,
        permissions: 'requests.view',
      } as unknown as typeof role,
    })

    expect(result.permissions).toEqual([])
  })

  it('treats a null role permission field as malformed and empty', () => {
    const result = resolve({
      appRole: {
        ...role,
        permissions: null,
      } as unknown as typeof role,
    })

    expect(result.permissions).toEqual([])
  })

  it('ignores non-string values stored in role permissions', () => {
    const result = resolve({
      appRole: {
        ...role,
        permissions: ['requests.view', 42, null],
      } as unknown as typeof role,
    })

    expect(result.permissions).toEqual(['requests.view'])
  })

  it('treats a malformed grant field as empty', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: 'requests.edit',
      },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('ignores non-string values stored in grants', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionGrants: ['requests.edit', false, 88],
      },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.edit',
      'requests.view',
    ])
  })

  it('treats a malformed deny field as empty', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionDenies: { permission: 'requests.view' },
      },
    })

    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('ignores non-string values stored in denies', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        permissionDenies: [null, 'requests.create', 88],
      },
    })

    expect(result.permissions).toEqual(['customers.view', 'requests.view'])
  })

  it('returns no effective permissions for a missing catalog', () => {
    const result = resolve({ catalog: null })

    expect(result.permissions).toEqual([])
  })

  it('returns no effective permissions for a malformed catalog object', () => {
    const result = resolve({ catalog: { requests: ['view'] } })

    expect(result.permissions).toEqual([])
  })

  it('ignores malformed catalog rows but keeps valid keys', () => {
    const result = resolve({
      catalog: [null, 7, { label: 'View requests' }, { key: 'requests.view' }],
    })

    expect(result.permissions).toEqual(['requests.view'])
  })

  it('accepts a catalog represented directly as permission-key strings', () => {
    const result = resolve({ catalog: ['requests.view', 'customers.view'] })

    expect(result.permissions).toEqual(['customers.view', 'requests.view'])
  })

  it('does not merge organization permissions into app permissions', () => {
    const result = resolve({
      assignment: {
        ...assignment,
        organizationPermissions: ['apps:assign', 'roles:manage'],
      },
    })

    expect(result.permissions).not.toContain('apps:assign')
    expect(result.permissions).not.toContain('roles:manage')
    expect(result.permissions).toEqual([
      'customers.view',
      'requests.create',
      'requests.view',
    ])
  })

  it('does not let catalog membership itself grant a permission', () => {
    const result = resolve({
      appRole: { ...role, permissions: [] },
      catalog: [{ key: 'requests.delete' }],
    })

    expect(result.permissions).toEqual([])
  })

  it('allows a grant to supply a catalog permission when the live role has no permissions', () => {
    const result = resolve({
      appRole: { ...role, permissions: [] },
      assignment: { ...assignment, permissionGrants: ['requests.edit'] },
    })

    expect(result.permissions).toEqual(['requests.edit'])
  })

  it('allows a grant to supply a catalog permission when the role row is missing', () => {
    const result = resolve({
      appRole: null,
      assignment: { ...assignment, permissionGrants: ['requests.edit'] },
    })

    expect(result.role).toBeNull()
    expect(result.permissions).toEqual(['requests.edit'])
  })

  it('returns a fresh sorted array on each resolution', () => {
    const first = resolve()
    const second = resolve()

    expect(first.permissions).toEqual(second.permissions)
    expect(first.permissions).not.toBe(second.permissions)
  })

  it('does not mutate the stored role permission array while resolving', () => {
    const permissions = ['requests.view', 'customers.view']
    const storedRole = { ...role, permissions }

    resolve({
      appRole: storedRole,
      assignment: { ...assignment, permissionDenies: ['requests.view'] },
    })

    expect(permissions).toEqual(['requests.view', 'customers.view'])
  })

  it('does not mutate stored grants or denies while resolving', () => {
    const grants = ['requests.edit']
    const denies = ['requests.create']
    const storedAssignment = {
      ...assignment,
      permissionGrants: grants,
      permissionDenies: denies,
    }

    resolve({ assignment: storedAssignment })

    expect(grants).toEqual(['requests.edit'])
    expect(denies).toEqual(['requests.create'])
  })

  it('never throws for deeply malformed persisted inputs', () => {
    const act = () =>
      resolveEffectiveAppPermissions({
        entitlement: { status: 'active' },
        assignment: {
          status: 'active',
          deletedAt: null,
          revokedAt: null,
          permissionGrants: [Symbol('grant')],
        },
        appRole: { permissions: [Symbol('role')] },
        catalog: [{ key: Symbol('catalog') }],
      })

    expect(act).not.toThrow()
  })

  it('degrades deeply malformed persisted inputs to a safe empty permission set', () => {
    const result = resolveEffectiveAppPermissions({
      entitlement: { status: 'active' },
      assignment: {
        status: 'active',
        deletedAt: null,
        revokedAt: null,
        permissionGrants: [Symbol('grant')],
      },
      appRole: { permissions: [Symbol('role')] },
      catalog: [{ key: Symbol('catalog') }],
    })

    expect(result.permissions).toEqual([])
  })
})
