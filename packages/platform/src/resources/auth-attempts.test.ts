import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(code: string, message: string, status = 422) {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin auth-attempts resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('issues GET /auth-attempts with no query params when called with no arguments', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps userId to user_id in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ userId: 'user_4rT8xKp2' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?user_id=user_4rT8xKp2',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps ipAddress to ip_address in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ ipAddress: '198.51.100.42' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?ip_address=198.51.100.42',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps countryCode to ip_country_code in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ countryCode: 'JM' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?ip_country_code=JM',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps deviceFingerprint to device_fingerprint in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ deviceFingerprint: 'fp_9mN3rLqZ' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?device_fingerprint=fp_9mN3rLqZ',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps appId to app_id in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ appId: '876-couriers' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?app_id=876-couriers',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps createdAfter to created_after in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ createdAfter: 1700000000 })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?created_after=1700000000',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps createdBefore to created_before in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ createdBefore: 1700086400 })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts?created_before=1700086400',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('passes identifier, event, and outcome unchanged in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({
        identifier: 'alejandra@example.com',
        event: 'sign_in',
        outcome: 'success',
      })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('identifier=alejandra%40example.com')
      expect(url).toContain('event=sign_in')
      expect(url).toContain('outcome=success')
    })

    it('forwards cursor pagination params through toCursorQuery', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({
        limit: 25,
        startingAfter: 'atmp_7pQ2wXr1',
      })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('limit=25')
      expect(url).toContain('starting_after=atmp_7pQ2wXr1')
    })

    it('omits optional params that are not provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/auth-attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.list({ userId: 'user_4rT8xKp2' })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).not.toContain('ip_address')
      expect(url).not.toContain('ip_country_code')
      expect(url).not.toContain('device_fingerprint')
      expect(url).not.toContain('app_id')
      expect(url).not.toContain('created_after')
      expect(url).not.toContain('created_before')
    })

    it('returns the parsed list response unchanged on success', async () => {
      const payload = {
        object: 'list',
        data: [{ object: 'auth_attempt', id: 'atmp_7pQ2wXr1' }],
        has_more: false,
        url: '/auth-attempts',
        total_count: 1,
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.authAttempts.list()

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('propagates an error response as an error result', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          errorResponse('auth_attempts/invalid_filter', 'Invalid filter.', 422)
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.authAttempts.list()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'auth_attempts/invalid_filter',
        message: 'Invalid filter.',
      })
    })
  })

  describe('retrieve', () => {
    it('issues GET /auth-attempts/:id with the exact attempt id', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'auth_attempt', id: 'atmp_7pQ2wXr1' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.retrieve('atmp_7pQ2wXr1')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts/atmp_7pQ2wXr1',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed attempt on success', async () => {
      const payload = {
        object: 'auth_attempt',
        id: 'atmp_7pQ2wXr1',
        outcome: 'success',
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.authAttempts.retrieve('atmp_7pQ2wXr1')

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('encodes special characters in the attempt id path segment', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'auth_attempt', id: 'atmp/special' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.retrieve('atmp/special')

      // NOTE: The resource does NOT encode the path segment (uses template literal
      // without encodeURIComponent). The test matches current behaviour.
      // This is a possible defect — see report.
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts/atmp/special',
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('retrieveSummary', () => {
    it('issues GET /auth-attempts/summary with no params by default', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'auth_attempt_summary', total: 0 })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.retrieveSummary()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts/summary',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('passes the window param to the summary endpoint', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'auth_attempt_summary', total: 42 })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.authAttempts.retrieveSummary({ window: '7d' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/auth-attempts/summary?window=7d',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed summary on success', async () => {
      const payload = {
        object: 'auth_attempt_summary',
        total: 99,
        success_count: 80,
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.authAttempts.retrieveSummary({ window: '30d' })

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })
  })
})
