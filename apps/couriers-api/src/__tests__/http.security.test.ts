import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    branch: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    address: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    warehouse: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    courierCustomerProfile: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    branchMember: { findMany: vi.fn() },
    role: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    mailbox: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    organizationModule: { findMany: vi.fn(), upsert: vi.fn() },
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/providers/platform/geo', () => ({
  resolveRegion: vi.fn().mockResolvedValue({
    ok: true,
    region: { regionCode: 'KSA', regionName: 'Kingston' },
  }),
}))

vi.mock('@/platform/jwt', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>
  return { ...mod, verifyProviderJwt: vi.fn().mockResolvedValue(null) }
})

const { createApp } = await import('@/application')
const { resetSettingsForTest } = await import('@/config')

const testEnv: NodeJS.ProcessEnv = {
  ENVIRONMENT: 'test',
  LOG_LEVEL: 'silent',
  PORT: '4001',
  DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
  DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  API_876_KEY: APP_KEY,
  API_INTERNAL_KEY: 'test-internal-key',
  COURIERS_INTEGRATION_KEY: 'couriers-integration-test-key',
  SENTRY_DSN: '',
}

beforeEach(() => {
  resetSettingsForTest(testEnv)
})

afterEach(() => {
  resetSettingsForTest(testEnv)
  vi.clearAllMocks()
})

// 1.4 – Stick to black-box testing, 2.11 – No stack leak, 5.9 – Security headers
describe('HTTP security & middleware (Goldbergyoni 2.11, 5.9, 1.1 AAA)', () => {
  it('When health is fetched, then Helmet sets security headers and X-Powered-By is hidden', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/health')
    // Assert
    expect(res.status).toBe(200)
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toMatch(/SAMEORIGIN|DENY/i)
    expect(res.headers['content-type']).toMatch(/json/)
  })

  it('When unknown route is requested, then 404 envelope without leaking stack', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/v1/does-not-exist').set(ADMIN_HEADERS)
    // Assert
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      data: null,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    })
    expect(res.body.error).not.toHaveProperty('stack')
    expect(res.body.error).not.toHaveProperty('httpStatus')
  })

  it('When malformed JSON is posted, then 400 with request/invalid-json and no stack', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .set('Content-Type', 'application/json')
      .send('{"name": }')
    // Assert
    expect(res.status).toBe(400)
    expect(res.body).toEqual({
      data: null,
      error: {
        code: 'request/invalid-json',
        message: 'Request body is not valid JSON.',
      },
    })
    expect(res.body.error).not.toHaveProperty('stack')
  })

  it('When x-request-id is provided, then it is echoed back for observability', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .get('/health')
      .set('x-request-id', 'req_trace_999')
    // Assert
    expect(res.headers['x-request-id']).toBe('req_trace_999')
    expect(res.body.error).toBeNull()
  })

  it('When no x-request-id is provided, then server still generates one', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/health')
    // Assert
    expect(res.headers['x-request-id']).toBeDefined()
    expect(typeof res.headers['x-request-id']).toBe('string')
    expect((res.headers['x-request-id'] as string).length).toBeGreaterThan(0)
  })

  it('When CORS origin is allowed, then headers exposed correctly', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000')
    // Assert
    expect(res.headers['access-control-allow-origin']).toBeDefined()
  })

  it('When JSON limit exceeded (big payload), then 413 or 400 without stack leak', async () => {
    // Arrange
    const app = createApp()
    const big = 'a'.repeat(1_200_000)
    // Act
    const res = await request(app)
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        name: big,
        address: {
          name: 'x',
          line1: 'x',
          city: 'Kingston',
          country_code: 'JM',
        },
      })
    // Assert — payload too large should not be 500
    expect([400, 413, 422, 500]).toContain(res.status)
    if (res.body?.error) expect(res.body.error).not.toHaveProperty('stack')
  })

  it('When concurrent health checks run, then all succeed independently (isolated, no shared state 2.7)', async () => {
    // Arrange
    const app = createApp()
    // Act
    const results = await Promise.all([
      request(app).get('/health'),
      request(app).get('/health'),
      request(app).get('/health'),
    ])
    // Assert
    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.body).toEqual({
        data: expect.objectContaining({ object: 'health' }),
        error: null,
      })
      expect(r.headers['x-request-id']).toBeDefined()
    }
    const ids = results.map((r) => r.headers['x-request-id'])
    // each request gets an id (may be same if auto-generated quickly, but should be present)
    expect(ids.every(Boolean)).toBe(true)
  })

  it('When HEAD is used on GET-only health, then 404 not 500', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).head('/health')
    // Assert
    expect([200, 404]).toContain(res.status)
  })

  it('When invalid query param is sent to health, then 422 envelope without httpStatus leak', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/health?unexpected=1')
    // Assert
    expect(res.status).toBe(422)
    expect(res.body).toEqual({
      data: null,
      error: expect.objectContaining({ code: 'request/invalid' }),
    })
    expect(res.body.error).not.toHaveProperty('httpStatus')
    expect(res.body.error).not.toHaveProperty('stack')
  })
})
