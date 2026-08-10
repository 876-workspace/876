import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}

function customerRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cprof_123',
    tenantId: 'ten_1',
    userId: 'user_123',
    billingCustomerId: 'cus_1',
    branchId: 'br_1',
    status: 'ACTIVE' as const,
    isCommercial: false,
    firstSeenAt: 1785000000 - 100,
    createdAt: 1785000000 - 100,
    updatedAt: 1785000000,
    deletedAt: null,
    ...overrides,
  }
}

function packageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pkg_1',
    tenantId: 'ten_1',
    customerId: 'cprof_123',
    branchId: 'br_1',
    mailboxId: null,
    trackingNum: 'TRK001',
    status: 'READY_FOR_PICKUP' as const,
    packageType: 'CARTON' as const,
    description: 'Books',
    quantity: 1,
    actualWeight: 2.5,
    collectedAt: null,
    createdAt: 1785000000 - 10,
    updatedAt: 1785000000,
    ...overrides,
  }
}

const { courierCustomerProfile, tenant, pkg, apiKey } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  courierCustomerProfile: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  pkg: { findMany: vi.fn(), findFirst: vi.fn() },
  apiKey: { findUnique: vi.fn(), update: vi.fn() },
}))

// Need to mock the underlying repos used by portal.service (via customers & packages modules)
// Easiest is to mock the high-level prisma that those repos use.
vi.mock('@/db/client', () => ({
  prisma: {
    tenant,
    courierCustomerProfile,
    package: pkg,
    apiKey,
    branch: { findFirst: vi.fn() },
    warehouse: { findMany: vi.fn() },
    mailbox: { findMany: vi.fn() },
    address: { findMany: vi.fn() },
  },
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))

vi.mock('@/platform/jwt', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>
  return { ...mod, verifyProviderJwt: vi.fn() }
})

const { createApp } = await import('@/app')
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

function bearerHeaders(token = 'Bearer valid.token') {
  return { 'X-876-API-Key': APP_KEY, Authorization: token }
}

beforeEach(async () => {
  vi.clearAllMocks()
  resetSettingsForTest(testEnv)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(1785000000 * 1000))
  const { verifyProviderJwt } = await import('@/platform/jwt')
  ;(verifyProviderJwt as ReturnType<typeof vi.fn>).mockResolvedValue({
    sub: 'user_123',
    token_use: 'access',
    realm: 'consumer',
    aud: 'app_couriers',
  } as never)
  courierCustomerProfile.findFirst.mockResolvedValue(customerRow() as never)
  pkg.findMany.mockResolvedValue([packageRow()] as never)
  pkg.findFirst.mockResolvedValue(packageRow() as never)
  tenant.findUnique.mockResolvedValue({ id: 'ten_1' } as never)
})

afterEach(() => {
  vi.useRealTimers()
  resetSettingsForTest(testEnv)
})

describe('Portal HTTP — black-box via API (Goldbergyoni 1.1, 1.2, 2.3, 2.10)', () => {
  describe('When retrieving the signed-in customer profile', () => {
    it('When valid session presents, then returns customer profile with envelope', async () => {
      // Arrange
      courierCustomerProfile.findFirst.mockResolvedValueOnce(
        customerRow() as never
      )
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        data: expect.objectContaining({
          object: 'courier_customer_profile',
          id: 'cprof_123',
        }),
        error: null,
      })
      expect(res.body.data.tenant_id).toBe('ten_1')
      expect(res.headers['x-request-id']).toBeDefined()
    })

    it('When user has no profile, then 404 customer/not-found without stack', async () => {
      // Arrange
      courierCustomerProfile.findFirst.mockResolvedValueOnce(null as never)
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(404)
      expect(res.body).toEqual({
        data: null,
        error: expect.objectContaining({ code: 'customer/not-found' }),
      })
      expect(res.body.error).not.toHaveProperty('stack')
    })

    it('When no bearer token is sent, then 401 auth/no-session without checking DB', async () => {
      // Arrange
      courierCustomerProfile.findFirst.mockClear()
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set({ 'X-876-API-Key': APP_KEY })
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('auth/no-session')
      expect(courierCustomerProfile.findFirst).not.toHaveBeenCalled()
    })

    it('When invalid JWT is presented, then 401 without stack leak', async () => {
      // Arrange
      const { verifyProviderJwt } = await import('@/platform/jwt')
      ;(verifyProviderJwt as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        null
      )
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set(bearerHeaders('Bearer invalid'))
      // Assert
      expect(res.status).toBe(401)
      expect(res.body.error).not.toHaveProperty('stack')
      expect(res.body.error.code).toMatch(/auth\//)
    })
  })

  describe('When listing packages for the signed-in customer', () => {
    it('When session lists packages, then tenant & customer filter is applied and list envelope returned', async () => {
      // Arrange
      const rows = [
        packageRow(),
        packageRow({ id: 'pkg_2', status: 'RECEIVED' }),
      ]
      pkg.findMany.mockResolvedValueOnce(rows as never)
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        data: { object: 'list', data: expect.any(Array) },
        error: null,
      })
      expect(res.body.data.data).toHaveLength(2)
      expect(pkg.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'ten_1',
            customerId: 'cprof_123',
          }),
        })
      )
    })

    it('When status filter is valid, then it is forwarded to repository', async () => {
      // Arrange
      pkg.findMany.mockResolvedValueOnce([packageRow()] as never)
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages?status=READY_FOR_PICKUP')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(200)
      expect(pkg.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'READY_FOR_PICKUP' }),
        })
      )
    })

    it('When status filter is invalid, then 422 without calling DB', async () => {
      // Arrange
      pkg.findMany.mockClear()
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages?status=BAD_STATUS')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('request/invalid')
      expect(pkg.findMany).not.toHaveBeenCalled()
    })

    it('When both cursors are sent, then 422', async () => {
      // Arrange
      // Act
      const res = await request(createApp())
        .get(
          '/v1/portal/tenants/ten_1/packages?starting_after=a&ending_before=b'
        )
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(422)
    })

    it('When user has no profile, then packages list returns 404 and does not query packages', async () => {
      // Arrange
      courierCustomerProfile.findFirst.mockResolvedValueOnce(null as never)
      pkg.findMany.mockClear()
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(404)
      expect(pkg.findMany).not.toHaveBeenCalled()
    })

    it('When limit is out of bounds, then 422', async () => {
      // Arrange
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages?limit=200')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(422)
    })
  })

  describe('When retrieving a single package', () => {
    it('When valid id is requested, then package is returned with envelope', async () => {
      // Arrange
      pkg.findFirst.mockResolvedValueOnce(
        packageRow({ id: 'pkg_123' }) as never
      )
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages/pkg_123')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        data: expect.objectContaining({ object: 'package', id: 'pkg_123' }),
        error: null,
      })
    })

    it('When package does not belong to customer, then 404 package/not-found', async () => {
      // Arrange
      pkg.findFirst.mockResolvedValueOnce(null as never)
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages/pkg_missing')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('package/not-found')
      expect(res.body.error).not.toHaveProperty('stack')
    })

    it('When no session, then 401 before package lookup', async () => {
      // Arrange
      pkg.findFirst.mockClear()
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/packages/pkg_123')
        .set({ 'X-876-API-Key': APP_KEY })
      // Assert
      expect(res.status).toBe(401)
      expect(pkg.findFirst).not.toHaveBeenCalled()
    })

    it('When x-request-id is sent, then echoed on portal routes', async () => {
      // Arrange
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set({ ...bearerHeaders(), 'x-request-id': 'portal-trace-1' })
      // Assert
      expect(res.headers['x-request-id']).toBe('portal-trace-1')
    })
  })

  describe('Edge & realistic data (1.6, 2.11)', () => {
    it('When realistic Jamaican customer with accented name, then profile still returned via relation', async () => {
      // Arrange – realistic data: Kingston address with accent
      courierCustomerProfile.findFirst.mockResolvedValueOnce(
        customerRow({ billingCustomerId: 'cus_josé_moore_1' }) as never
      )
      // Act
      const res = await request(createApp())
        .get('/v1/portal/tenants/ten_1/customer')
        .set(bearerHeaders())
      // Assert
      expect(res.status).toBe(200)
      expect(res.body.data.billing_customer_id).toBe('cus_josé_moore_1')
      expect(res.body.data).toMatchObject({
        object: 'courier_customer_profile',
        id: 'cprof_123',
      })
    })

    it('When concurrent portal requests arrive, then each is isolated (2.7)', async () => {
      // Arrange
      courierCustomerProfile.findFirst.mockResolvedValue(customerRow() as never)
      pkg.findMany.mockResolvedValue([packageRow()] as never)
      // Act – two parallel sessions
      const [a, b] = await Promise.all([
        request(createApp())
          .get('/v1/portal/tenants/ten_1/customer')
          .set(bearerHeaders()),
        request(createApp())
          .get('/v1/portal/tenants/ten_1/packages')
          .set(bearerHeaders()),
      ])
      // Assert
      expect(a.status).toBe(200)
      expect(b.status).toBe(200)
      expect(a.body.data.object).toBe('courier_customer_profile')
      expect(b.body.data.object).toBe('list')
    })
  })
})
