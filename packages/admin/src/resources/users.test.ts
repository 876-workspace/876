import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin users resource', () => {
  it('routes user feature mutations through the feature grant API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'user_feature',
        id: 'uf_test',
        user_id: 'user_test',
        feature_id: 'feat_test',
        slug: 'test-feature',
        status: 'disabled',
        note: null,
        synced_at: 1700000000,
        created_at: 1700000000,
        updated_at: 1700000000,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.users.updateFeature('user_test', 'feat_test', {
      enabled: false,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/features/users/user_test/features/feat_test',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      })
    )
  })
})
