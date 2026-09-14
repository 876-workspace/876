import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getError } from '@876/core'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const { tenantFindMany } = vi.hoisted(() => ({
  tenantFindMany: vi.fn().mockResolvedValue([]),
}))

// Shared prisma mock for envelope tests – no DB needed, just guard pass
vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findMany: tenantFindMany,
      count: vi.fn().mockResolvedValue(0),
    },
    branch: { findMany: vi.fn().mockResolvedValue([]) },
    warehouse: { findMany: vi.fn().mockResolvedValue([]) },
    courierCustomerProfile: { findMany: vi.fn().mockResolvedValue([]) },
    address: { findMany: vi.fn().mockResolvedValue([]) },
    mailbox: { findMany: vi.fn().mockResolvedValue([]) },
    role: { findMany: vi.fn().mockResolvedValue([]) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    organizationModule: { findMany: vi.fn().mockResolvedValue([]) },
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
  SENTRY_DSN: '',
}

beforeEach(() => resetSettingsForTest(testEnv))
afterEach(() => {
  resetSettingsForTest(testEnv)
  vi.clearAllMocks()
})

// 2.10 – Dynamic field assertions, 1.3 – Single assertion per test focused, 2.11 – No leak
describe('Envelope & error contract (Goldbergyoni 1.3, 2.10, 2.11)', () => {
  it('When success is returned, then envelope is { data: <object>, error: null }', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/health')
    // Assert
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toBeNull()
    expect(res.body.data).toEqual(expect.objectContaining({ object: 'health' }))
  })

  it('When error is returned, then envelope is { data: null, error: { code, message } } without httpStatus', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .get('/v1/tenants/missing_xyz')
      .set({ 'X-876-API-Key': APP_KEY })
    // but missing tenant uses integration? Use tenants by id which needs apiKey
    const res2 = await request(app)
      .get('/v1/tenants/missing_xyz')
      .set({ 'X-876-API-Key': APP_KEY })
    // Assert
    // api-key missing? actually we send key, should be 404 or 401 depending on auth; ensure shape
    for (const r of [res, res2]) {
      expect(r.body).toHaveProperty('data', null)
      expect(r.body).toHaveProperty('error')
      expect(r.body.error).toHaveProperty('code')
      expect(r.body.error).toHaveProperty('message')
      expect(r.body.error).not.toHaveProperty('httpStatus')
      expect(r.body.error).not.toHaveProperty('status')
      expect(r.body.error).not.toHaveProperty('stack')
    }
  })

  it('When validation fails, then code is request/invalid and message is humana-readable', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/health?bad=1')
    // Assert
    expect(res.status).toBe(422)
    expect(res.body).toEqual({
      data: null,
      error: expect.objectContaining({
        code: 'request/invalid',
        message: expect.any(String),
      }),
    })
  })

  it('When openapi is fetched, then envelope is bypassed (raw JSON)', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/openapi.json')
    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('openapi', '3.1.0')
    expect(res.body).not.toHaveProperty('data')
    expect(res.body).not.toHaveProperty('error')
  })

  it('When notFound is triggered, then code is error/not-found without internal path', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .get('/v1/unknown-route-xyz')
      .set(ADMIN_HEADERS)
    // Assert
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('error/not-found')
    expect(res.body.error.message).toBe(getError('error/not-found').message)
    expect(res.body.data).toBeNull()
  })

  it('When list endpoint succeeds, then list object has Stripe-style shape with dynamic has_more', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app).get('/v1/tenants').set(ADMIN_HEADERS)
    // Assert
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      object: 'list',
      data: expect.any(Array),
      has_more: expect.any(Boolean),
      url: expect.any(String),
      total_count: expect.anything(),
    })
    expect(res.body.error).toBeNull()
  })

  it('When 500 is simulated via throwing, then client sees generic auth/internal-error without leak', async () => {
    // Arrange – force a handler to throw by mocking prisma to throw non-AppHttpError
    tenantFindMany.mockRejectedValueOnce(new Error('secret db failure XYZ'))
    const app = createApp()
    // Act
    const res = await request(app).get('/v1/tenants').set(ADMIN_HEADERS)
    // Assert
    expect(res.status).toBe(500)
    expect(res.body).toEqual({
      data: null,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    })
    expect(res.body.error.message).not.toMatch(/secret db failure/i)
    expect(res.body.error).not.toHaveProperty('stack')
  })

  it('When service returns 422, then envelope does not include data and error has code', async () => {
    // Arrange
    const app = createApp()
    // Act
    const res = await request(app)
      .post('/v1/tenants/ten_1/warehouses')
      .set(ADMIN_HEADERS)
      .send({
        address: {
          name: 'x',
          line1: 'x',
          city: 'Kingston',
          country_code: 'JM',
        },
      }) // missing name
    // Assert
    expect(res.status).toBe(422)
    expect(res.body.data).toBeNull()
    expect(res.body.error.code).toBe('request/invalid')
    expect(res.body.error).not.toHaveProperty('httpStatus')
  })
})
