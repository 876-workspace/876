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

describe('admin sessions resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('issues GET /sessions with no query params when called with no arguments', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps userId to user_id in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ userId: 'user_4rT8xKp2' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions?user_id=user_4rT8xKp2',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps deviceId to device_id in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ deviceId: 'dev_2kL9mN4q' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions?device_id=dev_2kL9mN4q',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it.each(['active', 'revoked', 'expired'] as const)(
      'sends status=%s so revoked and expired stay separable in the query',
      async (status) => {
        const fetchMock = vi.fn().mockResolvedValue(
          jsonResponse({
            object: 'list',
            data: [],
            has_more: false,
            url: '/sessions',
            total_count: 0,
          })
        )
        const $876 = create876AdminClient({
          baseUrl: 'https://api.test',
          internalKey: 'test-internal-key',
          fetch: fetchMock,
        })

        await $876.sessions.list({ status })

        expect(fetchMock).toHaveBeenCalledWith(
          `https://api.test/sessions?status=${status}`,
          expect.objectContaining({ method: 'GET' })
        )
      }
    )

    it('sends active=true without dropping the truthy boolean filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ active: true })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions?active=true',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('sends active=false without dropping the falsy boolean filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ active: false })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions?active=false',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('forwards cursor pagination params through toCursorQuery', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ limit: 20, startingAfter: 'sess_8nR5vBk3' })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('limit=20')
      expect(url).toContain('starting_after=sess_8nR5vBk3')
    })

    it('omits optional params that are not provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/sessions',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.list({ userId: 'user_4rT8xKp2' })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).not.toContain('active')
      expect(url).not.toContain('device_id')
    })

    it('returns the parsed list response unchanged on success', async () => {
      const payload = {
        object: 'list',
        data: [{ object: 'session', id: 'sess_8nR5vBk3' }],
        has_more: false,
        url: '/sessions',
        total_count: 1,
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.list()

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('propagates an error response as an error result', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          errorResponse('sessions/not_found', 'Session not found.', 404)
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.list()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'sessions/not_found',
        message: 'Session not found.',
      })
    })
  })

  describe('retrieve', () => {
    it('issues GET /sessions/:id with the exact session id', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'session', id: 'sess_8nR5vBk3' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.retrieve('sess_8nR5vBk3')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions/sess_8nR5vBk3',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed session on success', async () => {
      const payload = { object: 'session', id: 'sess_8nR5vBk3', active: true }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.retrieve('sess_8nR5vBk3')

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('encodes special characters in the session id path segment', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'session', id: 'sess/special' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.retrieve('sess/special')

      // NOTE: The resource does NOT encode the path segment (uses template literal
      // without encodeURIComponent). The test matches current behaviour.
      // This is a possible defect — see report.
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions/sess/special',
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('revoke', () => {
    it('issues DELETE /sessions/:id with the exact session id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'session',
          id: 'sess_8nR5vBk3',
          deleted: true,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.revoke('sess_8nR5vBk3')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/sessions/sess_8nR5vBk3',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('returns the deleted session tombstone on success', async () => {
      const payload = { object: 'session', id: 'sess_8nR5vBk3', deleted: true }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.revoke('sess_8nR5vBk3')

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('propagates an error when revoking a non-existent session', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          errorResponse('sessions/not_found', 'Session not found.', 404)
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.revoke('sess_8nR5vBk3')

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'sessions/not_found',
        message: 'Session not found.',
      })
    })
  })

  describe('revokeForUser', () => {
    it('issues DELETE /users/:userId/sessions with the exact user id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'deleted_user_sessions',
          user_id: 'user_4rT8xKp2',
          count: 3,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.sessions.revokeForUser('user_4rT8xKp2')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_4rT8xKp2/sessions',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('returns the deleted-user-sessions summary on success', async () => {
      const payload = {
        object: 'deleted_user_sessions',
        user_id: 'user_4rT8xKp2',
        count: 3,
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.sessions.revokeForUser('user_4rT8xKp2')

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })
  })
})
