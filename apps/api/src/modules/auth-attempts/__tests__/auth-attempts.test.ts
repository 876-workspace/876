import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authAttempt, apiKey } = vi.hoisted(() => ({
  authAttempt: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { authAttempt, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function attemptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'atmp_7fJ3',
    event: 'login',
    outcome: 'failed',
    failureCode: 'auth/invalid-credentials',
    identifier: 'alejandra@example.com',
    userId: null,
    appId: 'app_4qR8',
    sessionId: null,
    realm: 'consumer',
    deviceId: null,
    deviceFingerprint: 'fp_9x',
    ipAddress: '203.0.113.7',
    ipCountryCode: 'JM',
    ipRegionCode: 'JM-01',
    ipRegion: 'Kingston',
    ipCity: 'Kingston',
    ipPostalCode: null,
    ipTimezone: 'America/Jamaica',
    ipLatitude: '17.99',
    ipLongitude: '-76.79',
    ipAsn: 'AS1234',
    ipAsOrganization: 'Flow',
    userAgent: 'Mozilla/5.0',
    deviceType: 'desktop',
    deviceBrand: null,
    deviceModel: null,
    osName: 'macOS',
    osVersion: '15.0',
    browserName: 'Safari',
    browserVersion: '18.0',
    isBot: false,
    contextTrusted: false,
    riskScore: 42,
    riskReasons: ['new_country'],
    requestId: 'req_1',
    createdAt: BigInt(NOW),
    ...overrides,
  }
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
  authAttempt.findMany.mockResolvedValue([attemptRow()])
  authAttempt.findUnique.mockResolvedValue(attemptRow())
  authAttempt.count.mockResolvedValue(7)
  authAttempt.groupBy.mockResolvedValue([])
})

describe('GET /auth-attempts', () => {
  it('returns a list object of attempts', async () => {
    const response = await request(createApp()).get('/auth-attempts').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.object).toBe('list')
    expect(response.body.data.data[0]).toEqual({
      object: 'auth_attempt',
      id: 'atmp_7fJ3',
      event: 'login',
      outcome: 'failed',
      failure_code: 'auth/invalid-credentials',
      identifier: 'alejandra@example.com',
      user_id: null,
      app_id: 'app_4qR8',
      session_id: null,
      realm: 'consumer',
      device_id: null,
      device_fingerprint: 'fp_9x',
      ip_address: '203.0.113.7',
      ip_country_code: 'JM',
      ip_region_code: 'JM-01',
      ip_region: 'Kingston',
      ip_city: 'Kingston',
      ip_postal_code: null,
      ip_timezone: 'America/Jamaica',
      ip_latitude: '17.99',
      ip_longitude: '-76.79',
      ip_asn: 'AS1234',
      ip_as_organization: 'Flow',
      user_agent: 'Mozilla/5.0',
      device_type: 'desktop',
      device_brand: null,
      device_model: null,
      os_name: 'macOS',
      os_version: '15.0',
      browser_name: 'Safari',
      browser_version: '18.0',
      is_bot: false,
      context_trusted: false,
      risk_score: 42,
      risk_reasons: ['new_country'],
      request_id: 'req_1',
      created_at: NOW,
    })
    expect(response.body.error).toBeNull()
  })

  it('is admin-only — failed-login material is not app-tier data', async () => {
    const response = await request(createApp())
      .get('/auth-attempts')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(authAttempt.findMany).not.toHaveBeenCalled()
  })

  it('lower-cases an identifier filter to match how it is stored', async () => {
    await request(createApp())
      .get('/auth-attempts?identifier=Alejandra@Example.com')
      .set(AUTH)

    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ identifier: 'alejandra@example.com' }] },
      })
    )
  })

  it('upper-cases a country filter to match how it is stored', async () => {
    await request(createApp())
      .get('/auth-attempts?ip_country_code=jm')
      .set(AUTH)

    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ ipCountryCode: 'JM' }] } })
    )
  })

  it('narrows by time window on both ends', async () => {
    await request(createApp())
      .get('/auth-attempts?created_after=100&created_before=200')
      .set(AUTH)

    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ createdAt: { gte: 100n } }, { createdAt: { lte: 200n } }],
        },
      })
    )
  })

  it('searches identifier, ip and fingerprint with q', async () => {
    await request(createApp()).get('/auth-attempts?q=203.0').set(AUTH)

    const contains = { contains: '203.0', mode: 'insensitive' }
    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { identifier: contains },
                { ipAddress: contains },
                { deviceFingerprint: contains },
              ],
            },
          ],
        },
      })
    )
  })

  it('serializes a malformed risk_reasons value as null', async () => {
    // The column is Json; a row written by an older shape must not break the
    // response contract.
    authAttempt.findMany.mockResolvedValue([
      attemptRow({ riskReasons: { reason: 'new_country' } }),
    ])

    const response = await request(createApp()).get('/auth-attempts').set(AUTH)

    expect(response.body.data.data[0].risk_reasons).toBeNull()
  })
})

describe('GET /auth-attempts/summary', () => {
  it('aggregates outcomes and top values for the window', async () => {
    authAttempt.groupBy
      .mockResolvedValueOnce([
        { outcome: 'failed', _count: { _all: 5 } },
        { outcome: 'succeeded', _count: { _all: 2 } },
      ])
      .mockResolvedValueOnce([{ ipCountryCode: 'JM', _count: { _all: 4 } }])
      .mockResolvedValueOnce([
        { failureCode: 'auth/invalid-credentials', _count: { _all: 3 } },
      ])
      .mockResolvedValueOnce([
        { ipAddress: '203.0.113.7', _count: { _all: 3 } },
      ])

    const response = await request(createApp())
      .get('/auth-attempts/summary')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      object: 'auth_attempt_summary',
      window: '24h',
      total: 7,
      outcomes: { failed: 5, succeeded: 2 },
      top_countries: [{ value: 'JM', count: 4 }],
      top_failure_codes: [{ value: 'auth/invalid-credentials', count: 3 }],
      top_failure_ips: [{ value: '203.0.113.7', count: 3 }],
    })
  })

  it('defaults to the 24h window', async () => {
    const response = await request(createApp())
      .get('/auth-attempts/summary')
      .set(AUTH)

    expect(response.body.data.window).toBe('24h')
  })

  it('widens the window for 30d', async () => {
    await request(createApp())
      .get('/auth-attempts/summary?window=30d')
      .set(AUTH)

    const where = authAttempt.count.mock.calls[0]?.[0].where as {
      createdAt: { gte: bigint }
    }
    const since = Number(where.createdAt.gte)
    expect(Math.floor(Date.now() / 1000) - since).toBeGreaterThanOrEqual(
      2_592_000
    )
  })

  it('rejects an unknown window', async () => {
    const response = await request(createApp())
      .get('/auth-attempts/summary?window=all-time')
      .set(AUTH)

    expect(response.status).toBe(422)
  })

  it('drops null values out of the top lists', async () => {
    authAttempt.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { ipCountryCode: null, _count: { _all: 9 } },
        { ipCountryCode: 'JM', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const response = await request(createApp())
      .get('/auth-attempts/summary')
      .set(AUTH)

    expect(response.body.data.top_countries).toEqual([
      { value: 'JM', count: 1 },
    ])
  })

  it('is matched before the :attempt_id route', async () => {
    await request(createApp()).get('/auth-attempts/summary').set(AUTH)

    expect(authAttempt.findUnique).not.toHaveBeenCalled()
  })
})

describe('GET /auth-attempts/:attempt_id', () => {
  it('returns the attempt', async () => {
    const response = await request(createApp())
      .get('/auth-attempts/atmp_7fJ3')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.id).toBe('atmp_7fJ3')
  })

  it('404s an unknown attempt', async () => {
    authAttempt.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/auth-attempts/atmp_gone')
      .set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'auth-attempt/not-found', message: 'Not found.' },
    })
  })
})

describe('GET /users/:user_id/auth-attempts', () => {
  it('scopes to the user and says so in the url', async () => {
    const response = await request(createApp())
      .get('/users/user_2kL9/auth-attempts')
      .set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/users/user_2kL9/auth-attempts')
    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ userId: 'user_2kL9' }] } })
    )
  })

  it('ignores query filters that would widen past that user', async () => {
    // The path scopes the resource; a query parameter must not escape it.
    await request(createApp())
      .get('/users/user_2kL9/auth-attempts?user_id=user_other')
      .set(AUTH)

    expect(authAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { AND: [{ userId: 'user_2kL9' }] } })
    )
  })

  it('is admin-only', async () => {
    const response = await request(createApp())
      .get('/users/user_2kL9/auth-attempts')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})
