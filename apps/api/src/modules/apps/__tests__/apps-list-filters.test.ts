import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { app, apiKey } = vi.hoisted(() => ({
  app: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock('@/db/client', () => ({
  prisma: { app, apiKey },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')

const APP_KEY = '876_app_secret_kQ8vN2xLpR7wT4mB'
const AUTH = { 'X-876-API-Key': APP_KEY, 'x-internal-key': 'test-internal-key' }
const NOW = 1785000000

function appRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rap_1fef616d307d41538bfb27b3be07741a',
    name: 'Console',
    slug: 'console',
    organizationId: null,
    clientId: 'client_console',
    clientType: 'public',
    appKind: 'internal',
    status: 'active',
    allowedRedirectUris: [],
    allowedLogoutUris: [],
    logoUrl: null,
    logoFileId: null,
    homepageUrl: null,
    type: 'web',
    scopesAllowed: ['openid'],
    createdAt: BigInt(NOW),
    updatedAt: BigInt(NOW),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)

  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'rap_1fef616d307d41538bfb27b3be07741a',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  app.findMany.mockResolvedValue([appRow()])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /apps query filters', () => {
  // Regression: the repository read snake_case keys (`app_kind`, `client_type`,
  // `organization_id`) off a query the schema validates as camelCase, so every
  // filter silently resolved to `undefined` and the endpoint returned every app.
  // Console's /apps page issues one call per app kind and merges the results,
  // so each app was rendered three times.
  it('narrows the query by appKind, clientType and status', async () => {
    const res = await request(createApp())
      .get('/apps')
      .query({ appKind: 'internal', clientType: 'public', status: 'active' })
      .set(AUTH)

    expect(res.status).toBe(200)
    expect(app.findMany).toHaveBeenCalledTimes(1)
    expect(app.findMany.mock.calls[0][0].where).toEqual({
      deletedAt: null,
      appKind: 'internal',
      clientType: 'public',
      status: 'active',
    })
  })

  it('scopes an org-filtered list to that organization', async () => {
    const res = await request(createApp())
      .get('/apps')
      .query({ organizationId: 'org_9tQ6', status: 'active' })
      .set(AUTH)

    expect(res.status).toBe(200)
    expect(app.findMany).toHaveBeenCalledTimes(1)
    expect(app.findMany.mock.calls[0][0].where).toEqual({
      organizationId: 'org_9tQ6',
      deletedAt: null,
      status: 'active',
    })
  })

  it('applies no kind filter when appKind is omitted', async () => {
    const res = await request(createApp()).get('/apps').set(AUTH)

    expect(res.status).toBe(200)
    expect(app.findMany.mock.calls[0][0].where).toEqual({ deletedAt: null })
  })
})
