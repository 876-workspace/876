import { describe, expect, it } from 'vitest'

import { serializeOrganizationMemberMe } from '../access.serializers'
import { organizationMemberMeSchema } from '../access.schemas'

/**
 * `/organizations/{org_id}/members/me` is every product app's permission
 * bootstrap. The serialized row must satisfy the published contract exactly:
 * the SDK parses it with a strict schema, so one missing key is not a partial
 * response — it is a hard `auth/invalid-response` with no detail, which reads
 * to an operator as "member access could not be verified".
 */
function membershipRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem_2kL9mN4q',
    organizationId: 'org_2kL9mN4q',
    userId: 'user_2kL9mN4q',
    role: 'super-admin',
    roleId: null,
    position: 'Managing Director',
    status: 'active',
    createdAt: 1_788_825_600n,
    user: {
      firstName: 'Raheem',
      lastName: 'McDonald',
      email: 'raheem@efesto.example',
      avatar: null,
    },
    ...overrides,
  }
}

describe('serializeOrganizationMemberMe', () => {
  it('satisfies the published members/me contract', () => {
    const parsed = organizationMemberMeSchema.safeParse(
      serializeOrganizationMemberMe(membershipRow(), ['members:read'])
    )
    expect(parsed.success).toBe(true)
  })

  it('emits position as a key, not as undefined', () => {
    const serialized = serializeOrganizationMemberMe(membershipRow(), [])
    expect(Object.keys(serialized)).toContain('position')
    expect(serialized.position).toBe('Managing Director')
  })

  it('survives a JSON round trip with every required key intact', () => {
    // The regression: `position: undefined` type-checked, then JSON.stringify
    // dropped the key and the SDK's strict schema rejected the whole response.
    const roundTripped = JSON.parse(
      JSON.stringify(serializeOrganizationMemberMe(membershipRow(), ['a.view']))
    )
    for (const key of [
      'object',
      'id',
      'user_id',
      'role',
      'role_id',
      'position',
      'status',
      'first_name',
      'last_name',
      'email',
      'avatar',
      'created_at',
      'permissions',
    ])
      expect(roundTripped).toHaveProperty(key)
    expect(organizationMemberMeSchema.safeParse(roundTripped).success).toBe(true)
  })

  it('keeps a null position as null rather than dropping it', () => {
    const roundTripped = JSON.parse(
      JSON.stringify(
        serializeOrganizationMemberMe(membershipRow({ position: null }), [])
      )
    )
    expect(roundTripped).toHaveProperty('position')
    expect(roundTripped.position).toBeNull()
  })

  it('sorts permissions and leaves the caller array untouched', () => {
    const permissions = ['members:read', 'apps:assign']
    const serialized = serializeOrganizationMemberMe(
      membershipRow(),
      permissions
    )
    expect(serialized.permissions).toEqual(['apps:assign', 'members:read'])
    expect(permissions).toEqual(['members:read', 'apps:assign'])
  })

  it('nulls identity fields when the membership carries no user', () => {
    const serialized = serializeOrganizationMemberMe(
      membershipRow({ user: null }),
      []
    )
    expect(serialized.first_name).toBeNull()
    expect(serialized.email).toBeNull()
    expect(organizationMemberMeSchema.safeParse(serialized).success).toBe(true)
  })
})
