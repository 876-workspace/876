import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Prisma is mocked at the module boundary, so these tests drive the real guard
 * chain, validation, service, serializer, and envelope — everything but the
 * database round trip.
 */
const { auditEvent, apiKey } = vi.hoisted(() => ({
  auditEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
  },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { auditEvent, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const INTERNAL_KEY = 'test-internal-key'
const APP_ID = 'app_2kL9mN4q'

function auditEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aud_7fJ3kQ',
    event: 'page_view',
    source: 'client',
    appName: '876-console',
    appId: APP_ID,
    userId: 'user_2kL9mN4q',
    path: '/orgs',
    search: null,
    referrer: null,
    title: 'Organizations',
    requestId: 'req_9x',
    sessionId: 'ses_4b',
    distinctId: 'dst_1a',
    properties: { plan: 'pro' },
    createdAt: 1785000000n,
    ...overrides,
  }
}

const SERIALIZED = {
  object: 'audit_event',
  id: 'aud_7fJ3kQ',
  event: 'page_view',
  source: 'client',
  app_name: '876-console',
  app_id: APP_ID,
  user_id: 'user_2kL9mN4q',
  path: '/orgs',
  search: null,
  referrer: null,
  title: 'Organizations',
  request_id: 'req_9x',
  session_id: 'ses_4b',
  distinct_id: 'dst_1a',
  properties: { plan: 'pro' },
  created_at: 1785000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: APP_ID,
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  auditEvent.create.mockResolvedValue(auditEventRow())
  auditEvent.findMany.mockResolvedValue([auditEventRow()])
  auditEvent.findUnique.mockResolvedValue(null)
  auditEvent.count.mockResolvedValue(1)
})

describe('POST /audit-events', () => {
  it('records an event and returns the created resource', async () => {
    const response = await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: SERIALIZED, error: null })
  })

  it('attributes the event to the app that owns the API key, not the body', async () => {
    // An app must not be able to write telemetry under another app's identity.
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({
        event: 'page_view',
        app_name: '876-console',
        app_id: 'app_someone_else',
      })
      .expect(422)

    expect(auditEvent.create).not.toHaveBeenCalled()
  })

  it('takes app_id from the validated credential', async () => {
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console' })

    expect(auditEvent.create).toHaveBeenCalledTimes(1)
    expect(auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ appId: APP_ID }),
      })
    )
  })

  it('defaults source to client', async () => {
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console' })

    expect(auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'client' }),
      })
    )
  })

  it('trims a whitespace-padded event name', async () => {
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: '  page_view  ', app_name: '876-console' })

    expect(auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: 'page_view' }),
      })
    )
  })

  it('stores a blank optional field as null rather than an empty string', async () => {
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console', title: '   ' })

    expect(auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: null }),
      })
    )
  })

  it('defaults properties to an empty object', async () => {
    await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console' })

    expect(auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ properties: {} }),
      })
    )
  })

  it('rejects a missing event name', async () => {
    const response = await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ app_name: '876-console' })

    expect(response.status).toBe(422)
    expect(auditEvent.create).not.toHaveBeenCalled()
  })

  it('rejects an event name past its length limit', async () => {
    const response = await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'e'.repeat(121), app_name: '876-console' })

    expect(response.status).toBe(422)
  })

  it('requires an API key', async () => {
    const response = await request(createApp())
      .post('/audit-events')
      .send({ event: 'page_view', app_name: '876-console' })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
    expect(auditEvent.create).not.toHaveBeenCalled()
  })

  it('serializes the created_at bigint as a number of seconds', async () => {
    const response = await request(createApp())
      .post('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .send({ event: 'page_view', app_name: '876-console' })

    expect(response.body.data.created_at).toBe(1785000000)
    expect(typeof response.body.data.created_at).toBe('number')
  })
})

describe('GET /audit-events', () => {
  it('returns a list object of audit events', async () => {
    const response = await request(createApp())
      .get('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [SERIALIZED],
        has_more: false,
        url: '/audit-events',
        total_count: 1,
      },
      error: null,
    })
  })

  it('is admin-only — an app key alone is forbidden', async () => {
    const response = await request(createApp())
      .get('/audit-events')
      .set('X-876-API-Key', APP_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
    expect(auditEvent.findMany).not.toHaveBeenCalled()
  })

  it('still requires the app API key alongside the internal key', async () => {
    const response = await request(createApp())
      .get('/audit-events')
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
  })

  it('defaults to 25 rows and asks for one extra to decide has_more', async () => {
    await request(createApp())
      .get('/audit-events')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 26 })
    )
  })

  it('reports has_more when the extra row comes back', async () => {
    auditEvent.findMany.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => auditEventRow({ id: `aud_${i}` }))
    )

    const response = await request(createApp())
      .get('/audit-events?limit=2')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.body.data.has_more).toBe(true)
    expect(response.body.data.data).toHaveLength(2)
  })

  it('threads the filters into the query', async () => {
    await request(createApp())
      .get('/audit-events?app_name=876-console&event=page_view&user_id=user_1')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: expect.arrayContaining([
            { appName: '876-console' },
            { event: 'page_view' },
            { userId: 'user_1' },
          ]),
        },
      })
    )
  })

  it('searches across event, app, path, request and user with q', async () => {
    await request(createApp())
      .get('/audit-events?q=kingston')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    const contains = { contains: 'kingston', mode: 'insensitive' }
    expect(auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { event: contains },
                { appName: contains },
                { path: contains },
                { requestId: contains },
                { userId: contains },
              ],
            },
          ],
        },
      })
    )
  })

  it('returns an empty page for an unknown cursor rather than erroring', async () => {
    // A stale cursor is the client's problem to notice, not a reason to fail
    // their request — the FastAPI repository behaved the same way.
    auditEvent.findUnique.mockResolvedValue(null)

    const response = await request(createApp())
      .get('/audit-events?starting_after=aud_gone')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(200)
    expect(response.body.data.data).toEqual([])
    expect(response.body.data.has_more).toBe(false)
    expect(auditEvent.findMany).not.toHaveBeenCalled()
  })

  it('pages forward on a composite (created_at, id) cursor', async () => {
    // Events arrive in bursts and share a second, so a created_at-only cursor
    // would skip or repeat rows at a page boundary.
    auditEvent.findUnique.mockResolvedValue({
      id: 'aud_anchor',
      createdAt: 1785000000n,
    })

    await request(createApp())
      .get('/audit-events?starting_after=aud_anchor')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { createdAt: { lt: 1785000000n } },
                { createdAt: 1785000000n, id: { lt: 'aud_anchor' } },
              ],
            },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      })
    )
  })

  it('walks back with ending_before and still returns newest-first', async () => {
    auditEvent.findUnique.mockResolvedValue({
      id: 'aud_anchor',
      createdAt: 1785000000n,
    })
    auditEvent.findMany.mockResolvedValue([
      auditEventRow({ id: 'aud_older' }),
      auditEventRow({ id: 'aud_newer' }),
    ])

    const response = await request(createApp())
      .get('/audit-events?ending_before=aud_anchor')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(auditEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
    )
    expect(
      response.body.data.data.map((row: { id: string }) => row.id)
    ).toEqual(['aud_newer', 'aud_older'])
  })

  it('rejects a limit above the maximum', async () => {
    const response = await request(createApp())
      .get('/audit-events?limit=500')
      .set('X-876-API-Key', APP_KEY)
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(422)
    expect(auditEvent.findMany).not.toHaveBeenCalled()
  })
})
