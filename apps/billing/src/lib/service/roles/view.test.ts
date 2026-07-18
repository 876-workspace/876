import { describe, expect, it } from 'vitest'

import { defaultAccess, memberAccess, roleView } from './view'

function createRole(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role_123',
    tenantId: 'ten_123',
    slug: 'accountant',
    name: 'Accountant',
    description: 'Manages financial records.',
    permissions: ['billing:access', 'customers:read', 'invalid:permission'],
    isSystem: true,
    isDefault: false,
    createdAt: 1_783_771_200,
    updatedAt: 1_783_771_300,
    ...overrides,
  }
}

describe('roleView', () => {
  it('serializes a role while filtering unknown persisted permissions', () => {
    const result = roleView({
      ...createRole(),
      _count: { members: 4 },
    } as never)

    expect(result).toEqual({
      object: 'billing_role',
      id: 'role_123',
      slug: 'accountant',
      name: 'Accountant',
      description: 'Manages financial records.',
      permissions: ['billing:access', 'customers:read'],
      isSystem: true,
      isDefault: false,
      memberCount: 4,
      createdAt: 1_783_771_200,
      updatedAt: 1_783_771_300,
    })
  })
})

describe('member access', () => {
  it('serializes persisted member status and role details', () => {
    const result = memberAccess({
      id: 'mem_123',
      tenantId: 'ten_123',
      userId: 'user_123',
      roleId: 'role_123',
      status: 'SUSPENDED',
      createdAt: 1_783_771_200,
      updatedAt: 1_783_771_300,
      role: createRole(),
    } as never)

    expect(result).toEqual({
      userId: 'user_123',
      status: 'SUSPENDED',
      permissions: ['billing:access', 'customers:read'],
      role: {
        id: 'role_123',
        slug: 'accountant',
        name: 'Accountant',
        description: 'Manages financial records.',
        permissions: ['billing:access', 'customers:read'],
        isSystem: true,
        isDefault: false,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_300,
      },
    })
  })

  it('creates active default access for a platform owner', () => {
    const result = defaultAccess('user_owner', createRole() as never)

    expect(result).toEqual({
      userId: 'user_owner',
      status: 'ACTIVE',
      permissions: ['billing:access', 'customers:read'],
      role: {
        id: 'role_123',
        slug: 'accountant',
        name: 'Accountant',
        description: 'Manages financial records.',
        permissions: ['billing:access', 'customers:read'],
        isSystem: true,
        isDefault: false,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_300,
      },
    })
  })
})
