import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin auth resource', () => {
  it('lists routing memberships for a user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'list',
        data: [],
        has_more: false,
        url: '/auth/routing/memberships',
        total_count: 0,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.auth.getRoutingMemberships({ userId: 'user_123' })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/routing/memberships'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('exposes user lifecycle methods directly through users', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'user',
        id: 'user_123',
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.users.create({
      email: 'yoda@example.com',
      first_name: 'Yoda',
      last_name: 'Jedi',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/users',
      expect.objectContaining({ method: 'POST' })
    )
    expect('create' in $876.users).toBe(true)
    expect('retrieve' in $876.users).toBe(true)
    expect('admin' in $876.auth).toBe(false)
    expect('orgs' in $876).toBe(false)
  })
})
