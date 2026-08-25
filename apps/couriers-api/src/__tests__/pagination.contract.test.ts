import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

// Mock all list sources
vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    courierCustomerProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    branch: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    warehouse: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    mailbox: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    address: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    role: { findMany: vi.fn().mockResolvedValue([]) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    organizationModule: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
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

// Goldbergyoni 1.6 – realistic data not magic strings, 2.10 – generic contract, 3.4 – pagination
describe('Pagination contract — shared across list endpoints (Goldbergyoni 2.10, 3.4)', () => {
  const listEndpoints = [
    { path: '/v1/tenants/ten_1/customers', name: 'customers' },
    { path: '/v1/tenants/ten_1/branches', name: 'branches' },
    { path: '/v1/tenants/ten_1/warehouses', name: 'warehouses' },
    { path: '/v1/tenants/ten_1/mailboxes', name: 'mailboxes' },
    { path: '/v1/tenants/ten_1/addresses', name: 'addresses' },
  ]

  it.each(listEndpoints)(
    'When $name list is fetched with default limit, then Stripe-style list envelope',
    async ({ path }) => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app).get(path).set(ADMIN_HEADERS)
      // Assert – black-box contract, no impl leak
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        data: {
          object: 'list',
          data: expect.any(Array),
          has_more: expect.any(Boolean),
          url: expect.any(String),
        },
        error: null,
      })
      expect(res.body.data.data).toBeInstanceOf(Array)
      expect(res.headers['x-request-id']).toBeDefined()
      expect(res.body.error).toBeNull()
    }
  )

  it.each(listEndpoints)(
    'When $name list is fetched with limit=1, then limit is honoured and has_more is boolean',
    async ({ path }) => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app).get(`${path}?limit=1`).set(ADMIN_HEADERS)
      // Assert
      expect(res.status).toBe(200)
      expect(typeof res.body.data.has_more).toBe('boolean')
      expect(res.body.data.data.length).toBeLessThanOrEqual(1)
    }
  )

  it.each(listEndpoints)(
    'When $name list is fetched with invalid limit, then handled without 500',
    async ({ path }) => {
      // Arrange – some endpoints strictly validate limit (customers), others ignore (warehouses)
      const app = createApp()
      // Act
      const res = await request(app)
        .get(`${path}?limit=9999`)
        .set(ADMIN_HEADERS)
      // Assert – never 500, no stack
      expect([200, 422]).toContain(res.status)
      if (res.status !== 200) {
        expect(res.body.error).toHaveProperty('code', 'request/invalid')
        expect(res.body.error).not.toHaveProperty('stack')
      } else {
        expect(res.body.data.object).toBe('list')
      }
    }
  )

  it.each(listEndpoints)(
    'When $name list is fetched with both cursors, then 422 or valid handling (no 500)',
    async ({ path }) => {
      // Arrange – some endpoints strictly validate both cursors, others treat as empty page
      const app = createApp()
      // Act
      const res = await request(app)
        .get(`${path}?starting_after=a&ending_before=b`)
        .set(ADMIN_HEADERS)
      // Assert – never 500, no stack leak
      expect([200, 422]).toContain(res.status)
      if (res.status !== 200) expect(res.body.error).not.toHaveProperty('stack')
      else expect(res.body.data.object).toBe('list')
    }
  )

  it.each(listEndpoints)(
    'When $name list receives empty cursor, then 422 not 500',
    async ({ path }) => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get(`${path}?starting_after=`)
        .set(ADMIN_HEADERS)
      // Assert
      expect([200, 422, 400]).toContain(res.status)
      if (res.status !== 200) expect(res.body.error).not.toHaveProperty('stack')
    }
  )

  it('When several list endpoints are fetched concurrently, then each envelope remains isolated (2.7)', async () => {
    // Arrange
    const app = createApp()
    // Act
    const results = await Promise.all(
      listEndpoints.map((e) => request(app).get(e.path).set(ADMIN_HEADERS))
    )
    // Assert
    for (const r of results) {
      expect(r.status).toBe(200)
      expect(r.body.error).toBeNull()
      expect(r.body.data.object).toBe('list')
    }
  })
})
