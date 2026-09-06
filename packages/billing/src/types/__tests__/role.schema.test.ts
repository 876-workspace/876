import { describe, expect, it } from 'vitest'

import {
  RoleCreatedSchema,
  RoleDeletedSchema,
  RoleListSchema,
  RoleSchema,
} from '../role.schema'

function role(overrides: Record<string, unknown> = {}) {
  return {
    object: 'billing_role',
    id: 'Role_2kL9mN4q',
    slug: 'accounts_payable',
    name: 'Accounts payable',
    description: 'Records supplier bills and payments.',
    permissions: ['billing:access', 'purchases:read', 'purchases:write'],
    isSystem: false,
    isDefault: false,
    memberCount: 3,
    createdAt: 1_764_000_000,
    updatedAt: 1_764_000_100,
    ...overrides,
  }
}

describe('RoleSchema', () => {
  it('accepts a serialized finance role', () => {
    expect(RoleSchema.parse(role())).toEqual(role())
  })

  it('rejects a role missing its object discriminator', () => {
    const { object: _object, ...rest } = role()
    expect(RoleSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a wrong object discriminator', () => {
    expect(RoleSchema.safeParse(role({ object: 'billing_member' })).success).toBe(
      false
    )
  })

  it('rejects an empty id', () => {
    expect(RoleSchema.safeParse(role({ id: '' })).success).toBe(false)
  })

  it('rejects a fractional memberCount', () => {
    expect(RoleSchema.safeParse(role({ memberCount: 1.5 })).success).toBe(false)
  })

  it('rejects an unknown field so a server change cannot pass unnoticed', () => {
    expect(RoleSchema.safeParse({ ...role(), tenantId: 't_1' }).success).toBe(
      false
    )
  })

  it('rejects a null description rather than coercing it', () => {
    expect(RoleSchema.safeParse(role({ description: null })).success).toBe(false)
  })
})

describe('RoleListSchema', () => {
  it('accepts a list envelope of roles', () => {
    const parsed = RoleListSchema.parse({
      object: 'list',
      data: [role()],
      has_more: false,
      total_count: 1,
      url: '/api/v1/roles',
    })
    expect(parsed.data).toHaveLength(1)
    expect(parsed.data[0]).toEqual(role())
  })

  it('rejects a list whose item is not a role', () => {
    expect(
      RoleListSchema.safeParse({
        object: 'list',
        data: [{ object: 'billing_member', id: 'Member_1' }],
        has_more: false,
        total_count: 1,
        url: '/api/v1/roles',
      }).success
    ).toBe(false)
  })
})

describe('RoleCreatedSchema and RoleDeletedSchema', () => {
  it('accepts the acknowledgement shape', () => {
    expect(
      RoleCreatedSchema.parse({ object: 'billing_role', id: 'Role_1' })
    ).toEqual({ object: 'billing_role', id: 'Role_1' })
  })

  it('accepts the tombstone shape', () => {
    expect(
      RoleDeletedSchema.parse({
        object: 'billing_role',
        id: 'Role_1',
        deleted: true,
      })
    ).toEqual({ object: 'billing_role', id: 'Role_1', deleted: true })
  })

  it('rejects a tombstone claiming deleted: false', () => {
    expect(
      RoleDeletedSchema.safeParse({
        object: 'billing_role',
        id: 'Role_1',
        deleted: false,
      }).success
    ).toBe(false)
  })
})
