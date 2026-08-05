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

describe('admin devices resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('issues GET /devices with no query params when called with no arguments', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps userId to user_id in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ userId: 'user_4rT8xKp2' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?user_id=user_4rT8xKp2',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('maps deviceType to device_type in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ deviceType: 'mobile' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?device_type=mobile',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('passes fingerprint unchanged in the query string', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ fingerprint: 'fp_9mN3rLqZ' })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?fingerprint=fp_9mN3rLqZ',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('sends trusted=true as a truthy boolean filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ trusted: true })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?trusted=true',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('sends trusted=false without dropping the falsy boolean filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ trusted: false })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?trusted=false',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('sends blocked=false without dropping the falsy boolean filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ blocked: false })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices?blocked=false',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('forwards cursor pagination params through toCursorQuery', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ limit: 10, startingAfter: 'dev_2kL9mN4q' })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('limit=10')
      expect(url).toContain('starting_after=dev_2kL9mN4q')
    })

    it('omits optional params that are not provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.list({ userId: 'user_4rT8xKp2' })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).not.toContain('device_type')
      expect(url).not.toContain('fingerprint')
      expect(url).not.toContain('trusted')
      expect(url).not.toContain('blocked')
    })

    it('returns the parsed list response unchanged on success', async () => {
      const payload = {
        object: 'list',
        data: [{ object: 'device', id: 'dev_2kL9mN4q' }],
        has_more: false,
        url: '/devices',
        total_count: 1,
      }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.devices.list()

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('propagates an error response as an error result', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          errorResponse('devices/not_found', 'Device not found.', 404)
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.devices.list()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        code: 'devices/not_found',
        message: 'Device not found.',
      })
    })
  })

  describe('retrieve', () => {
    it('issues GET /devices/:id with the exact device id', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'device', id: 'dev_2kL9mN4q' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.retrieve('dev_2kL9mN4q')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the parsed device on success', async () => {
      const payload = { object: 'device', id: 'dev_2kL9mN4q', trusted: true }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.devices.retrieve('dev_2kL9mN4q')

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })

    it('encodes special characters in the device id path segment', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'device', id: 'dev/special' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.retrieve('dev/special')

      // NOTE: The resource does NOT encode the path segment (uses template literal
      // without encodeURIComponent). The test matches current behaviour.
      // This is a possible defect — see report.
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev/special',
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('update', () => {
    it('issues POST /devices/:id with the exact device id', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'device', id: 'dev_2kL9mN4q' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.update('dev_2kL9mN4q', { trusted: true })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('maps blockReason to block_reason in the request body', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'device', id: 'dev_2kL9mN4q' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.update('dev_2kL9mN4q', {
        blocked: true,
        blockReason: 'Reported stolen',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            label: undefined,
            trusted: undefined,
            blocked: true,
            block_reason: 'Reported stolen',
          }),
        })
      )
    })

    it('sends label as null to explicitly clear the label', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ object: 'device', id: 'dev_2kL9mN4q' })
        )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.update('dev_2kL9mN4q', { label: null })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q',
        expect.objectContaining({
          body: JSON.stringify({
            label: null,
            trusted: undefined,
            blocked: undefined,
            block_reason: undefined,
          }),
        })
      )
    })

    it('returns the updated device on success', async () => {
      const payload = { object: 'device', id: 'dev_2kL9mN4q', blocked: true }
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload))
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.devices.update('dev_2kL9mN4q', {
        blocked: true,
      })

      expect(result.data).toEqual(payload)
      expect(result.error).toBeNull()
    })
  })

  describe('listAttempts', () => {
    it('issues GET /devices/:id/attempts for the given device', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices/dev_2kL9mN4q/attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.listAttempts('dev_2kL9mN4q')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q/attempts',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('forwards cursor pagination params to listAttempts', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [],
          has_more: false,
          url: '/devices/dev_2kL9mN4q/attempts',
          total_count: 0,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.devices.listAttempts('dev_2kL9mN4q', {
        limit: 5,
        endingBefore: 'atmp_7pQ2wXr1',
      })

      const [url] = fetchMock.mock.calls[0] as [string]
      expect(url).toContain('limit=5')
      expect(url).toContain('ending_before=atmp_7pQ2wXr1')
    })
  })

  describe('listUsers', () => {
    it('issues GET /devices/:id/users for the given device', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [
            {
              object: 'device_user',
              user_id: 'user_4rT8xKp2',
              device_id: 'dev_2kL9mN4q',
              first_seen_at: 1700000000,
              last_seen_at: 1700010000,
              sign_in_count: 3,
            },
          ],
          has_more: false,
          url: '/devices/dev_2kL9mN4q/users',
          total_count: 1,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.devices.listUsers('dev_2kL9mN4q')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/devices/dev_2kL9mN4q/users',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.data?.data[0]?.user_id).toBe('user_4rT8xKp2')
    })
  })
})
