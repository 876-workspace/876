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
})
