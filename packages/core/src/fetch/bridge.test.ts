import { describe, expect, it, vi } from 'vitest'

import { fetchApiBridge } from './bridge'

function serverError(): Response {
  return new Response(JSON.stringify({ data: null, error: { code: 'boom' } }), {
    status: 500,
    headers: { 'content-type': 'application/json' },
  })
}

function ok(): Response {
  return new Response(JSON.stringify({ data: {}, error: null }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('fetchApiBridge retry policy', () => {
  describe('non-idempotent requests', () => {
    it('does not replay a POST that failed with a transient 500', async () => {
      const fetchImpl = vi.fn(async () => serverError())

      const response = await fetchApiBridge('/auth/callback', {
        method: 'POST',
        body: JSON.stringify({ code: 'single-use-code' }),
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(500)
    })

    it.each(['PUT', 'PATCH', 'DELETE'])(
      'does not replay a %s that failed with a transient 500',
      async (method) => {
        const fetchImpl = vi.fn(async () => serverError())

        await fetchApiBridge('/resource', {
          method,
          fetch: fetchImpl,
          baseUrl: 'https://api.test',
        })

        expect(fetchImpl).toHaveBeenCalledTimes(1)
      }
    )

    it('surfaces the upstream 500 body rather than a synthesized network error', async () => {
      const fetchImpl = vi.fn(async () => serverError())

      const response = await fetchApiBridge('/auth/callback', {
        method: 'POST',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
      })

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        data: null,
        error: { code: 'boom' },
      })
    })

    it('still retries a POST when the caller explicitly opts in', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(serverError())
        .mockResolvedValueOnce(ok())

      const response = await fetchApiBridge('/idempotent-post', {
        method: 'POST',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: { attempts: 2, delayMs: 0, maxDelayMs: 0 },
      })

      expect(fetchImpl).toHaveBeenCalledTimes(2)
      expect(response.status).toBe(200)
    })

    it('does not replay a POST that rejected at the network layer', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('connection reset')
      })

      const response = await fetchApiBridge('/auth/callback', {
        method: 'POST',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(503)
    })
  })

  describe('idempotent requests', () => {
    it('retries a transient 500 on GET until it succeeds', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(serverError())
        .mockResolvedValueOnce(ok())

      const response = await fetchApiBridge('/health', {
        method: 'GET',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: { delayMs: 0, maxDelayMs: 0 },
      })

      expect(fetchImpl).toHaveBeenCalledTimes(2)
      expect(response.status).toBe(200)
    })

    it('retries when no method is given, because fetch defaults to GET', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(serverError())
        .mockResolvedValueOnce(ok())

      await fetchApiBridge('/health', {
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: { delayMs: 0, maxDelayMs: 0 },
      })

      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('treats a lowercase method name as idempotent', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(serverError())
        .mockResolvedValueOnce(ok())

      await fetchApiBridge('/health', {
        method: 'get',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: { delayMs: 0, maxDelayMs: 0 },
      })

      expect(fetchImpl).toHaveBeenCalledTimes(2)
    })

    it('honours retry: false on an idempotent request', async () => {
      const fetchImpl = vi.fn(async () => serverError())

      await fetchApiBridge('/health', {
        method: 'GET',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: false,
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
    })

    it('does not retry a 401, which is not a transient status', async () => {
      const fetchImpl = vi.fn(async () => new Response('{}', { status: 401 }))

      const response = await fetchApiBridge('/health', {
        method: 'GET',
        fetch: fetchImpl,
        baseUrl: 'https://api.test',
        retry: { delayMs: 0, maxDelayMs: 0 },
      })

      expect(fetchImpl).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(401)
    })
  })
})
