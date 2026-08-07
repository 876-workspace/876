import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { session, apiKey } = vi.hoisted(() => ({
  session: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { session, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const INTERNAL_KEY = 'test-internal-key'
const NOW = 1785000000

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ses_7fJ3',
    userId: 'user_2kL9',
    appId: 'app_4qR8',
    expiresAt: BigInt(NOW + 3600),
    ipAddress: '203.0.113.7',
    userAgent: 'Mozilla/5.0',
    deviceId: 'dev_1a',
    ipCountryCode: 'JM',
    ipRegion: 'Kingston',
    ipCity: 'Kingston',
    ipAsn: 'AS1234',
    ipAsOrganization: 'Flow',
    lastSeenAt: BigInt(NOW),
    revokedAt: null,
    revokedBy: null,
    createdAt: BigInt(NOW - 100),
    updatedAt: BigInt(NOW - 100),
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'session',
  id: 'ses_7fJ3',
  user_id: 'user_2kL9',
  app_id: 'app_4qR8',
  expires_at: NOW + 3600,
  ip_address: '203.0.113.7',
  user_agent: 'Mozilla/5.0',
  device_id: 'dev_1a',
  ip_country_code: 'JM',
  ip_region: 'Kingston',
  ip_city: 'Kingston',
  ip_asn: 'AS1234',
  ip_as_organization: 'Flow',
  last_seen_at: NOW,
  revoked_at: null,
  revoked_by: null,
  created_at: NOW - 100,
  updated_at: NOW - 100,
}

function admin() {
  return request(createApp())
}

const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': INTERNAL_KEY }

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_4qR8',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  session.findMany.mockResolvedValue([sessionRow()])
  session.findUnique.mockResolvedValue(sessionRow())
  session.update.mockResolvedValue(
    sessionRow({ revokedAt: BigInt(NOW), revokedBy: null })
  )
  session.updateMany.mockResolvedValue({ count: 3 })
})

describe('GET /sessions', () => {
  it('returns a list object of sessions', async () => {
    const response = await admin().get('/sessions').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/sessions',
        total_count: null,
      },
      error: null,
    })
  })

  it('never exposes the session token or its hash', async () => {
    // The row holds a live credential; the API describes the session.
    const response = await admin().get('/sessions').set(AUTH)

    const body = JSON.stringify(response.body)
    expect(body).not.toContain('token')
    expect(body).not.toContain('token_hash')
  })

  it('is admin-only', async () => {
    const response = await admin()
      .get('/sessions')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(session.findMany).not.toHaveBeenCalled()
  })

  it('filters to active sessions as unexpired and unrevoked', async () => {
    await admin().get('/sessions?status=active').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          revokedAt: null,
          expiresAt: { gt: expect.any(BigInt) },
        }),
      })
    )
  })

  it('separates revoked from expired — an act versus the clock', async () => {
    await admin().get('/sessions?status=revoked').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: { not: null } }),
      })
    )

    vi.clearAllMocks()
    session.findMany.mockResolvedValue([])
    await admin().get('/sessions?status=expired').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          revokedAt: null,
          expiresAt: { lte: expect.any(BigInt) },
        }),
      })
    )
  })

  it('lets the precise status filter win over the coarse active flag', async () => {
    await admin().get('/sessions?status=revoked&active=true').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ revokedAt: { not: null } }),
      })
    )
  })

  it('treats active=false as expired or revoked', async () => {
    await admin().get('/sessions?active=false').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { expiresAt: { lte: expect.any(BigInt) } },
            { revokedAt: { not: null } },
          ],
        }),
      })
    )
  })

  it('rejects an unknown status value', async () => {
    const response = await admin().get('/sessions?status=zombie').set(AUTH)

    expect(response.status).toBe(422)
    expect(session.findMany).not.toHaveBeenCalled()
  })

  it('filters by user and device', async () => {
    await admin().get('/sessions?user_id=user_1&device_id=dev_9').set(AUTH)

    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_1',
          deviceId: 'dev_9',
        }),
      })
    )
  })
})

describe('GET /sessions/:session_id', () => {
  it('returns the session', async () => {
    const response = await admin().get('/sessions/ses_7fJ3').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
  })

  it('404s an unknown session', async () => {
    session.findUnique.mockResolvedValue(null)

    const response = await admin().get('/sessions/ses_gone').set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'session/not-found', message: 'Not found.' },
    })
  })
})

describe('DELETE /sessions/:session_id', () => {
  it('returns a tombstone', async () => {
    const response = await admin().delete('/sessions/ses_7fJ3').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'session', id: 'ses_7fJ3', deleted: true },
      error: null,
    })
  })

  it('revokes rather than deletes, keeping the forensic record', async () => {
    // Deleting the row would erase exactly the evidence an investigation needs.
    await admin().delete('/sessions/ses_7fJ3').set(AUTH)

    expect(session.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ses_7fJ3' },
        data: expect.objectContaining({
          revokedAt: expect.any(BigInt),
          expiresAt: expect.any(BigInt),
        }),
      })
    )
  })

  it('pulls expires_at back to now so every expiry check sees it dead', async () => {
    // A session that would otherwise have run for another hour.
    session.findUnique.mockResolvedValue({
      expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
    })

    await admin().delete('/sessions/ses_7fJ3').set(AUTH)

    const data = session.update.mock.calls[0]?.[0].data as {
      expiresAt: bigint
      revokedAt: bigint
    }
    expect(data.expiresAt).toBe(data.revokedAt)
  })

  it('leaves an already-past expiry alone rather than pushing it forward', async () => {
    session.findUnique.mockResolvedValue({ expiresAt: BigInt(NOW - 9999) })

    await admin().delete('/sessions/ses_7fJ3').set(AUTH)

    const data = session.update.mock.calls[0]?.[0].data as {
      expiresAt: bigint
    }
    expect(data.expiresAt).toBe(BigInt(NOW - 9999))
  })

  it('404s an unknown session rather than reporting a silent success', async () => {
    session.findUnique.mockResolvedValue(null)

    const response = await admin().delete('/sessions/ses_gone').set(AUTH)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('session/not-found')
    expect(session.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /users/:user_id/sessions', () => {
  it('reports how many sessions were cut off', async () => {
    const response = await admin().delete('/users/user_2kL9/sessions').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'session_list',
        user_id: 'user_2kL9',
        deleted: true,
        revoked_count: 3,
      },
      error: null,
    })
  })

  it('touches only the sessions that are still live', async () => {
    await admin().delete('/users/user_2kL9/sessions').set(AUTH)

    expect(session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_2kL9', revokedAt: null },
      })
    )
  })

  it('reports zero when the user had no live sessions', async () => {
    session.updateMany.mockResolvedValue({ count: 0 })

    const response = await admin().delete('/users/user_2kL9/sessions').set(AUTH)

    expect(response.body.data.revoked_count).toBe(0)
  })
})

describe('GET /users/:user_id/sessions', () => {
  it('scopes the list to that user and says so in the url', async () => {
    const response = await admin().get('/users/user_2kL9/sessions').set(AUTH)

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('/users/user_2kL9/sessions')
    expect(session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user_2kL9' }),
      })
    )
  })

  it('is admin-only', async () => {
    const response = await admin()
      .get('/users/user_2kL9/sessions')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
  })
})
