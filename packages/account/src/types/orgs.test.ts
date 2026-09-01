import { describe, expect, it } from 'vitest'

import { sdk876OrgMemberListSchema, sdk876OrgMemberSchema } from './orgs'

/**
 * The exact payload `GET /organizations/{org_id}/members` returns, captured
 * from a running API rather than transcribed from the serializer.
 *
 * `sdk876OrgMemberSchema` is a `strictObject`, so a field the API adds is not
 * a backwards-compatible change to this client — it is a hard parse failure
 * that surfaces as `auth/invalid-response` and silently empties the member
 * directory for every caller. `position` did exactly that.
 */
const apiMember = {
  object: 'organization_member',
  id: 'mem_59a9a00efb334bbf93d32f6be97c21ae',
  user_id: 'user_695d45c54a374ff0a570003e15668891',
  role: 'super_admin',
  role_id: 'rol_80b29727b7584df0b538f7a16501ba8f',
  position: null,
  status: 'active',
  first_name: 'Alejandra',
  last_name: 'Reyes',
  email: 'alejandra@example.com',
  avatar: null,
  created_at: 1787897062,
}

describe('sdk876OrgMemberSchema', () => {
  it('accepts the organization member payload the API serializes', () => {
    expect(sdk876OrgMemberSchema.parse(apiMember)).toEqual(apiMember)
  })

  it('accepts a position when the membership carries a job title', () => {
    const result = sdk876OrgMemberSchema.safeParse({
      ...apiMember,
      position: 'Support Lead',
    })

    expect(result.success).toBe(true)
    expect(result.data?.position).toBe('Support Lead')
  })

  it('rejects the payload when a required identity field is missing', () => {
    const { position: _position, ...withoutPosition } = apiMember

    expect(sdk876OrgMemberSchema.safeParse(withoutPosition).success).toBe(false)
  })

  it('parses a member list envelope', () => {
    const result = sdk876OrgMemberListSchema.safeParse({
      object: 'list',
      data: [apiMember],
      has_more: false,
      url: '/organizations/org_1/members',
      total_count: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.data).toEqual([apiMember])
  })
})
