import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin modules resource', () => {
  it('lists an application module catalog including archived modules', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { object: 'list', data: [], has_more: false, url: '/modules' },
        error: null,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.modules.list('rap_billing', { includeArchived: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/modules?appId=rap_billing&includeArchived=true',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('replaces plan modules without sending feature flag identifiers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { object: 'product', id: 'prd_test' },
        error: null,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.products.replaceModules('prd_test', {
      module_ids: ['mod_sales'],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/products/prd_test/modules',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ module_ids: ['mod_sales'] }),
      })
    )
  })
})
