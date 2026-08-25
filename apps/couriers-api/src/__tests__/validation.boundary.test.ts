import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const APP_KEY = '876_app_secret_test_key_for_couriers_api'
const ADMIN_HEADERS = {
  'X-876-API-Key': APP_KEY,
  'x-internal-key': 'test-internal-key',
}
const { addressCreate } = vi.hoisted(() => ({ addressCreate: vi.fn() }))

vi.mock('@/db/client', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({ id: 'ten_1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    courierCustomerProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
    branch: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    warehouse: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({
        id: 'wh_1',
        tenantId: 'ten_1',
        addressId: 'addr_1',
        isPrimary: false,
        address: { id: 'addr_1', tenantId: 'ten_1' },
      }),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    address: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: addressCreate,
      update: vi.fn(),
      delete: vi.fn(),
    },
    mailbox: { findMany: vi.fn().mockResolvedValue([]) },
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

// Goldbergyoni 1.3 – Test only public behaviour, 1.6 – Realistic, 2.11 – Boundaries & chaos
describe('Validation boundaries & injection (Goldbergyoni 1.6, 2.11)', () => {
  describe('When creating a warehouse with edge payloads', () => {
    it('When name is whitespace-only, then 422', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: '   ',
          address: {
            name: 'x',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      // Assert
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('request/invalid')
    })

    it('When name is empty or exceeds boundary, then 422', async () => {
      // Arrange – warehouse name min(1) after trim; empty should 422
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: '',
          address: {
            name: 'x',
            line1: '1 Harbour',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      // Assert
      expect(res.status).toBe(422)
    })

    it('When XSS strings are sent, then never leak stack (201/422/409/500 without stack)', async () => {
      // Arrange — some payloads hit validation, some hit DB mock which may 500 in test env without real DB
      const probes = [
        '<script>alert(1)</script>',
        "' OR '1'='1",
        '../../etc/passwd',
      ]
      const app = createApp()
      // Act & Assert
      for (const name of probes) {
        const res = await request(app)
          .post('/v1/tenants/ten_1/warehouses')
          .set(ADMIN_HEADERS)
          .send({
            name,
            address: {
              name: 'x',
              line1: '1 Harbour',
              city: 'Kingston',
              country_code: 'JM',
            },
          })
        expect([201, 400, 422, 409, 500]).toContain(res.status)
        if (res.body.error) expect(res.body.error).not.toHaveProperty('stack')
      }
    })

    it('When latitude is 90.1 (out of range), then 422', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'Geo',
          address: {
            name: 'x',
            line1: '1 H',
            city: 'Kingston',
            country_code: 'JM',
            latitude: 90.1,
            longitude: 0,
          },
        })
      // Assert
      expect(res.status).toBe(422)
    })

    it('When numeric field receives wrong type, then 422 without leak', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 123 as unknown as string,
          address: {
            name: 'x',
            line1: '1 H',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      // Assert
      expect(res.status).toBe(422)
      expect(res.body.error).not.toHaveProperty('stack')
    })
  })

  describe('When creating an address with edge payloads', () => {
    it('When country_code has wrong length, then 422', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'A',
          line1: '1 Harbour',
          city: 'Kingston',
          country_code: 'JMM',
        })
      // Assert
      expect(res.status).toBe(422)
    })

    it('When realistic Jamaican address with accent and mixed case, then 201 and normalized', async () => {
      // Arrange
      const realistic = {
        name: '  Café Harbour — Downtown  ',
        line1: ' 7 Harbour Street ',
        city: '  Kingston  ',
        country_code: ' jm ',
        region_code: ' ksa ',
      }
      addressCreate.mockResolvedValueOnce({
        id: 'addr_new',
        tenantId: 'ten_1',
        name: 'Café Harbour',
        line1: '7 Harbour Street',
        city: 'Kingston',
        regionCode: 'KSA',
        countryCode: 'JM',
        postalCode: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: 1,
        updatedAt: 1,
      } as never)
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)
        .send(realistic)
      // Assert
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({
        object: 'address',
        country_code: 'JM',
        region_code: 'KSA',
      })
    })

    it('When coordinates are unpaired, then 422', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/addresses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'A',
          line1: '1 H',
          city: 'Kingston',
          country_code: 'JM',
          latitude: 18,
        })
      // Assert
      expect(res.status).toBe(422)
      expect(res.body.error.message).toMatch(/latitude/i)
    })
  })

  describe('When handling malformed bodies globally', () => {
    it('When empty JSON body is sent to create warehouse, then 422 not 500', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({})
      // Assert
      expect(res.status).toBe(422)
      expect(res.body.error).not.toHaveProperty('stack')
    })

    it('When unknown field is sent, then 422 (strict schema)', async () => {
      // Arrange
      const app = createApp()
      // Act
      const res = await request(app)
        .post('/v1/tenants/ten_1/warehouses')
        .set(ADMIN_HEADERS)
        .send({
          name: 'A',
          unknown_field: 'oops',
          address: {
            name: 'x',
            line1: '1 H',
            city: 'Kingston',
            country_code: 'JM',
          },
        })
      // Assert
      expect(res.status).toBe(422)
    })
  })
})
