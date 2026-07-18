import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { request } from './request'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('request', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns response data and sends the default JSON content type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { id: 'user_123' }, error: null })
    )

    const result = await request<{ id: string }>('/api/users')

    expect(result).toEqual({ data: { id: 'user_123' }, error: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/users')
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      'content-type': 'application/json',
    })
  })

  it('preserves request options and merges custom headers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { saved: true }, error: null })
    )

    const result = await request<{ saved: boolean }>('/api/users', {
      method: 'POST',
      body: '{"name":"Alejandra"}',
      headers: { 'x-request-id': 'req_123' },
    })

    expect(result).toEqual({ data: { saved: true }, error: null })
    expect(fetch).toHaveBeenCalledTimes(1)
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"name":"Alejandra"}')
    expect(Object.fromEntries(new Headers(init?.headers))).toEqual({
      'content-type': 'application/json',
      'x-request-id': 'req_123',
    })
  })

  it('preserves an explicit caller content type', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ data: { imported: true }, error: null })
    )

    const result = await request<{ imported: boolean }>('/api/upload', {
      headers: new Headers({ 'content-type': 'text/plain' }),
    })

    expect(result).toEqual({ data: { imported: true }, error: null })
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(new Headers(init?.headers).get('content-type')).toBe('text/plain')
  })

  it('rejects a missing data property', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: null }))

    const result = await request('/api/users')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'client/invalid-response',
        message: 'The server returned an invalid response. Please try again.',
      },
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('returns an API error object for a non-success response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        {
          data: null,
          error: {
            code: 'user/not-found',
            message: 'The user was not found.',
          },
        },
        404
      )
    )

    const result = await request('/api/users/missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'user/not-found', message: 'The user was not found.' },
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rejects an API error without a code', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { data: null, error: { message: 'Permission denied.' } },
        403
      )
    )

    const result = await request('/api/users')

    expect(result.error?.code).toBe('client/invalid-response')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([{ error: null }, { error: {} }, { error: { message: '' } }])(
    'uses the fallback for malformed API error %#',
    async (payload) => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(payload, 500))

      const result = await request('/api/users')

      expect(result.error?.code).toBe('client/invalid-response')
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  )

  it('uses the fallback when a successful response has invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('not json', { status: 200 })
    )

    const result = await request('/api/users')

    expect(result.error?.code).toBe('client/invalid-response')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it.each([new Error('socket closed'), { reason: 'timeout' }, null])(
    'returns a client-safe network error when fetch rejects with %j',
    async (error) => {
      vi.mocked(fetch).mockRejectedValue(error)

      const result = await request('/api/users')

      expect(result.error?.code).toBe('network/offline')
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  )
})
