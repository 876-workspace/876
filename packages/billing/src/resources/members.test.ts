import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'

const BASE = 'https://billing.example.test'

function jsonFetch(body: unknown, init?: ResponseInit) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, init))
}

describe('members resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('patches the member grant and returns the acknowledgement', async () => {
    const fetchMock = jsonFetch({
      data: { object: 'billing_member', id: 'Member_1' },
      error: null,
    })
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    const result = await client.members.update('user_2kL9mN4q', {
      roleId: 'Role_1',
      status: 'ACTIVE',
    })

    expect(result).toEqual({
      data: { object: 'billing_member', id: 'Member_1' },
      error: null,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${BASE}/api/v1/members/user_2kL9mN4q`)
    expect(init).toMatchObject({ method: 'PATCH' })
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      roleId: 'Role_1',
      status: 'ACTIVE',
    })
  })

  it('omits status when the caller does not set it, leaving the default to the API', async () => {
    const fetchMock = jsonFetch({
      data: { object: 'billing_member', id: 'Member_1' },
      error: null,
    })
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    await client.members.update('user_1', { roleId: 'Role_1' })

    expect(
      JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))
    ).toEqual({ roleId: 'Role_1' })
  })

  it('encodes a user id that contains path characters', async () => {
    const fetchMock = jsonFetch({
      data: { object: 'billing_member', id: 'Member_1' },
      error: null,
    })
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    await client.members.update('user/one two', { roleId: 'Role_1' })

    expect(fetchMock.mock.calls[0]![0]).toBe(
      `${BASE}/api/v1/members/user%2Fone%20two`
    )
  })

  it('returns the self-lockout conflict as a value rather than throwing', async () => {
    const fetchMock = jsonFetch(
      {
        data: null,
        error: {
          code: 'billing_member/self-lockout',
          message: 'You cannot change your own Billing access.',
        },
      },
      { status: 409 }
    )
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    const result = await client.members.update('user_self', {
      roleId: 'Role_1',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('billing_member/self-lockout')
  })

  it('returns the invalid-role error when the role is not in this workspace', async () => {
    const fetchMock = jsonFetch(
      {
        data: null,
        error: {
          code: 'billing_member/invalid-role',
          message: 'Select a role from this workspace.',
        },
      },
      { status: 422 }
    )
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    const result = await client.members.update('user_1', {
      roleId: 'Role_other_tenant',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('billing_member/invalid-role')
  })

  it('rejects a response whose object discriminator is wrong', async () => {
    const fetchMock = jsonFetch({
      data: { object: 'billing_role', id: 'Role_1' },
      error: null,
    })
    const client = create876Client({ baseUrl: BASE, fetch: fetchMock })

    const result = await client.members.update('user_1', { roleId: 'Role_1' })

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
  })

  it('issues no request until update is called', () => {
    const fetchMock = jsonFetch({ data: null, error: null })
    create876Client({ baseUrl: BASE, fetch: fetchMock })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
