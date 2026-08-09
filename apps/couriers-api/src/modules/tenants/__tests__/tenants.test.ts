import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 1785000000

function tenantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ten_4qR8',
    orgId: 'org_4qR8',
    slug: 'reyes-couriers',
    name: 'Reyes Couriers',
    mailboxPrefix: 'RC',
    status: 'ACTIVE',
    createdAt: NOW - 100,
    updatedAt: NOW,
    ...overrides,
  }
}

const { tenant, apiKey } = vi.hoisted(() => ({
  tenant: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    apiKey,
    $transaction: vi.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)({})
        : Promise.all(arg as unknown[])
    ),
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

const { createApp } = await import('@/app')
const { resetSettingsForTest } = await import('@/config')
const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: '876_app_secret_test_key_for_couriers_api',
  API_INTERNAL_KEY: 'test-internal-key',
  SESSION_COOKIE_SECRET: 'test-session-cookie-secret-32-chars!!',
  SENTRY_DSN: '',
}

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const API_KEY_HEADERS = {
  'X-876-API-Key': APP_KEY,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(NOW * 1000))
  apiKey.findUnique.mockResolvedValue({
    id: 'key_1',
    appId: 'app_couriers',
    revoked: false,
    expiresAt: null,
  })
  apiKey.update.mockResolvedValue({})
  tenant.findUnique.mockResolvedValue(tenantRow() as never)
  tenant.findMany.mockResolvedValue([tenantRow()] as never)
  tenant.count.mockResolvedValue(1)
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('GET /health', () => {
  it('is public and returns the full success envelope', async () => {
    const response = await request(createApp()).get('/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'health', status: 'ok', service: '@876/couriers-api' },
      error: null,
    })
    expect(response.headers['x-request-id']).toBeDefined()
  })

  it('does not require an API key', async () => {
    const response = await request(createApp()).get('/health')
    expect(response.status).not.toBe(401)
  })

  it('rejects invalid query parameters', async () => {
    const response = await request(createApp()).get('/health?unexpected=value')
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Unrecognized key: "unexpected"',
      },
    })
  })
})

describe('GET /v1/tenants/:id', () => {
  it('returns the tenant with full body and envelope', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_4qR8')
      .set(API_KEY_HEADERS)

    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual({
      object: 'tenant',
      id: 'ten_4qR8',
      org_id: 'org_4qR8',
      slug: 'reyes-couriers',
      name: 'Reyes Couriers',
      mailbox_prefix: 'RC',
      status: 'ACTIVE',
      created_at: NOW - 100,
      updated_at: NOW,
    })
    expect(response.headers['x-request-id']).toBeDefined()
  })

  it('404s with exact code when absent', async () => {
    tenant.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/v1/tenants/missing')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'tenant/not-found', message: 'Not found.' },
    })
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })

  it('rejects with api-key/missing when no key is presented', async () => {
    const response = await request(createApp()).get('/v1/tenants/ten_4qR8')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
    expect(response.body).toEqual({
      data: null,
      error: { code: 'api-key/missing', message: 'An API key is required.' },
    })
  })

  it('rejects with api-key/invalid for a bad prefix', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_4qR8')
      .set('X-876-API-Key', 'sk_not_876')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/invalid')
  })

  it('rejects invalid query parameters', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_4qR8?unexpected=value')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Unrecognized key: "unexpected"',
      },
    })
  })

  it('honours an inbound x-request-id and echoes it', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_4qR8')
      .set({ ...API_KEY_HEADERS, 'x-request-id': 'req_test_123' })
    expect(response.headers['x-request-id']).toBe('req_test_123')
  })

  it('returns 404 not 401 for an unknown path before auth runs', async () => {
    const response = await request(createApp())
      .get('/v1/tenants-unknown-path')
      .set(API_KEY_HEADERS)
    // The path does not match any route, so notFoundHandler runs (404), not the guard.
    // But /v1/tenants-unknown-path is not same prefix, expect 404.
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('error/not-found')
  })
})

describe('GET /v1/tenants/by-org/:orgId', () => {
  it('returns the tenant by org id with full body', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/by-org/org_4qR8')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(200)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual({
      object: 'tenant',
      id: 'ten_4qR8',
      org_id: 'org_4qR8',
      slug: 'reyes-couriers',
      name: 'Reyes Couriers',
      mailbox_prefix: 'RC',
      status: 'ACTIVE',
      created_at: NOW - 100,
      updated_at: NOW,
    })
    expect(tenant.findUnique).toHaveBeenCalledWith({
      where: { orgId: 'org_4qR8' },
    })
  })

  it('404s with exact code when org has no tenant', async () => {
    tenant.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/v1/tenants/by-org/org_missing')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('tenant/not-found')
    expect(response.body.data).toBeNull()
  })

  it('requires an API key', async () => {
    const response = await request(createApp()).get(
      '/v1/tenants/by-org/org_4qR8'
    )
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
  })

  it('rejects invalid query parameters', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/by-org/org_4qR8?unexpected=value')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Unrecognized key: "unexpected"',
      },
    })
  })

  it('does not leak httpStatus into the body', async () => {
    tenant.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/v1/tenants/by-org/org_missing')
      .set(API_KEY_HEADERS)
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })

  it('is not shadowed by the /:id route', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/by-org/org_4qR8')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(200)
    expect(response.body.data.org_id).toBe('org_4qR8')
  })
})

describe('GET /v1/tenants', () => {
  it('returns the list object with admin auth', async () => {
    const response = await request(createApp())
      .get('/v1/tenants')
      .set(ADMIN_HEADERS)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'tenant',
            id: 'ten_4qR8',
            org_id: 'org_4qR8',
            slug: 'reyes-couriers',
            name: 'Reyes Couriers',
            mailbox_prefix: 'RC',
            status: 'ACTIVE',
            created_at: NOW - 100,
            updated_at: NOW,
          },
        ],
        has_more: false,
        url: '/v1/tenants',
        total_count: 1,
      },
      error: null,
    })
  })

  it('is admin-only: apiKey alone gets auth/no-session', async () => {
    const response = await request(createApp())
      .get('/v1/tenants')
      .set(API_KEY_HEADERS)
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('rejects when no credentials at all', async () => {
    const response = await request(createApp()).get('/v1/tenants')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('api-key/missing')
  })

  it('rejects a wrong internal key with auth/no-session', async () => {
    const response = await request(createApp())
      .get('/v1/tenants')
      .set({ 'X-876-API-Key': APP_KEY, 'x-internal-key': 'wrong-key' })
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/no-session')
  })

  it('rejects an admin request when the internal key is unset', async () => {
    resetSettingsForTest({ ...testEnv, API_INTERNAL_KEY: '' })
    const response = await request(createApp())
      .get('/v1/tenants')
      .set(ADMIN_HEADERS)
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'No active session.' },
    })
  })

  it('rejects invalid list query parameters', async () => {
    const response = await request(createApp())
      .get('/v1/tenants?unexpected=value')
      .set(ADMIN_HEADERS)
    expect(response.status).toBe(422)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid',
        message: 'Unrecognized key: "unexpected"',
      },
    })
  })
})

describe('envelope and path logging invariants', () => {
  it('wraps success as { data, error: null }', async () => {
    const response = await request(createApp())
      .get('/v1/tenants/ten_4qR8')
      .set(API_KEY_HEADERS)
    expect(response.body).toHaveProperty('data')
    expect(response.body).toHaveProperty('error')
    expect(response.body.error).toBeNull()
  })

  it('wraps errors as { data: null, error: { code, message } }', async () => {
    tenant.findUnique.mockResolvedValue(null)
    const response = await request(createApp())
      .get('/v1/tenants/missing')
      .set(API_KEY_HEADERS)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('tenant/not-found')
    expect(response.body.error.message).toBe('Not found.')
    expect(response.body.error).not.toHaveProperty('httpStatus')
  })
})

describe('the published OpenAPI document', () => {
  it('documents all tenant routes and health', async () => {
    const response = await request(createApp()).get('/openapi.json')
    expect(response.status).toBe(200)
    expect(response.body.openapi).toBe('3.1.0')
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/health',
        '/v1/tenants',
        '/v1/tenants/{id}',
        '/v1/tenants/by-org/{orgId}',
      ])
    )
  })

  it('matches the snapshot (no undocumented route drift)', async () => {
    const response = await request(createApp()).get('/openapi.json')
    expect(response.body).toMatchSnapshot()
  })
})
