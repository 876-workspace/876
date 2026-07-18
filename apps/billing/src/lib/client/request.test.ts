import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from './request'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('Billing browser request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns response data and sends the default JSON content type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { id: 'item_123' }, error: null })
    )

    const result = await request<{ id: string }>('/api/v1/items')

    expect(result).toEqual({ data: { id: 'item_123' }, error: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/v1/items')
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      'content-type': 'application/json',
    })
  })

  it('preserves request options and merges custom headers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { saved: true }, error: null })
    )

    const result = await request<{ saved: boolean }>('/api/v1/items', {
      method: 'POST',
      body: '{"name":"Implementation"}',
      headers: { 'x-request-id': 'req_123' },
    })

    expect(result).toEqual({ data: { saved: true }, error: null })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"name":"Implementation"}')
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    })
  })

  it('preserves an explicit content type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: null, error: null })
    )

    const result = await request<null>('/api/v1/import', {
      headers: [['content-type', 'text/csv']],
    })

    expect(result).toEqual({ data: null, error: null })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(new Headers(init?.headers).get('content-type')).toBe('text/csv')
  })

  it('rejects a success response missing canonical envelope keys', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: null }))

    const result = await request('/api/v1/items')

    expect(result.error?.code).toBe('client/invalid-response')
  })

  it('rejects non-canonical envelope fields', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { id: 'item_123' }, error: null, status: 200 })
    )

    const result = await request('/api/v1/items')

    expect(result.error?.code).toBe('client/invalid-response')
  })

  it('returns a canonical API error object', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: { code: 'item/not-found', message: 'Item not found.' },
        },
        404
      )
    )

    const result = await request('/api/v1/items/missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'item/not-found', message: 'Item not found.' },
    })
  })

  it('rejects an API error without a code', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { data: null, error: { message: 'Permission denied.' } },
        403
      )
    )

    const result = await request('/api/v1/items')

    expect(result.error?.code).toBe('client/invalid-response')
  })

  it.each([
    { data: null, error: null },
    { data: null, error: {} },
    { data: null, error: { message: '' } },
  ])('uses a fallback for malformed error payload %#', async (payload) => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(payload, 500))

    const result = await request('/api/v1/items')

    expect(result.error?.code).toBe('client/invalid-response')
  })

  it('uses a fallback when a successful response has invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', { status: 200 })
    )

    const result = await request('/api/v1/items')

    expect(result.error?.code).toBe('client/invalid-response')
  })

  it.each([new Error('socket closed'), { reason: 'timeout' }, null])(
    'returns a client-safe network error for rejection %j',
    async (error) => {
      vi.mocked(fetch).mockRejectedValue(error)

      const result = await request('/api/v1/items')

      expect(result.error?.code).toBe('network/offline')
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  )
})
