import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userDevice, authAttempt, apiKey } = vi.hoisted(() => ({
  userDevice: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  authAttempt: { findUnique: vi.fn(), findMany: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { userDevice, authAttempt, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function deviceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'dev_7fJ3',
    userId: 'user_2kL9',
    fingerprint: 'fp_9x',
    confidence: 'high',
    deviceType: 'desktop',
    deviceBrand: 'Apple',
    deviceModel: 'MacBook Pro',
    osName: 'macOS',
    osVersion: '15.0',
    browserName: 'Safari',
    browserVersion: '18.0',
    isBot: false,
    label: 'Work laptop',
    trusted: true,
    trustedAt: BigInt(NOW - 500),
    trustedBy: 'user_admin',
    blockedAt: null,
    blockedBy: null,
    blockReason: null,
    firstSeenAt: BigInt(NOW - 9000),
    lastSeenAt: BigInt(NOW),
    lastIp: '203.0.113.7',
    lastCountryCode: 'JM',
    signInCount: 12,
    createdAt: BigInt(NOW - 9000),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'device',
  id: 'dev_7fJ3',
  user_id: 'user_2kL9',
  fingerprint: 'fp_9x',
  confidence: 'high',
  device_type: 'desktop',
  device_brand: 'Apple',
  device_model: 'MacBook Pro',
  os_name: 'macOS',
  os_version: '15.0',
  browser_name: 'Safari',
  browser_version: '18.0',
  is_bot: false,
  label: 'Work laptop',
  trusted: true,
  trusted_at: NOW - 500,
  trusted_by: 'user_admin',
  blocked_at: null,
  blocked_by: null,
  block_reason: null,
  first_seen_at: NOW - 9000,
  last_seen_at: NOW,
  last_ip: '203.0.113.7',
  last_country_code: 'JM',
  sign_in_count: 12,
  created_at: NOW - 9000,
  updated_at: NOW,
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  userDevice.findMany.mockResolvedValue([deviceRow()])
  userDevice.findUnique.mockResolvedValue(deviceRow())
  userDevice.update.mockResolvedValue(deviceRow())
  authAttempt.findMany.mockResolvedValue([])
})

describe('GET /devices', () => {
  it('returns a list object of devices', async () => {
    const response = await request(createApp()).get('/devices').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/devices',
        total_count: null,
      },
      error: null,
    })
  })

  it('never serializes the raw fingerprint signal components', async () => {
    // `signal` is the collection material a fingerprint was computed from;
    // publishing it would let a reader reconstruct or forge one.
    await request(createApp()).get('/devices').set(AUTH)

    const select = userDevice.findMany.mock.calls[0]?.[0].select as Record<
      string,
      unknown
    >
    expect(select).not.toHaveProperty('signal')
  })

  it('orders by last seen, not by creation', async () => {
    await request(createApp()).get('/devices').set(AUTH)

    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lastSeenAt: 'desc' } })
    )
  })

  it('treats blocked as the presence of a blocked_at stamp', async () => {
    await request(createApp()).get('/devices?blocked=true').set(AUTH)

    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ blockedAt: { not: null } }] },
      })
    )
  })

  it('treats blocked=false as the absence of that stamp', async () => {
    await request(createApp()).get('/devices?blocked=false').set(AUTH)

    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ blockedAt: null }] } })
    )
  })

  it('searches fingerprint, label, hardware and last ip with q', async () => {
    await request(createApp()).get('/devices?q=macbook').set(AUTH)

    const contains = { contains: 'macbook', mode: 'insensitive' }
    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { fingerprint: contains },
                { label: contains },
                { deviceBrand: contains },
                { deviceModel: contains },
                { lastIp: contains },
              ],
            },
          ],
        },
      })
    )
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/devices')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(userDevice.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /devices/:device_id', () => {
  it('returns the device', async () => {
    const response = await request(createApp())
      .get('/devices/dev_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
  })

  it('404s an unknown device', async () => {
    userDevice.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/devices/dev_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('device/not-found')
  })
})

describe('GET /devices/:device_id/attempts', () => {
  it('reads the attempt history through the module that owns it', async () => {
    authAttempt.findMany.mockResolvedValue([])

    const response = await request(createApp())
      .get('/devices/dev_7fJ3/attempts')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/devices/dev_7fJ3/attempts')
    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ deviceId: 'dev_7fJ3' }] } })
    )
  })

  it('404s an unknown device rather than returning an empty history', async () => {
    // "No attempts on this device" and "no such device" are different answers.
    userDevice.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/devices/dev_gone/attempts')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(authAttempt.findMany).not.toHaveBeenCalled()
  })

  it('is not shadowed by the :device_id route', async () => {
    await request(createApp()).get('/devices/dev_7fJ3/attempts').set(AUTH)

    expect(authAttempt.findMany).toHaveBeenCalled()
  })
})

describe('GET /devices/:device_id/users', () => {
  it('lists every account seen on the same hardware', async () => {
    userDevice.findMany.mockResolvedValue([
      deviceRow(),
      deviceRow({ id: 'dev_other', userId: 'user_other', signInCount: 3 }),
    ])

    const response = await request(createApp())
      .get('/devices/dev_7fJ3/users')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fingerprint: 'fp_9x' } })
    )
    expect(response.body.data).toEqual({
      object: 'list',
      data: [
        {
          object: 'device_user',
          user_id: 'user_2kL9',
          device_id: 'dev_7fJ3',
          first_seen_at: NOW - 9000,
          last_seen_at: NOW,
          sign_in_count: 12,
        },
        {
          object: 'device_user',
          user_id: 'user_other',
          device_id: 'dev_other',
          first_seen_at: NOW - 9000,
          last_seen_at: NOW,
          sign_in_count: 3,
        },
      ],
      has_more: false,
      url: '/devices/dev_7fJ3/users',
      total_count: 2,
    })
  })

  it('404s an unknown device', async () => {
    userDevice.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/devices/dev_gone/users')
      .set(AUTH)

    expect(response.status).toBe(404)
  })
})

describe('POST /devices/:device_id', () => {
  it('updates the label', async () => {
    await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ label: 'Home desktop' })

    expect(userDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dev_7fJ3' },
        data: expect.objectContaining({ label: 'Home desktop' }),
      })
    )
  })

  it('stamps who trusted the device and when', async () => {
    await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ trusted: true })

    const data = userDevice.update.mock.calls[0]?.[0].data as {
      trusted: boolean
      trustedAt: bigint | null
    }
    expect(data.trusted).toBe(true)
    expect(data.trustedAt).toEqual(expect.any(BigInt))
  })

  it('clears the trust stamp when trust is withdrawn', async () => {
    await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ trusted: false })

    expect(userDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trusted: false,
          trustedAt: null,
          trustedBy: null,
        }),
      })
    )
  })

  it('keeps trust and blocking as separate facts', async () => {
    // A device trusted last month and blocked today must keep both records.
    await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ blocked: true, block_reason: 'credential stuffing' })

    const data = userDevice.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >
    expect(data).toHaveProperty('blockedAt')
    expect(data).not.toHaveProperty('trusted')
    expect(data).not.toHaveProperty('trustedAt')
  })

  it('clears the block reason when a device is unblocked', async () => {
    // A stale reason on an unblocked device reads as though it still applied.
    await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ blocked: false })

    expect(userDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          blockedAt: null,
          blockedBy: null,
          blockReason: null,
        }),
      })
    )
  })

  it('rejects an unknown field', async () => {
    const response = await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ trusted: true, superuser: true })

    expect(response.status).toBe(422)
    expect(userDevice.update).not.toHaveBeenCalled()
  })

  it('rejects a label past its length limit', async () => {
    const response = await request(createApp())
      .post('/devices/dev_7fJ3')
      .set(AUTH)
      .send({ label: 'x'.repeat(121) })

    expect(response.status).toBe(422)
  })

  it('404s an unknown device', async () => {
    userDevice.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .post('/devices/dev_gone')
      .set(AUTH)
      .send({ trusted: true })

    expect(response.status).toBe(404)
    expect(userDevice.update).not.toHaveBeenCalled()
  })
})

describe('GET /users/:user_id/devices', () => {
  it('scopes to that user and says so in the url', async () => {
    const response = await request(createApp())
      .get('/users/user_2kL9/devices')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/users/user_2kL9/devices')
    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ userId: 'user_2kL9' }] } })
    )
  })

  it('cannot be widened past that user by a query parameter', async () => {
    await request(createApp())
      .get('/users/user_2kL9/devices?user_id=user_other')
      .set(AUTH)

    expect(userDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ userId: 'user_2kL9' }] } })
    )
  })
})
