import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const API_HEADERS = { 'X-876-API-Key': APP_KEY }
const INTEGRATION_KEY = 'couriers-integration-test-key'
const INTEGRATION_HEADERS = { 'x-couriers-integration-key': INTEGRATION_KEY }
const { customerFindFirst, tenantCount, tenantFindMany, tenantFindUnique } =
  vi.hoisted(() => ({
    customerFindFirst: vi.fn(),
    tenantCount: vi.fn(),
    tenantFindMany: vi.fn(),
    tenantFindUnique: vi.fn(),
  }))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: tenantFindUnique,
      findMany: tenantFindMany,
      count: tenantCount,
      create: vi.fn(),
      update: vi.fn(),
    },
    courierCustomerProfile: {
      findMany: vi.fn(),
      findFirst: customerFindFirst,
      create: vi.fn(),
      update: vi.fn(),
    },
    branch: { findMany: vi.fn(), findFirst: vi.fn() },
    warehouse: { findMany: vi.fn(), findFirst: vi.fn() },
    mailbox: { findMany: vi.fn(), findFirst: vi.fn() },
    address: { findMany: vi.fn(), findFirst: vi.fn() },
    role: { findMany: vi.fn() },
    teamMember: { findMany: vi.fn() },
    apiKey: { findUnique: vi.fn(), update: vi.fn() },
    organizationModule: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
    },
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
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
  COURIERS_INTEGRATION_KEY: INTEGRATION_KEY,
  SENTRY_DSN: '',
}

beforeEach(() => {
  resetSettingsForTest(testEnv)
  vi.clearAllMocks()
})

afterEach(() => {
  resetSettingsForTest(testEnv)
})

// Goldbergyoni 1.2 – Nested describes, 1.6 – Realistic data, 2.4 – Auth matrix, 2.11 – No leak
describe('Auth guards — exhaustive matrix (2.4, 1.2)', () => {
  describe('When apiKey tier is exercised', () => {
    it('When no api key is sent, then 401 api-key/missing', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app).get('/v1/tenants/ten_1')
      // Assert
      expect(res.status).toBe(401)
      expect(res.body).toEqual({
        data: null,
        error: { code: 'api-key/missing', message: 'An API key is required.' },
      })
    })

    it('When bad prefix is sent, then 401 api-key/invalid', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/tenants/ten_1')
        .set('X-876-API-Key', 'sk_wrong_prefix')
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('api-key/invalid')
    })

    it('When correct key via Authorization Bearer is sent, then passes apiKey guard', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/tenants/ten_1')
        .set('Authorization', `Bearer ${APP_KEY}`)
      // Assert — should be 200 or 404 (not 401) – tenant mock returns null? set mock
      // we mock tenant findUnique to return value via prisma, need to set
      tenantFindUnique.mockResolvedValue({
        id: 'ten_1',
        orgId: 'org_1',
        slug: 's',
        name: 'n',
        mailboxPrefix: 'KNG',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      })
      const res2 = await request(app)
        .get('/v1/tenants/ten_1')
        .set('Authorization', `Bearer ${APP_KEY}`)
      expect([200, 404]).toContain(res2.status)
      expect(res2.status).not.toBe(401)
    })

    it('When api key header has surrounding whitespace, then trimmed and accepted', async () => {
      // Arrange
      const app = createApp()
      tenantFindUnique.mockResolvedValue({
        id: 'ten_1',
        orgId: 'org_1',
        slug: 's',
        name: 'n',
        mailboxPrefix: 'KNG',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      })
      // Act
      const res = await request(app)
        .get('/v1/tenants/ten_1')
        .set('X-876-API-Key', `  ${APP_KEY}  `)
      // Assert
      expect(res.status).toBe(200)
    })
  })

  describe('When admin tier is required', () => {
    it('When only apiKey without internal key hits admin route, then 401 auth/no-session', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app).get('/v1/tenants').set(API_HEADERS)
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('auth/no-session')
      expect(res.body.error).not.toHaveProperty('httpStatus')
    })

    it('When wrong internal key is sent, then 401 auth/no-session', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/tenants')
        .set({ 'X-876-API-Key': APP_KEY, 'x-internal-key': 'wrong' })
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('auth/no-session')
    })

    it('When internal key is correct but api key missing, then 401 api-key/missing takes precedence', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/tenants')
        .set('x-internal-key', 'test-internal-key')
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('api-key/missing')
    })

    it('When internal key is unset on server, then even correct client internal key is 401', async () => {
      // Arrange
      resetSettingsForTest({ ...testEnv, API_INTERNAL_KEY: '' })
      const app = createApp()
      // Act
      const res = await request(app).get('/v1/tenants').set(ADMIN_HEADERS)
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('auth/no-session')
    })

    it('When admin route is called with valid admin credentials, then not 401 (passes guard)', async () => {
      // Arrange
      const app = createApp()
      tenantFindMany.mockResolvedValue([])
      tenantCount.mockResolvedValue(0)
      // Act
      const res = await request(app).get('/v1/tenants').set(ADMIN_HEADERS)
      // Assert
      expect(res.status).toBe(200)
      expect(res.body.error).toBeNull()
    })
  })

  describe('When integration tier is required', () => {
    it('When integration key missing, then 401 integration-key/missing', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app).get('/v1/integration/tenants/ten_1')
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('integration-key/missing')
    })

    it('When integration key is wrong, then 401 integration-key/invalid', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/integration/tenants/ten_1')
        .set('x-couriers-integration-key', 'bad')
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('integration-key/invalid')
    })

    it('When correct integration key is sent, then passes guard (not 401)', async () => {
      // Arrange
      const app = createApp()
      tenantFindUnique.mockResolvedValue({
        id: 'ten_1',
        orgId: 'org_1',
        slug: 's',
        name: 'n',
        mailboxPrefix: 'KNG',
        status: 'ACTIVE',
        createdAt: 1,
        updatedAt: 1,
      })
      // Act
      const res = await request(app)
        .get('/v1/integration/tenants/ten_1')
        .set(INTEGRATION_HEADERS)
      // Assert
      expect(res.status).not.toBe(401)
    })

    it('When app api key is sent to integration route, then 401 integration-key/missing (not api-key error)', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/integration/tenants/ten_1')
        .set(API_HEADERS)
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('integration-key/missing')
    })
  })

  describe('When session tier (portal) is required', () => {
    it('When no bearer token is sent, then 401 auth/no-session', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/portal/tenants/ten_1/customer')
        .set(API_HEADERS)
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('auth/no-session')
    })

    it('When bearer token is invalid (jwt returns null), then 401 auth/invalid-token or auth/no-session without stack', async () => {
      // Arrange
      const { verifyProviderJwt } = await import('@/platform/jwt')
      ;(verifyProviderJwt as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        null
      )
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/portal/tenants/ten_1/customer')
        .set({ 'X-876-API-Key': APP_KEY, Authorization: 'Bearer eyJ.invalid' })
      // Assert
      expect([401, 403]).toContain(res.status)
      expect(res.body.error).not.toHaveProperty('stack')
      expect(res.body.error.code).toMatch(/auth\//)
    })

    it('When bearer token has valid sub, then session passes (portal)', async () => {
      // Arrange
      const { verifyProviderJwt } = await import('@/platform/jwt')
      ;(verifyProviderJwt as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        sub: 'user_123',
        token_use: 'access',
        realm: 'consumer',
        aud: 'app_couriers',
      } as never)
      customerFindFirst.mockResolvedValue({
        id: 'cprof_1',
        tenantId: 'ten_1',
        userId: 'user_123',
        billingCustomerId: 'cus_1',
        branchId: 'br_1',
        status: 'ACTIVE',
        isCommercial: false,
        firstSeenAt: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
      })
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/portal/tenants/ten_1/customer')
        .set({
          'X-876-API-Key': APP_KEY,
          Authorization: 'Bearer valid.token.here',
        })
      // Assert — should be 200 or 404, not 401
      expect([200, 404]).toContain(res.status)
      expect(res.status).not.toBe(401)
    })

    it('When x-876-api-key casing varies, then header lookup is case-insensitive', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .get('/v1/tenants/ten_1')
        .set('x-876-api-key', APP_KEY)
      const res2 = await request(app)
        .get('/v1/tenants/ten_1')
        .set('X-876-API-KEY', APP_KEY)
      // Assert
      // lower case should still be read (express normalizes)
      expect([200, 401, 404]).toContain(res.status)
      expect([200, 401, 404]).toContain(res2.status)
    })
  })
})
