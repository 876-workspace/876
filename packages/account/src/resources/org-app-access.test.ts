import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client.ts'

const rolePayload = {
  object: 'app_role',
  id: 'role_2kL9mN4q',
  app_id: 'app_876-crm',
  organization_id: 'org_4XmK9wQr',
  key: 'staff',
  name: 'Staff',
  description: 'Day-to-day access.',
  permissions: ['requests.view', 'requests.create'],
  is_system: true,
  is_default: true,
  template_key: 'staff',
  position: 2,
  members_count: 4,
  created_at: 1717200000,
  updated_at: 1717200000,
} as const

const membershipPayload = {
  object: 'app_membership',
  id: 'aa_7Qw2',
  organization_id: 'org_4XmK9wQr',
  user_id: 'user_2kL9mN4q',
  membership_id: 'mem_8Zx1',
  app_id: 'app_876-crm',
  app_slug: '876-crm',
  app_name: '876 CRM',
  status: 'active',
  assigned: true,
  entitled: true,
  app_role: rolePayload,
  permission_grants: ['reports.view'],
  permission_denies: ['customers.delete'],
  effective_permissions: ['requests.view', 'requests.create', 'reports.view'],
  title: 'Support lead',
  attributes: null,
  assigned_by: 'user_admin',
  assigned_at: 1717200000,
  last_access_at: null,
  revoked_at: null,
  created_at: 1717200000,
  updated_at: 1717200000,
} as const

function listOf(item: unknown, url: string) {
  return { object: 'list', data: [item], has_more: false, url, total_count: 1 }
}

function jsonFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) })
}

function client(fetchMock: ReturnType<typeof jsonFetch>) {
  return create876Client({ baseUrl: '/api', fetch: fetchMock })
}

describe('$876.orgAppRoles', () => {
  it('lists the app roles assignable in one organization', async () => {
    const payload = listOf(rolePayload, '/organizations/org_4XmK9wQr/apps/app_876-crm/roles')
    const fetchMock = jsonFetch({ data: payload, error: null })

    const result = await client(fetchMock).orgAppRoles.list(
      'org_4XmK9wQr',
      'app_876-crm'
    )

    expect(result).toEqual({ data: payload, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/apps/app_876-crm/roles',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('encodes identifiers so a crafted id cannot escape its path segment', async () => {
    const fetchMock = jsonFetch({
      data: listOf(rolePayload, '/x'),
      error: null,
    })

    await client(fetchMock).orgAppRoles.list('org/../../admin', 'app id')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org%2F..%2F..%2Fadmin/apps/app%20id/roles',
      expect.any(Object)
    )
  })

  it('propagates a server error without throwing', async () => {
    const error = { code: 'app/not-found', message: 'App not found.' }
    const fetchMock = jsonFetch({ data: null, error })

    const result = await client(fetchMock).orgAppRoles.list('org_1', 'app_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('app/not-found')
  })
})

describe('$876.orgAppMemberships reads', () => {
  it('lists organization app memberships with no query string when unfiltered', async () => {
    const fetchMock = jsonFetch({
      data: listOf(membershipPayload, '/x'),
      error: null,
    })

    await client(fetchMock).orgAppMemberships.list('org_4XmK9wQr')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/app-memberships',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('sends user, app, and revoked filters as query params', async () => {
    const fetchMock = jsonFetch({
      data: listOf(membershipPayload, '/x'),
      error: null,
    })

    await client(fetchMock).orgAppMemberships.list('org_4XmK9wQr', {
      userId: 'user_2kL9mN4q',
      appId: 'app_876-crm',
      includeRevoked: true,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/app-memberships?user_id=user_2kL9mN4q&app_id=app_876-crm&include_revoked=true',
      expect.any(Object)
    )
  })

  it('omits include_revoked when it is false', async () => {
    const fetchMock = jsonFetch({
      data: listOf(membershipPayload, '/x'),
      error: null,
    })

    await client(fetchMock).orgAppMemberships.list('org_1', {
      includeRevoked: false,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_1/app-memberships',
      expect.any(Object)
    )
  })

  it('returns one profile per entitled app for a member', async () => {
    const payload = listOf(membershipPayload, '/x')
    const fetchMock = jsonFetch({ data: payload, error: null })

    const result = await client(fetchMock).orgAppMemberships.listForMember(
      'org_4XmK9wQr',
      'mem_8Zx1'
    )

    expect(result).toEqual({ data: payload, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/members/mem_8Zx1/app-memberships',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns the roster for one app', async () => {
    const fetchMock = jsonFetch({
      data: listOf(membershipPayload, '/x'),
      error: null,
    })

    await client(fetchMock).orgAppMemberships.listForApp(
      'org_4XmK9wQr',
      'app_876-crm'
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/apps/app_876-crm/members',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('retrieves a single app membership', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.retrieve(
      'org_4XmK9wQr',
      'aa_7Qw2'
    )

    expect(result).toEqual({ data: membershipPayload, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/app-memberships/aa_7Qw2',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('rejects a response whose shape does not match the contract', async () => {
    const fetchMock = jsonFetch({
      data: { object: 'app_membership', id: 'aa_7Qw2' },
      error: null,
    })

    const result = await client(fetchMock).orgAppMemberships.retrieve(
      'org_1',
      'aa_1'
    )

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })
})

describe('$876.orgAppMemberships writes', () => {
  it('creates an assignment from a membership id and app id', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.create(
      'org_4XmK9wQr',
      { membership_id: 'mem_8Zx1', app_id: 'app_876-crm', app_role_id: 'role_2kL9mN4q' }
    )

    expect(result).toEqual({ data: membershipPayload, error: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/app-memberships',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          membership_id: 'mem_8Zx1',
          app_id: 'app_876-crm',
          app_role_id: 'role_2kL9mN4q',
        }),
      })
    )
  })

  it('accepts a user id and app slug instead, matching the API contract', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    await client(fetchMock).orgAppMemberships.create('org_1', {
      user_id: 'user_2kL9mN4q',
      app_slug: '876-crm',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_1/app-memberships',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('rejects an unknown create field without calling the network', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.create(
      'org_1',
      { membership_id: 'mem_1', role: 'admin' } as unknown as {
        membership_id: string
      }
    )

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an empty membership id without calling the network', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.create('org_1', {
      membership_id: '',
      app_id: 'app_1',
    })

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('updates a role and both override arrays', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    await client(fetchMock).orgAppMemberships.update('org_1', 'aa_7Qw2', {
      app_role_id: 'role_admin',
      permission_grants: ['reports.view'],
      permission_denies: ['customers.delete'],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_1/app-memberships/aa_7Qw2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          app_role_id: 'role_admin',
          permission_grants: ['reports.view'],
          permission_denies: ['customers.delete'],
        }),
      })
    )
  })

  it('allows clearing the role by sending an explicit null', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.update(
      'org_1',
      'aa_7Qw2',
      { app_role_id: null }
    )

    expect(result.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_1/app-memberships/aa_7Qw2',
      expect.objectContaining({ body: JSON.stringify({ app_role_id: null }) })
    )
  })

  it('rejects an unknown update field without calling the network', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })

    const result = await client(fetchMock).orgAppMemberships.update(
      'org_1',
      'aa_1',
      { permissions: ['x'] } as unknown as { status: string }
    )

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('revokes an assignment and returns the tombstone', async () => {
    const tombstone = { object: 'app_membership', id: 'aa_7Qw2', deleted: true }
    const fetchMock = jsonFetch({ data: tombstone, error: null })

    const result = await client(fetchMock).orgAppMemberships.delete(
      'org_1',
      'aa_7Qw2'
    )

    expect(result).toEqual({ data: tombstone, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_1/app-memberships/aa_7Qw2',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('propagates an authorization failure from a write as a value', async () => {
    const error = { code: 'auth/forbidden', message: 'Requires apps:assign.' }
    const fetchMock = jsonFetch({ data: null, error })

    const result = await client(fetchMock).orgAppMemberships.update(
      'org_1',
      'aa_1',
      { app_role_id: 'role_admin' }
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('auth/forbidden')
  })
})

describe('Account root separation', () => {
  it('keeps $876.appMemberships self-scoped and separate from the org surface', async () => {
    const fetchMock = jsonFetch({ data: membershipPayload, error: null })
    const $876 = client(fetchMock)

    await $876.appMemberships.me.retrieve({
      organizationId: 'org_4XmK9wQr',
      appId: 'app_876-crm',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/organizations/org_4XmK9wQr/apps/app_876-crm/members/me',
      expect.any(Object)
    )
    expect($876.orgAppMemberships).not.toBe($876.appMemberships)
  })
})
